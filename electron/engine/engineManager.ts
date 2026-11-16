import { Chess } from 'chess.js';
import {
  AnalyzeRequest,
  BotMoveRequest,
  BotMoveResponse,
  EngineEvaluation,
  EngineLine,
} from '../../src/shared/types';
import { AnalysisCacheRepository } from '../db/repositories/analysisCacheRepo';
import { SettingsRepository } from '../db/repositories/settingsRepo';
import { CpuSelectionResult, resolveStockfishBinary } from './cpuDetect';
import { computeThinkingDelayMs, selectHumanizedMove } from './humanizer';
import { mapRatingToStrength } from './strength';
import { IUciTransport, NativeUciProcess, WasmUciProcess } from './uciProcess';

function pvUciToSan(fen: string, pvUci: string[]): string[] {
  const chess = new Chess(fen);
  const sanList: string[] = [];
  for (const uci of pvUci) {
    if (uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
    try {
      const move = chess.move({ from, to, promotion });
      if (!move) break;
      sanList.push(move.san);
    } catch {
      break;
    }
  }
  return sanList;
}

function parseInfoLine(line: string, fen: string): EngineLine | null {
  if (!line.startsWith('info ') || !line.includes(' pv ')) {
    return null;
  }
  const tokens = line.split(/\s+/);
  let multipv = 1;
  let depth = 1;
  let seldepth = 1;
  let scoreCp: number | null = null;
  let mateIn: number | null = null;
  let nodes = 0;
  let nps = 0;
  let pvUci: string[] = [];

  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === 'multipv' && tokens[i + 1]) {
      multipv = Number(tokens[++i]);
    } else if (tok === 'depth' && tokens[i + 1]) {
      depth = Number(tokens[++i]);
    } else if (tok === 'seldepth' && tokens[i + 1]) {
      seldepth = Number(tokens[++i]);
    } else if (tok === 'nodes' && tokens[i + 1]) {
      nodes = Number(tokens[++i]);
    } else if (tok === 'nps' && tokens[i + 1]) {
      nps = Number(tokens[++i]);
    } else if (tok === 'score' && tokens[i + 1] && tokens[i + 2]) {
      const kind = tokens[++i];
      const val = Number(tokens[++i]);
      if (kind === 'cp') {
        scoreCp = val;
        mateIn = null;
      } else if (kind === 'mate') {
        mateIn = val;
        scoreCp = null;
      }
    } else if (tok === 'pv') {
      pvUci = tokens.slice(i + 1);
      break;
    }
  }

  if (pvUci.length === 0) return null;
  return {
    multipv,
    depth,
    seldepth,
    scoreCp,
    mateIn,
    nodes,
    nps,
    pvUci,
    pvSan: pvUciToSan(fen, pvUci),
  };
}

export class EngineManager {
  private transport: IUciTransport | null = null;
  private cpuInfo: CpuSelectionResult;
  private queue: Promise<unknown> = Promise.resolve();
  private activeSearchId = 0;
  private progressListeners = new Set<(evalUpdate: EngineEvaluation) => void>();

  constructor(
    private readonly enginesDir: string,
    private readonly settingsRepo: SettingsRepository,
    private readonly cacheRepo: AnalysisCacheRepository,
  ) {
    this.cpuInfo = resolveStockfishBinary(
      this.enginesDir,
      this.settingsRepo.getSettings().customEnginePath,
    );
  }

  public getDiagnostics(): {
    activeBinary: string;
    cpuFeatures: string[];
    isWasmFallback: boolean;
  } {
    return {
      activeBinary: this.transport?.name ?? this.cpuInfo.preferredBinary,
      cpuFeatures: this.cpuInfo.features,
      isWasmFallback: this.transport?.isWasm ?? this.cpuInfo.isWasmFallback,
    };
  }

