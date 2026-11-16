import { create } from 'zustand';
import { Chess, Move, Square } from 'chess.js';
import {
  EngineEvaluation,
  ExplanationResult,
  MoveClassification,
  PieceColor,
  RecordedMove,
  SavedGameRecord,
} from '../shared/types';
import { computeGameAccuracy } from '../core/accuracy';
import { classifyPlayerMove } from '../core/classification';
import { isBookMoveUci, lookupOpeningByFen } from '../core/openingBook';
import { exportAnnotatedPgn } from '../core/pgn';
import { soundEngine } from '../core/soundEngine';
import { buildPositionFacts } from '../core/tactics';
import { winPctFromScore } from '../core/winProbability';
import { useAppStore } from './useAppStore';

export interface AnimatedMoveVisual {
  from: Square;
  to: Square;
  pieceColor: PieceColor;
  pieceType: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  id: number;
}

interface GameState {
  fen: string;
  initialFen: string;
  playerColor: PieceColor;
  botRating: number;
  levelTestMode: boolean;
  timeControl: string;
  whiteClockMs: number;
  blackClockMs: number;
  moves: RecordedMove[];
  viewPly: number;
  isBotThinking: boolean;
  gameOverReason: string | null;
  gameResult: string;
  takebacksUsed: number;
  latestPlayerBadge: { square: Square; classification: MoveClassification; ply: number } | null;
  lastMoveSquares: { from: Square; to: Square } | null;
  animatedVisual: AnimatedMoveVisual | null;

  // Spoiler-free hint control: strictly false until user clicks Hint!
  hintRevealed: boolean;
  currentEval: EngineEvaluation | null;
  previewMoveUci: string | null;

  // Click-to-Explain drawer state
  explainOpen: boolean;
  explainLoading: boolean;
  explainTargetSquare: Square | null;
  explainTargetPly: number | null;
  explainResult: ExplanationResult | null;

