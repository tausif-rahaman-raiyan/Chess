import { ExplanationLevel, PositionFacts } from '../../src/shared/types';

export interface GroundedPrompt {
  systemPrompt: string;
  userPrompt: string;
  maxWords: number;
}

export function buildGroundedChessPrompt(
  facts: PositionFacts,
  level: ExplanationLevel,
): GroundedPrompt {
  const maxWords = level === 'beginner' ? 110 : level === 'intermediate' ? 150 : 190;

  const levelInstruction =
    level === 'beginner'
      ? 'Use simple, everyday chess words. Avoid dense notation jargon and explain ideas clearly.'
      : level === 'intermediate'
        ? 'Use clear club-level coaching language referencing concrete plans, tactics, and piece coordination.'
        : 'Use precise master-level strategic terminology, concrete variations, and structural assessments.';

  const systemPrompt = [
    'You are an accurate offline chess coach.',
    'Use ONLY the verified PositionFacts JSON provided by the user.',
    'NEVER invent moves, pieces, squares, or evaluations.',
    'Refer ONLY to moves present in legalMovesSan.',
    levelInstruction,
    `Keep total narrative under ${maxWords} words.`,
    'Respond strictly as valid JSON with keys: "summary", "whyBest", "pieceOrMoveDetail", and "ideas" (array of objects with "san" and "reason").',
  ].join(' ');

  const compactFacts = {
    turn: facts.turn === 'w' ? 'White' : 'Black',
    phase: facts.phase,
    opening: facts.openingName ? `${facts.openingEco} ${facts.openingName}` : 'Out of book',
    evalCp: facts.evalCp,
    mateIn: facts.mateIn,
    bestMoveSan: facts.bestMoveSan,
    topLines: facts.topLines,
    materialDiff: facts.materialDiff,
    hangingPieces: facts.hangingPieces,
    tactics: facts.tactics.slice(0, 5),
    pawnStructure: facts.pawnStructure,
    openFiles: facts.openFiles,
    kingSafety: facts.kingSafety,
    selectedPieceInsight: facts.selectedPieceInsight,
    playedMoveContext: facts.playedMoveContext,
    legalMovesSan: facts.legalMovesSan,
  };

  const userPrompt = `PositionFacts JSON:
${JSON.stringify(compactFacts)}`;

  return { systemPrompt, userPrompt, maxWords };
}