  public onProgress(listener: (evalUpdate: EngineEvaluation) => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private async ensureTransport(): Promise<IUciTransport> {
    if (this.transport) return this.transport;

    this.cpuInfo = resolveStockfishBinary(
      this.enginesDir,
      this.settingsRepo.getSettings().customEnginePath,
    );

    if (this.cpuInfo.resolvedPath) {
      const native = new NativeUciProcess(this.cpuInfo.resolvedPath);
      try {
        await native.start();
        this.transport = native;
        return native;
      } catch {
        // Fallback cleanly to WASM if native binary cannot execute on host
      }
    }

    const wasm = new WasmUciProcess();
    await wasm.start();
    this.transport = wasm;
    return wasm;
  }

  public stopSearch(): void {
    this.activeSearchId++;
    if (this.transport) {
      try {
        this.transport.send('stop');
      } catch {
        // Ignore if idle
      }
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  public async analyze(req: AnalyzeRequest, skipCache = false): Promise<EngineEvaluation> {
    const settings = this.settingsRepo.getSettings();
    const versionTag = this.transport?.name ?? this.cpuInfo.preferredBinary;

    if (!skipCache && !req.infinite) {
      const cached = this.cacheRepo.getCachedAnalysis(req.fen, req.multipv, req.depth, versionTag);
      if (cached) {
        return cached;
      }
    }

    const searchId = ++this.activeSearchId;

    return this.enqueue(async () => {
      const engine = await this.ensureTransport();
      engine.send('stop');
      engine.send(`setoption name Threads value ${settings.engineThreads}`);
      engine.send(`setoption name Hash value ${settings.engineHashMb}`);
      engine.send(`setoption name MultiPV value ${req.multipv}`);
      engine.send('setoption name UCI_LimitStrength value false');
      engine.send('setoption name Skill Level value 20');
      engine.send('isready');
      await engine.waitFor((l) => l === 'readyok', 5000);

      const lineMap = new Map<number, EngineLine>();
      let bestMoveUci = '';
      let ponderUci: string | null = null;

      await new Promise<void>((resolve, reject) => {
        const timeoutMs = (req.movetimeMs ?? 15000) + 8000;
        const timer = setTimeout(() => {
          off();
          try {
            engine.send('stop');
          } catch {
            // Ignore
          }
          reject(new Error('Engine search timed out'));
        }, timeoutMs);

        const off = engine.onLine((raw) => {
          if (searchId !== this.activeSearchId && !raw.startsWith('bestmove')) {
            try {
              engine.send('stop');
            } catch {
              // Ignore
            }
          }

          const parsed = parseInfoLine(raw, req.fen);
          if (parsed) {
            lineMap.set(parsed.multipv, parsed);
            const sorted = Array.from(lineMap.values()).sort((a, b) => a.multipv - b.multipv);
            const top = sorted[0];
            if (top) {
              const snapshot: EngineEvaluation = {
                fen: req.fen,
                depth: top.depth,
                nodes: top.nodes,
                nps: top.nps,
                bestMoveUci: top.pvUci[0] ?? '',
                bestMoveSan: top.pvSan[0] ?? '',
                ponderUci: top.pvUci[1] ?? null,
                lines: sorted,
                engineName: 'Stockfish 17',
                engineVersion: engine.name,
              };
              for (const listener of this.progressListeners) {
                listener(snapshot);
              }
            }
          }

          if (raw.startsWith('bestmove ')) {
            const parts = raw.split(/\s+/);
            bestMoveUci = parts[1] ?? '';
            ponderUci = parts[3] ?? null;
            clearTimeout(timer);
            off();
            resolve();
          }
        });

        engine.send(`position fen ${req.fen}`);
        if (req.movetimeMs) {
          engine.send(`go movetime ${req.movetimeMs}`);
        } else {
          engine.send(`go depth ${req.depth}`);
        }
      });

      const sortedLines = Array.from(lineMap.values()).sort((a, b) => a.multipv - b.multipv);
      const topLine = sortedLines[0];
      const finalBestUci = bestMoveUci && bestMoveUci !== '(none)' ? bestMoveUci : (topLine?.pvUci[0] ?? '');
      const finalBestSan = pvUciToSan(req.fen, [finalBestUci])[0] ?? finalBestUci;

      const result: EngineEvaluation = {
        fen: req.fen,
        depth: topLine?.depth ?? req.depth,
        nodes: topLine?.nodes ?? 0,
        nps: topLine?.nps ?? 0,
        bestMoveUci: finalBestUci,
        bestMoveSan: finalBestSan,
        ponderUci,
        lines: sortedLines,
        engineName: 'Stockfish 17',
        engineVersion: engine.name,
      };

      if (result.bestMoveUci) {
        this.cacheRepo.putCachedAnalysis(result);
      }
      return result;
    });
  }

  public async selectBotMove(req: BotMoveRequest): Promise<BotMoveResponse> {
    const profile = mapRatingToStrength(req.rating);
    const settings = this.settingsRepo.getSettings();
    const delayMs = computeThinkingDelayMs(req.fen, req.thinkingDelayMode);

    return this.enqueue(async () => {
      const engine = await this.ensureTransport();
      engine.send('stop');
      engine.send(`setoption name Threads value ${settings.engineThreads}`);
      engine.send(`setoption name Hash value ${settings.engineHashMb}`);
      engine.send(`setoption name MultiPV value ${profile.multiPv}`);
      engine.send(`setoption name UCI_LimitStrength value ${profile.uciLimitStrength}`);
      if (profile.uciLimitStrength) {
        engine.send(`setoption name UCI_Elo value ${profile.uciElo}`);
      }
      engine.send(`setoption name Skill Level value ${profile.skillLevel}`);
      engine.send('isready');
      await engine.waitFor((l) => l === 'readyok', 5000);

      const lineMap = new Map<number, EngineLine>();
      let rawBestMove = '';

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          off();
          reject(new Error('Bot move search timed out'));
        }, 12000);

        const off = engine.onLine((raw) => {
          const parsed = parseInfoLine(raw, req.fen);
          if (parsed) {
            lineMap.set(parsed.multipv, parsed);
          }
          if (raw.startsWith('bestmove ')) {
            rawBestMove = raw.split(/\s+/)[1] ?? '';
            clearTimeout(timer);
            off();
            resolve();
          }
        });

        engine.send(`position fen ${req.fen}`);
        if (profile.depthCap !== null && profile.movetimeCapMs !== null) {
          engine.send(`go depth ${profile.depthCap} movetime ${profile.movetimeCapMs}`);
        } else if (profile.movetimeCapMs !== null) {
          engine.send(`go movetime ${profile.movetimeCapMs}`);
        } else {
          engine.send('go depth 18');
        }
      });

      const sortedLines = Array.from(lineMap.values()).sort((a, b) => a.multipv - b.multipv);
      let chosenUci = rawBestMove;
      let debugInfo = `UCI Elo ${profile.uciElo} / Skill ${profile.skillLevel}`;

      if (profile.useHumanizer && sortedLines.length > 0) {
        const humanized = selectHumanizedMove(req.fen, sortedLines, profile);
        chosenUci = humanized.selectedUci;
        debugInfo = `Humanizer(${profile.rating}): ${humanized.reason}`;
      }

      if (!chosenUci || chosenUci === '(none)') {
        const chess = new Chess(req.fen);
        const fallback = chess.moves({ verbose: true })[0];
        if (!fallback) throw new Error('Game already over');
        chosenUci = `${fallback.from}${fallback.to}${fallback.promotion ?? ''}`;
      }

      const moveSan = pvUciToSan(req.fen, [chosenUci])[0] ?? chosenUci;

      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }

      return {
        moveUci: chosenUci,
        moveSan,
        delayMs,
        usedHumanizer: profile.useHumanizer,
        debugInfo,
      };
    });
  }

  public async testEngine(): Promise<{ ok: boolean; binary: string; depthReached: number }> {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const res = await this.analyze({ fen: startFen, depth: 10, multipv: 1 }, true);
    return {
      ok: Boolean(res.bestMoveUci),
      binary: res.engineVersion,
      depthReached: res.depth,
    };
  }

  public async shutdown(): Promise<void> {
    if (this.transport) {
      await this.transport.stop();
      this.transport = null;
    }
  }
}