  // Actions
  startNewGame: (opts?: {
    color?: PieceColor | 'random';
    rating?: number;
    timeControl?: string;
    customFen?: string;
    levelTestMode?: boolean;
  }) => Promise<void>;
  makeUserMove: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => Promise<boolean>;
  triggerBotTurn: () => Promise<void>;
  revealHint: () => Promise<void>;
  takebackMove: () => void;
  resignGame: () => void;
  offerDraw: () => void;
  setViewPly: (ply: number) => void;
  setBotRating: (rating: number) => void;
  setPreviewMoveUci: (uci: string | null) => void;
  openExplainForSquare: (sq: Square) => Promise<void>;
  openExplainForMove: (ply: number) => Promise<void>;
  closeExplain: () => void;
  saveCurrentGame: (isAutosave?: boolean) => Promise<SavedGameRecord | null>;
  resumeSavedGame: (record: SavedGameRecord) => void;
  tickClock: (deltaMs: number) => void;
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function parseTimeControlMs(tc: string): number {
  if (tc === 'unlimited') return 0;
  const parts = tc.split('+');
  const mins = Number(parts[0] ?? '10');
  return Math.max(1, mins) * 60 * 1000;
}

function parseIncrementMs(tc: string): number {
  if (tc === 'unlimited') return 0;
  const parts = tc.split('+');
  const inc = Number(parts[1] ?? '0');
  return Math.max(0, inc) * 1000;
}

export const useGameStore = create<GameState>((set, get) => ({
  fen: START_FEN,
  initialFen: START_FEN,
  playerColor: 'w',
  botRating: 1200,
  levelTestMode: false,
  timeControl: '10+0',
  whiteClockMs: 600000,
  blackClockMs: 600000,
  moves: [],
  viewPly: 0,
  isBotThinking: false,
  gameOverReason: null,
  gameResult: '*',
  takebacksUsed: 0,
  latestPlayerBadge: null,
  lastMoveSquares: null,
  animatedVisual: null,
  hintRevealed: false,
  currentEval: null,
  previewMoveUci: null,
  explainOpen: false,
  explainLoading: false,
  explainTargetSquare: null,
  explainTargetPly: null,
  explainResult: null,

  startNewGame: async (opts) => {
    const settings = useAppStore.getState().settings;
    const resolvedColor: PieceColor =
      opts?.color === 'random'
        ? Math.random() < 0.5
          ? 'w'
          : 'b'
        : (opts?.color ?? 'w');
    const rating = opts?.rating ?? get().botRating ?? settings.defaultRating;
    const tc = opts?.timeControl ?? get().timeControl ?? settings.defaultTimeControl;
    const startFen = opts?.customFen?.trim() || START_FEN;
    const baseMs = parseTimeControlMs(tc);

    set({
      fen: startFen,
      initialFen: startFen,
      playerColor: resolvedColor,
      botRating: rating,
      levelTestMode: opts?.levelTestMode ?? get().levelTestMode,
      timeControl: tc,
      whiteClockMs: baseMs,
      blackClockMs: baseMs,
      moves: [],
      viewPly: 0,
      isBotThinking: false,
      gameOverReason: null,
      gameResult: '*',
      takebacksUsed: 0,
      latestPlayerBadge: null,
      lastMoveSquares: null,
      animatedVisual: null,
      hintRevealed: false,
      currentEval: null,
      previewMoveUci: null,
      explainOpen: false,
      explainResult: null,
    });

    // Silently pre-evaluate initial position in background (hidden from board until Hint is clicked)
    if (window.offlineChess) {
      window.offlineChess
        .analyzePosition({ fen: startFen, depth: settings.moveQualityMinDepth, multipv: 3 })
        .then((ev) => set({ currentEval: ev }))
        .catch(() => undefined);
    }

    const chess = new Chess(startFen);
    if (chess.turn() !== resolvedColor && !chess.isGameOver()) {
      await get().triggerBotTurn();
    }
  },

  makeUserMove: async (from, to, promotion) => {
    const state = get();
    if (state.isBotThinking || state.gameOverReason) return false;
    if (state.viewPly !== state.moves.length) {
      // Snap back to latest ply before making move
      set({ viewPly: state.moves.length });
    }

    const chess = new Chess(state.fen);
    if (chess.turn() !== state.playerColor) return false;

    const fenBefore = state.fen;
    const preEval = state.currentEval;
    const settings = useAppStore.getState().settings;

    let moveObj: Move | null = null;
    try {
      moveObj = chess.move({
        from,
        to,
        promotion: promotion ?? (settings.autoQueen ? 'q' : undefined),
      });
    } catch {
      return false;
    }
    if (!moveObj) return false;

    const uci = `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ''}`;
    const fenAfter = chess.fen();
    const ply = state.moves.length + 1;
    const inBook = isBookMoveUci(fenBefore, uci);

    // Play appropriate sound
    if (chess.isCheckmate() || chess.isDraw()) {
      soundEngine.playMoveSound('gameover', settings.soundPack, settings.soundVolume, settings.soundEnabled);
    } else if (chess.inCheck()) {
      soundEngine.playMoveSound('check', settings.soundPack, settings.soundVolume, settings.soundEnabled);
    } else if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
      soundEngine.playMoveSound('castle', settings.soundPack, settings.soundVolume, settings.soundEnabled);
    } else if (moveObj.captured) {
      soundEngine.playMoveSound('capture', settings.soundPack, settings.soundVolume, settings.soundEnabled);
    } else {
      soundEngine.playMoveSound('move', settings.soundPack, settings.soundVolume, settings.soundEnabled);
    }

    // Increment clock
    const incMs = parseIncrementMs(state.timeControl);
    const nextWhiteClock = state.playerColor === 'w' ? state.whiteClockMs + incMs : state.whiteClockMs;
    const nextBlackClock = state.playerColor === 'b' ? state.blackClockMs + incMs : state.blackClockMs;

    const tentativeMove: RecordedMove = {
      ply,
      san: moveObj.san,
      uci,
      fenAfter,
      evalCp: null,
      mate: null,
      winProb: 50,
      bestMove: preEval?.bestMoveSan ?? null,
      classification: inBook ? 'book' : null,
      timeMs: 0,
    };

    const nextMoves = [...state.moves, tentativeMove];

    // IMPORTANT: Keep hintRevealed = false after every move so arrows never spoil the game!
    set({
      fen: fenAfter,
      moves: nextMoves,
      viewPly: ply,
      whiteClockMs: nextWhiteClock,
      blackClockMs: nextBlackClock,
      lastMoveSquares: { from, to },
      animatedVisual: {
        from,
        to,
        pieceColor: moveObj.color,
        pieceType: moveObj.piece,
        id: Date.now(),
      },
      hintRevealed: false,
      previewMoveUci: null,
      latestPlayerBadge:
        inBook && settings.moveQualityEnabled && settings.enabledBadgeCategories.book
          ? { square: to, classification: 'book', ply }
          : null,
    });

    // Check game termination
    if (chess.isGameOver()) {
      const outcome = evaluateGameOver(chess, state.playerColor, state.botRating, state.levelTestMode);
      set({
        gameOverReason: outcome.reason,
        gameResult: outcome.result,
        botRating: outcome.nextRating,
      });
      await get().saveCurrentGame(false);
      return true;
    }

    // Evaluate player's move quality in real time (MY MOVES ONLY)
    if (window.offlineChess && settings.moveQualityEnabled) {
      void (async () => {
        try {
          const baseEval =
            preEval && preEval.fen === fenBefore
              ? preEval
              : await window.offlineChess.analyzePosition({
                  fen: fenBefore,
                  depth: settings.moveQualityMinDepth,
                  movetimeMs: settings.moveQualityMaxWaitMs,
                  multipv: 2,
                });

          const afterEval = await window.offlineChess.analyzePosition({
            fen: fenAfter,
            depth: settings.moveQualityMinDepth,
            movetimeMs: settings.moveQualityMaxWaitMs,
            multipv: 2,
          });

          const topLine = baseEval.lines[0];
          const secondLine = baseEval.lines[1];
          const afterTop = afterEval.lines[0];

          const clsOut = classifyPlayerMove({
            fenBefore,
            fenAfter,
            playedUci: uci,
            playedSan: moveObj.san,
            moverColor: state.playerColor,
            isBookMove: inBook,
            bestMoveUci: baseEval.bestMoveUci,
            bestScoreCp: topLine?.scoreCp ?? null,
            bestMateIn: topLine?.mateIn ?? null,
            secondBestScoreCp: secondLine?.scoreCp ?? null,
            secondBestMateIn: secondLine?.mateIn ?? null,
            afterMoveScoreCp: afterTop?.scoreCp ?? null,
            afterMoveMateIn: afterTop?.mateIn ?? null,
            pvAfterMoveUci: afterTop?.pvUci ?? [],
            thresholds: settings.classificationThresholds,
          });

          const whiteWinProb = winPctFromScore(
            afterTop?.scoreCp ?? null,
            afterTop?.mateIn ?? null,
            'w',
            chess.turn(),
          );

          const updatedMoves = get().moves.map((m) =>
            m.ply === ply
              ? {
                  ...m,
                  evalCp: afterTop?.scoreCp ?? null,
                  mate: afterTop?.mateIn ?? null,
                  winProb: whiteWinProb,
                  bestMove: baseEval.bestMoveSan,
                  classification: clsOut.classification,
                }
              : m,
          );

          const showBadge = settings.enabledBadgeCategories[clsOut.classification];
          if (showBadge && settings.badgeSoundEnabled) {
            soundEngine.playClassificationSound(
              clsOut.classification,
              settings.soundVolume,
              settings.soundEnabled,
            );
          }

          set({
            moves: updatedMoves,
            currentEval: afterEval,
            latestPlayerBadge: showBadge
              ? { square: to, classification: clsOut.classification, ply }
              : get().latestPlayerBadge,
          });
        } catch {
          // Non-fatal if engine busy
        }
      })();
    }

    // Autosave game state locally
    void get().saveCurrentGame(true);

    // Trigger computer response
    await get().triggerBotTurn();
    return true;
  },

  triggerBotTurn: async () => {
    const state = get();
    const chess = new Chess(state.fen);
    if (chess.isGameOver() || chess.turn() === state.playerColor) return;

    set({ isBotThinking: true });
    const settings = useAppStore.getState().settings;

    try {
      let chosenUci = '';
      if (window.offlineChess) {
        const res = await window.offlineChess.getBotMove({
          fen: state.fen,
          rating: state.botRating,
          thinkingDelayMode: settings.thinkingDelayMode,
        });
        chosenUci = res.moveUci;
      } else {
        const fallbackMoves = chess.moves({ verbose: true });
        const pick = fallbackMoves[Math.floor(Math.random() * fallbackMoves.length)]!;
        chosenUci = `${pick.from}${pick.to}${pick.promotion ?? ''}`;
      }

      // Guard in case user started a new game while bot was thinking
      if (get().fen !== state.fen) {
        set({ isBotThinking: false });
        return;
      }

      const from = chosenUci.slice(0, 2) as Square;
      const to = chosenUci.slice(2, 4) as Square;
      const promotion = chosenUci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
      const moveObj = chess.move({ from, to, promotion });
      if (!moveObj) {
        set({ isBotThinking: false });
        return;
      }

      if (chess.isCheckmate() || chess.isDraw()) {
        soundEngine.playMoveSound('gameover', settings.soundPack, settings.soundVolume, settings.soundEnabled);
      } else if (chess.inCheck()) {
        soundEngine.playMoveSound('check', settings.soundPack, settings.soundVolume, settings.soundEnabled);
      } else if (moveObj.captured) {
        soundEngine.playMoveSound('capture', settings.soundPack, settings.soundVolume, settings.soundEnabled);
      } else {
        soundEngine.playMoveSound('move', settings.soundPack, settings.soundVolume, settings.soundEnabled);
      }

      const fenAfter = chess.fen();
      const ply = get().moves.length + 1;
      const botColor: PieceColor = state.playerColor === 'w' ? 'b' : 'w';
      const incMs = parseIncrementMs(state.timeControl);

      // NEVER assign move quality badges to computer's moves (classification = null)
      const recorded: RecordedMove = {
        ply,
        san: moveObj.san,
        uci: chosenUci,
        fenAfter,
        evalCp: null,
        mate: null,
        winProb: 50,
        bestMove: null,
        classification: null,
        timeMs: 0,
      };

      const nextMoves = [...get().moves, recorded];

      set({
        fen: fenAfter,
        moves: nextMoves,
        viewPly: ply,
        isBotThinking: false,
        whiteClockMs: botColor === 'w' ? get().whiteClockMs + incMs : get().whiteClockMs,
        blackClockMs: botColor === 'b' ? get().blackClockMs + incMs : get().blackClockMs,
        lastMoveSquares: { from, to },
        animatedVisual: {
          from,
          to,
          pieceColor: moveObj.color,
          pieceType: moveObj.piece,
          id: Date.now(),
        },
        hintRevealed: false,
        previewMoveUci: null,
      });

      // Pre-compute evaluation for the player's new turn silently (still hidden until Hint!)
      if (window.offlineChess && !chess.isGameOver()) {
        window.offlineChess
          .analyzePosition({ fen: fenAfter, depth: settings.moveQualityMinDepth, multipv: 3 })
          .then((ev) => {
            if (get().fen === fenAfter) {
              set({ currentEval: ev });
            }
          })
          .catch(() => undefined);
      }

      if (chess.isGameOver()) {
        const outcome = evaluateGameOver(chess, state.playerColor, state.botRating, state.levelTestMode);
        set({
          gameOverReason: outcome.reason,
          gameResult: outcome.result,
          botRating: outcome.nextRating,
        });
        await get().saveCurrentGame(false);
      } else {
        void get().saveCurrentGame(true);
      }
    } catch {
      set({ isBotThinking: false });
    }
  },

  revealHint: async () => {
    const state = get();
    set({ hintRevealed: true });
    if (!window.offlineChess) return;

    const settings = useAppStore.getState().settings;
    const ev = await window.offlineChess.analyzePosition({
      fen: state.fen,
      depth: Math.max(16, settings.engineDefaultDepth),
      multipv: 3,
    });
    set({ currentEval: ev, hintRevealed: true });
  },

  takebackMove: () => {
    const state = get();
    const settings = useAppStore.getState().settings;
    if (state.isBotThinking || state.moves.length === 0) return;
    if (settings.takebackLimit > 0 && state.takebacksUsed >= settings.takebackLimit) {
      useAppStore.getState().showToast(`Takeback limit (${settings.takebackLimit}) reached`);
      return;
    }

    // Roll back to the player's last turn
    let targetLen = state.moves.length - 1;
    const chessCheck = new Chess(
      targetLen > 0 ? state.moves[targetLen - 1]!.fenAfter : state.initialFen,
    );
    if (chessCheck.turn() !== state.playerColor && targetLen > 0) {
      targetLen -= 1;
    }

    const trimmedMoves = state.moves.slice(0, targetLen);
    const restoredFen =
      trimmedMoves.length > 0 ? trimmedMoves[trimmedMoves.length - 1]!.fenAfter : state.initialFen;
    const lastMv = trimmedMoves[trimmedMoves.length - 1];

    set({
      fen: restoredFen,
      moves: trimmedMoves,
      viewPly: trimmedMoves.length,
      gameOverReason: null,
      gameResult: '*',
      takebacksUsed: state.takebacksUsed + 1,
      latestPlayerBadge: null,
      hintRevealed: false,
      previewMoveUci: null,
      lastMoveSquares: lastMv
        ? { from: lastMv.uci.slice(0, 2) as Square, to: lastMv.uci.slice(2, 4) as Square }
        : null,
    });
  },

  resignGame: () => {
    const state = get();
    if (state.gameOverReason) return;
    const result = state.playerColor === 'w' ? '0-1' : '1-0';
    const nextRating = state.levelTestMode ? Math.max(0, state.botRating - 75) : state.botRating;
    set({
      gameOverReason: 'You resigned the match.',
      gameResult: result,
      botRating: nextRating,
    });
    void get().saveCurrentGame(false);
  },

  offerDraw: () => {
    const state = get();
    if (state.gameOverReason) return;
    const ev = state.currentEval;
    const topCp = ev?.lines[0]?.scoreCp ?? 0;
    const turn = new Chess(state.fen).turn();
    const botCp = turn === state.playerColor ? -topCp : topCp;

    // Computer accepts draw if position is equal or bot is worse
    if (botCp <= 35 && state.moves.length >= 10) {
      set({
        gameOverReason: 'Draw agreed by mutual consent.',
        gameResult: '1/2-1/2',
      });
      void get().saveCurrentGame(false);
      useAppStore.getState().showToast('Computer accepted your draw offer.');
    } else {
      useAppStore.getState().showToast('Computer declined the draw offer.');
    }
  },

  setViewPly: (ply) => {
    const state = get();
    const clamped = Math.max(0, Math.min(state.moves.length, ply));
    const targetFen = clamped === 0 ? state.initialFen : state.moves[clamped - 1]!.fenAfter;
    const mv = clamped > 0 ? state.moves[clamped - 1]! : null;
    set({
      viewPly: clamped,
      fen: targetFen,
      previewMoveUci: null,
      lastMoveSquares: mv
        ? { from: mv.uci.slice(0, 2) as Square, to: mv.uci.slice(2, 4) as Square }
        : null,
    });
  },

  setBotRating: (rating) => set({ botRating: Math.max(0, Math.min(3500, Math.round(rating))) }),

  setPreviewMoveUci: (uci) => set({ previewMoveUci: uci }),

  openExplainForSquare: async (sq) => {
    const state = get();
    const settings = useAppStore.getState().settings;
    if (settings.explanationMode === 'off') {
      useAppStore.getState().showToast('Explanations are turned Off in Settings.');
      return;
    }

    set({
      explainOpen: true,
      explainLoading: true,
      explainTargetSquare: sq,
      explainTargetPly: null,
      hintRevealed: true,
    });

    try {
      const ev =
        window.offlineChess
          ? await window.offlineChess.analyzePosition({
              fen: state.fen,
              depth: Math.max(16, settings.engineDefaultDepth),
              multipv: 4,
            })
          : state.currentEval;

      const histFens = [state.initialFen, ...state.moves.slice(0, state.viewPly).map((m) => m.fenAfter)];
      const opening = lookupOpeningByFen(state.fen, histFens);

      const facts = buildPositionFacts({
        fen: state.fen,
        evaluation: ev,
        openingEco: opening.eco,
        openingName: opening.name,
        selectedSquare: sq,
      });

      if (window.offlineChess) {
        const res = await window.offlineChess.explainPosition({
          fen: state.fen,
          facts,
          level: settings.explanationLevel,
          mode: settings.explanationMode,
          selectedSquare: sq,
        });
        set({ explainResult: res, explainLoading: false, currentEval: ev ?? state.currentEval });
      } else {
        set({ explainLoading: false });
      }
    } catch {
      set({ explainLoading: false });
    }
  },

  openExplainForMove: async (ply) => {
    const state = get();
    const settings = useAppStore.getState().settings;
    const move = state.moves[ply - 1];
    if (!move) return;

    const fenBefore = ply === 1 ? state.initialFen : state.moves[ply - 2]!.fenAfter;
    set({
      viewPly: ply,
      fen: move.fenAfter,
      explainOpen: true,
      explainLoading: true,
      explainTargetSquare: null,
      explainTargetPly: ply,
      hintRevealed: true,
    });

    try {
      const evBefore = window.offlineChess
        ? await window.offlineChess.analyzePosition({ fen: fenBefore, depth: 16, multipv: 4 })
        : null;
      const evAfter = window.offlineChess
        ? await window.offlineChess.analyzePosition({ fen: move.fenAfter, depth: 16, multipv: 2 })
        : null;

      const histFens = [state.initialFen, ...state.moves.slice(0, ply).map((m) => m.fenAfter)];
      const opening = lookupOpeningByFen(move.fenAfter, histFens);

      const facts = buildPositionFacts({
        fen: move.fenAfter,
        evaluation: evAfter,
        openingEco: opening.eco,
        openingName: opening.name,
        playedMoveContext: {
          san: move.san,
          classification: move.classification ?? 'good',
          winProbLoss: 0,
          bestMoveSan: evBefore?.bestMoveSan ?? move.bestMove ?? move.san,
          opponentBestReplySan: evAfter?.bestMoveSan ?? null,
        },
      });

      if (window.offlineChess) {
        const res = await window.offlineChess.explainPosition({
          fen: move.fenAfter,
          facts,
          level: settings.explanationLevel,
          mode: settings.explanationMode,
          playedMoveSan: move.san,
        });
        set({ explainResult: res, explainLoading: false });
      } else {
        set({ explainLoading: false });
      }
    } catch {
      set({ explainLoading: false });
    }
  },

  closeExplain: () => set({ explainOpen: false, previewMoveUci: null }),

  saveCurrentGame: async (isAutosave = false) => {
    if (!window.offlineChess) return null;
    const state = get();
    const histFens = [state.initialFen, ...state.moves.map((m) => m.fenAfter)];
    const lastFen = histFens[histFens.length - 1] ?? state.initialFen;
    const opening = lookupOpeningByFen(lastFen, histFens);

    const myDrops: number[] = [];
    for (let i = 0; i < state.moves.length; i++) {
      const m = state.moves[i]!;
      const isMyTurn = (i % 2 === 0 && state.playerColor === 'w') || (i % 2 === 1 && state.playerColor === 'b');
      if (isMyTurn && m.bestMove && m.bestMove !== m.san && m.classification) {
        const penaltyMap: Record<MoveClassification, number> = {
          book: 0,
          brilliant: 0,
          great: 0,
          best: 0,
          excellent: 1.2,
          good: 3.5,
          inaccuracy: 8.0,
          mistake: 15.0,
          blunder: 28.0,
          miss: 20.0,
        };
        myDrops.push(penaltyMap[m.classification]);
      } else if (isMyTurn) {
        myDrops.push(0);
      }
    }
    const accuracyMe = state.moves.length > 0 ? computeGameAccuracy(myDrops) : null;
    const whiteName = state.playerColor === 'w' ? 'You' : `Stockfish (${state.botRating})`;
    const blackName = state.playerColor === 'b' ? 'You' : `Stockfish (${state.botRating})`;
    const dateStr = new Date().toISOString().slice(0, 10);

    const pgn = exportAnnotatedPgn({
      white: whiteName,
      black: blackName,
      result: state.gameResult,
      date: dateStr,
      timeControl: state.timeControl,
      openingEco: opening.eco,
      openingName: opening.name,
      initialFen: state.initialFen !== START_FEN ? state.initialFen : undefined,
      moves: state.moves,
      includeAnnotations: true,
    });

    const saved = await window.offlineChess.saveGame({
      pgn,
      white: whiteName,
      black: blackName,
      result: state.gameResult,
      date: dateStr,
      timeControl: state.timeControl,
      myColor: state.playerColor,
      opponentRating: state.botRating,
      openingEco: opening.eco,
      openingName: opening.name,
      accuracyMe,
      notes: '',
      favorite: false,
      isAutosave,
      moves: state.moves,
    });

    if (!isAutosave) {
      useAppStore.getState().showToast('Game saved locally to SQLite library');
    }
    return saved;
  },

  resumeSavedGame: (record) => {
    const moves = record.moves ?? [];
    const lastFen = moves.length > 0 ? moves[moves.length - 1]!.fenAfter : START_FEN;
    const lastMv = moves[moves.length - 1];
    set({
      fen: lastFen,
      initialFen: START_FEN,
      playerColor: record.myColor,
      botRating: record.opponentRating,
      timeControl: record.timeControl,
      moves,
      viewPly: moves.length,
      gameOverReason: record.result !== '*' ? `Game finished (${record.result})` : null,
      gameResult: record.result,
      hintRevealed: false,
      lastMoveSquares: lastMv
        ? { from: lastMv.uci.slice(0, 2) as Square, to: lastMv.uci.slice(2, 4) as Square }
        : null,
    });
  },

  tickClock: (deltaMs) => {
    const state = get();
    if (state.timeControl === 'unlimited' || state.gameOverReason || state.moves.length === 0) return;
    const turn = new Chess(state.fen).turn();
    if (turn === 'w') {
      const next = Math.max(0, state.whiteClockMs - deltaMs);
      if (next === 0) {
        set({ whiteClockMs: 0, gameOverReason: 'White flagged on time.', gameResult: '0-1' });
        void get().saveCurrentGame(false);
      } else {
        set({ whiteClockMs: next });
      }
    } else {
      const next = Math.max(0, state.blackClockMs - deltaMs);
      if (next === 0) {
        set({ blackClockMs: 0, gameOverReason: 'Black flagged on time.', gameResult: '1-0' });
        void get().saveCurrentGame(false);
      } else {
        set({ blackClockMs: next });
      }
    }
  },
}));

function evaluateGameOver(
  chess: Chess,
  playerColor: PieceColor,
  currentRating: number,
  levelTestMode: boolean,
): { reason: string; result: string; nextRating: number } {
  if (chess.isCheckmate()) {
    const loser = chess.turn();
    const playerWon = loser !== playerColor;
    const result = loser === 'w' ? '0-1' : '1-0';
    const nextRating = levelTestMode
      ? Math.max(0, Math.min(3500, currentRating + (playerWon ? 80 : -70)))
      : currentRating;
    return {
      reason: playerWon ? 'Checkmate! You won the game!' : 'Checkmate! Computer wins.',
      result,
      nextRating,
    };
  }
  if (chess.isStalemate()) {
    return { reason: 'Draw by stalemate.', result: '1/2-1/2', nextRating: currentRating };
  }
  if (chess.isThreefoldRepetition()) {
    return { reason: 'Draw by threefold repetition.', result: '1/2-1/2', nextRating: currentRating };
  }
  if (chess.isInsufficientMaterial()) {
    return { reason: 'Draw by insufficient material.', result: '1/2-1/2', nextRating: currentRating };
  }
  return { reason: 'Draw by 50-move rule.', result: '1/2-1/2', nextRating: currentRating };
}
