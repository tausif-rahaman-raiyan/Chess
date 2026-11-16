import { Chess, PieceSymbol } from 'chess.js';
import {
  ClassificationThresholds,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  MoveClassification,
  PieceColor,
} from '../shared/types';
import { expectedPoints, winPctFromScore } from './winProbability';

const MATERIAL_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function countMaterialForSide(fen: string, side: PieceColor): number {
  const chess = new Chess(fen);
  let total = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === side) {
        total += MATERIAL_VALUE[cell.type];
      }
    }
  }
  return total;
}

export interface ClassifyMoveInput {
  fenBefore: string;
  fenAfter: string;
  playedUci: string;
  playedSan: string;
  moverColor: PieceColor;
  isBookMove: boolean;
  bestMoveUci: string;
  bestScoreCp: number | null;
  bestMateIn: number | null;
  secondBestScoreCp: number | null;
  secondBestMateIn: number | null;
  afterMoveScoreCp: number | null; // From opponent's perspective (side to move in fenAfter)
  afterMoveMateIn: number | null; // From opponent's perspective
  pvAfterMoveUci?: string[];
  thresholds?: ClassificationThresholds;
}

export interface ClassificationOutput {
  classification: MoveClassification;
  expectedPointsLoss: number;
  winPctBefore: number;
  winPctAfter: number;
}

function isPieceSacrifice(input: ClassifyMoveInput): boolean {
  const chessBefore = new Chess(input.fenBefore);
  const from = input.playedUci.slice(0, 2);
  const to = input.playedUci.slice(2, 4);
  const movingPiece = chessBefore.get(from as never);
  const capturedPiece = chessBefore.get(to as never);

  if (!movingPiece || movingPiece.type === 'p' || movingPiece.type === 'k') {
    return false;
  }

  // Must not be a simple equal/winning recapture
  if (capturedPiece && MATERIAL_VALUE[capturedPiece.type] >= MATERIAL_VALUE[movingPiece.type]) {
    return false;
  }

  const matBefore = countMaterialForSide(input.fenBefore, input.moverColor);
  const oppBefore = countMaterialForSide(input.fenBefore, input.moverColor === 'w' ? 'b' : 'w');
  const netBefore = matBefore - oppBefore;

  // Simulate up to 3 plies along the engine continuation after the move
  const sim = new Chess(input.fenAfter);
  const followUp = (input.pvAfterMoveUci ?? []).slice(0, 3);
  for (const uci of followUp) {
    if (uci.length < 4) break;
    try {
      const mv = sim.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      if (!mv) break;
    } catch {
      break;
    }
  }

  const matAfter = countMaterialForSide(sim.fen(), input.moverColor);
  const oppAfter = countMaterialForSide(sim.fen(), input.moverColor === 'w' ? 'b' : 'w');
  const netAfter = matAfter - oppAfter;

  return netBefore - netAfter >= 2;
}

export function classifyPlayerMove(input: ClassifyMoveInput): ClassificationOutput {
  const thresholds = input.thresholds ?? DEFAULT_CLASSIFICATION_THRESHOLDS;
  const oppColor: PieceColor = input.moverColor === 'w' ? 'b' : 'w';

  const winPctBest = winPctFromScore(
    input.bestScoreCp,
    input.bestMateIn,
    input.moverColor,
    input.moverColor,
  );
  const winPctAfter =
    input.playedUci === input.bestMoveUci
      ? winPctBest
      : winPctFromScore(
          input.afterMoveScoreCp,
          input.afterMoveMateIn,
          input.moverColor,
          oppColor,
        );

  const epBest = expectedPoints(winPctBest);
  const epAfter = expectedPoints(winPctAfter);
  const epl = Number(Math.max(0, epBest - epAfter).toFixed(4));

  // Highest priority: Book move
  if (input.isBookMove) {
    return {
      classification: 'book',
      expectedPointsLoss: epl,
      winPctBefore: winPctBest,
      winPctAfter,
    };
  }

  const isEngineTop = input.playedUci === input.bestMoveUci;

  // Brilliant (!!): genuine piece sacrifice (net >= 2 pts over 3 plies), Best/Excellent,
  // and position wasn't already completely winning (< 90% win prob)
  if (
    (isEngineTop || epl <= thresholds.excellentMaxEpl) &&
    winPctBest < 90 &&
    winPctAfter >= 52 &&
    isPieceSacrifice(input)
  ) {
    return {
      classification: 'brilliant',
      expectedPointsLoss: epl,
      winPctBefore: winPctBest,
      winPctAfter,
    };
  }

  // Great (!): only move that preserves the position (2nd best is >= 0.10 EP worse)
  if (
    (isEngineTop || epl <= thresholds.excellentMaxEpl) &&
    (input.secondBestScoreCp !== null || input.secondBestMateIn !== null)
  ) {
    const winPctSecond = winPctFromScore(
      input.secondBestScoreCp,
      input.secondBestMateIn,
      input.moverColor,
      input.moverColor,
    );
    const epSecond = expectedPoints(winPctSecond);
    if (epBest - epSecond >= 0.1 && winPctAfter >= 45) {
      return {
        classification: 'great',
        expectedPointsLoss: epl,
        winPctBefore: winPctBest,
        winPctAfter,
      };
    }
  }

  // Miss: player had a forced win / decisive tactic (winPctBest >= 85%) and dropped >= 0.15 EP
  // without losing the game outright
  if (winPctBest >= 85 && epl >= 0.15 && winPctAfter >= 45) {
    return {
      classification: 'miss',
      expectedPointsLoss: epl,
      winPctBefore: winPctBest,
      winPctAfter,
    };
  }

  if (isEngineTop || epl <= thresholds.bestMaxEpl) {
    return { classification: 'best', expectedPointsLoss: epl, winPctBefore: winPctBest, winPctAfter };
  }
  if (epl <= thresholds.excellentMaxEpl) {
    return {
      classification: 'excellent',
      expectedPointsLoss: epl,
      winPctBefore: winPctBest,
      winPctAfter,
    };
  }
  if (epl <= thresholds.goodMaxEpl) {
    return { classification: 'good', expectedPointsLoss: epl, winPctBefore: winPctBest, winPctAfter };
  }
  if (epl <= thresholds.inaccuracyMaxEpl) {
    return {
      classification: 'inaccuracy',
      expectedPointsLoss: epl,
      winPctBefore: winPctBest,
      winPctAfter,
    };
  }
  if (epl <= thresholds.mistakeMaxEpl) {
    return {
      classification: 'mistake',
      expectedPointsLoss: epl,
      winPctBefore: winPctBest,
      winPctAfter,
    };
  }
  return {
    classification: 'blunder',
    expectedPointsLoss: epl,
    winPctBefore: winPctBest,
    winPctAfter,
  };
}
