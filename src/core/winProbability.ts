import { PieceColor } from '../shared/types';

/**
 * Exact Lichess/Stockfish win-percentage curve from centipawns:
 * winPct(cp) = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 */
export function winPctFromCentipawns(cp: number): number {
  const clamped = Math.max(-4000, Math.min(4000, cp));
  const raw = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
  return Number(Math.max(0, Math.min(100, raw)).toFixed(4));
}

export function winPctFromScore(
  scoreCp: number | null,
  mateIn: number | null,
  povColor: PieceColor,
  scoreSideToMove: PieceColor,
): number {
  if (mateIn !== null) {
    const sideToMoveWins = mateIn > 0;
    const povWins = povColor === scoreSideToMove ? sideToMoveWins : !sideToMoveWins;
    return povWins ? 100 : 0;
  }
  const rawCp = scoreCp ?? 0;
  const povCp = povColor === scoreSideToMove ? rawCp : -rawCp;
  return winPctFromCentipawns(povCp);
}

export function expectedPoints(winPct: number): number {
  return Math.max(0, Math.min(1, winPct / 100));
}
