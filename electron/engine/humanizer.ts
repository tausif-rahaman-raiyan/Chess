import { Chess, Move } from 'chess.js';
import { EngineLine, ThinkingDelayMode } from '../../src/shared/types';
import { StrengthProfile } from './strength';

function moverWinProbability(line: EngineLine): number {
  if (line.mateIn !== null) {
    return line.mateIn > 0 ? 1.0 : 0.0;
  }
  const cp = line.scoreCp ?? 0;
  return 0.5 + 0.5 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function isQueenBlunderForNothing(fen: string, uciMove: string): boolean {
  const chess = new Chess(fen);
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove[4] as 'q' | 'r' | 'b' | 'n' | undefined;
  const movingPiece = chess.get(from as never);
  if (!movingPiece || movingPiece.type !== 'q') return false;

  const captured = chess.get(to as never);
  const moveResult = chess.move({ from, to, promotion });
  if (!moveResult) return false;

  // Check if opponent can immediately capture the queen on `to` without losing equal material
  const opponentMoves = chess.moves({ verbose: true }) as Move[];
  const recaptures = opponentMoves.filter((m) => m.to === to);
  if (recaptures.length === 0) return false;

  // If we captured a queen, trading queens is fine
  if (captured && captured.type === 'q') return false;

  return true;
}

function allowsImmediateMateInOne(fen: string, uciMove: string): boolean {
  const chess = new Chess(fen);
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove[4] as 'q' | 'r' | 'b' | 'n' | undefined;
  const moveResult = chess.move({ from, to, promotion });
  if (!moveResult) return false;

  const replies = chess.moves({ verbose: true }) as Move[];
  for (const reply of replies) {
    chess.move(reply);
    const isMate = chess.isCheckmate();
    chess.undo();
    if (isMate) return true;
  }
  return false;
}

function causesAvoidableStalemate(fen: string, uciMove: string): boolean {
  const chess = new Chess(fen);
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  const promotion = uciMove[4] as 'q' | 'r' | 'b' | 'n' | undefined;
  const moveResult = chess.move({ from, to, promotion });
  if (!moveResult) return false;
  return chess.isStalemate();
}

export function selectHumanizedMove(
  fen: string,
  lines: EngineLine[],
  profile: StrengthProfile,
  rng: () => number = Math.random,
): { selectedUci: string; reason: string } {
  const chess = new Chess(fen);
  const legalVerbose = chess.moves({ verbose: true }) as Move[];
  if (legalVerbose.length === 0) {
    throw new Error('No legal moves available in position');
  }
  if (legalVerbose.length === 1) {
    const only = legalVerbose[0]!;
    return {
      selectedUci: `${only.from}${only.to}${only.promotion ?? ''}`,
      reason: 'only-legal-move',
    };
  }

  const validCandidates = lines
    .filter((l) => l.pvUci.length > 0 && l.pvUci[0])
    .map((l) => ({
      uci: l.pvUci[0]!,
      line: l,
      winProb: moverWinProbability(l),
    }));

  if (validCandidates.length === 0) {
    const fallback = legalVerbose[Math.floor(rng() * legalVerbose.length)]!;
    return {
      selectedUci: `${fallback.from}${fallback.to}${fallback.promotion ?? ''}`,
      reason: 'fallback-random-legal',
    };
  }

  const bestCandidate = validCandidates[0]!;

  // Rule 1: Always take a free mate-in-1 above rating 500
  if (profile.rating > 500 && bestCandidate.line.mateIn === 1) {
    return { selectedUci: bestCandidate.uci, reason: 'take-mate-in-1' };
  }

  // Filter out stalemate when winning above rating 700
  let pool = [...validCandidates];
  if (profile.rating > 700 && bestCandidate.winProb > 0.72) {
    const nonStalemate = pool.filter((c) => !causesAvoidableStalemate(fen, c.uci));
    if (nonStalemate.length > 0) {
      pool = nonStalemate;
    }
  }

  // Filter out moving king / allowing immediate mate-in-1 above rating 300
  if (profile.rating > 300) {
    const safeFromMate1 = pool.filter((c) => !allowsImmediateMateInOne(fen, c.uci));
    if (safeFromMate1.length > 0) {
      pool = safeFromMate1;
    }
  }

  // Filter out hanging the queen for nothing above rating 600
  if (profile.rating > 600) {
    const safeFromQueenHang = pool.filter((c) => !isQueenBlunderForNothing(fen, c.uci));
    if (safeFromQueenHang.length > 0) {
      pool = safeFromQueenHang;
    }
  }

  // Blunder injection roll
  if (pool.length > 1 && rng() < profile.blunderProbability) {
    const bottomSliceStart = Math.max(1, Math.floor(pool.length / 2));
    const blunderPool = pool.slice(bottomSliceStart);
    const chosen = blunderPool[Math.floor(rng() * blunderPool.length)]!;
    return { selectedUci: chosen.uci, reason: `human-blunder(p=${profile.blunderProbability})` };
  }

  // Softmax sampling over win probabilities
  const temp = Math.max(0.03, profile.softmaxTemp);
  const maxWin = Math.max(...pool.map((c) => c.winProb));
  const weights = pool.map((c) => Math.exp((c.winProb - maxWin) / temp));
  const totalWeight = weights.reduce((acc, w) => acc + w, 0);

  let roll = rng() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) {
      return { selectedUci: pool[i]!.uci, reason: `softmax(T=${temp.toFixed(2)})` };
    }
  }

  return { selectedUci: pool[0]!.uci, reason: 'softmax-top' };
}

export function computeThinkingDelayMs(
  fen: string,
  mode: ThinkingDelayMode,
  rng: () => number = Math.random,
): number {
  if (mode === 'instant') return 0;

  const chess = new Chess(fen);
  const legalCount = chess.moves().length;
  const complexity = Math.min(1, Math.max(0, (legalCount - 4) / 36));
  const baseMin = 400;
  const baseMax = 2500;
  const scaled = baseMin + complexity * (baseMax - baseMin) * (0.45 + rng() * 0.55);

  if (mode === 'slow') {
    return Math.round(scaled * 1.45);
  }
  return Math.round(scaled);
}
