import { Chess, Move } from 'chess.js';
import { ExplanationLevel, ExplanationResult, IdeaCandidate, PositionFacts } from '../../src/shared/types';

function describeEval(facts: PositionFacts, level: ExplanationLevel): string {
  if (facts.mateIn !== null) {
    const who =
      (facts.turn === 'w' && facts.mateIn > 0) || (facts.turn === 'b' && facts.mateIn < 0)
        ? 'White'
        : 'Black';
    return `${who} has a forced checkmate in ${Math.abs(facts.mateIn)} move(s).`;
  }
  const whiteCp = facts.turn === 'w' ? (facts.evalCp ?? 0) : -(facts.evalCp ?? 0);
  if (Math.abs(whiteCp) < 35) {
    return level === 'beginner'
      ? 'The game is very balanced with equal chances for both sides.'
      : 'The position is dynamically equal.';
  }
  const leader = whiteCp > 0 ? 'White' : 'Black';
  const absCp = Math.abs(whiteCp);
  if (absCp < 120) {
    return `${leader} holds a slight edge (${(whiteCp / 100).toFixed(2)}).`;
  }
  if (absCp < 300) {
    return `${leader} has a clear advantage (${(whiteCp / 100).toFixed(2)}).`;
  }
  return `${leader} has a decisive winning advantage (${(whiteCp / 100).toFixed(2)}).`;
}

function classifyMovePurpose(fen: string, uci: string, level: ExplanationLevel): string {
  const chess = new Chess(fen);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci[4] as 'q' | 'r' | 'b' | 'n' | undefined;
  const move = chess.move({ from, to, promotion }) as Move | null;
  if (!move) return 'Improves piece coordination and maintains balance.';

  if (move.san.includes('#')) return 'Delivers immediate checkmate!';
  if (move.san.includes('+')) return 'Gives check and seizes the initiative.';
  if (move.flags.includes('k') || move.flags.includes('q')) {
    return level === 'beginner'
      ? 'Castles the king to safety and brings the rook into play.'
      : 'Safeguards the king via castling and connects the rooks.';
  }
  if (move.captured) {
    return level === 'beginner'
      ? `Captures the opponent's piece on ${move.to}.`
      : `Wins material by capturing on ${move.to}.`;
  }
  if (move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) {
    return 'Claims central space and opens lines for the pieces.';
  }
  if ((move.piece === 'n' || move.piece === 'b') && ['1', '8'].includes(move.from[1] ?? '')) {
    return 'Develops a minor piece toward the center.';
  }
  if (move.piece === 'r' && ['d', 'e', 'c'].includes(move.to[0] ?? '')) {
    return `Places the rook on the ${move.to[0]}-file to control open lines.`;
  }
  return `Repositions the ${move.piece.toUpperCase()} to ${move.to} for stronger activity.`;
}

export function buildTemplateExplanation(
  facts: PositionFacts,
  level: ExplanationLevel,
): ExplanationResult {
  const evalSentence = describeEval(facts, level);
  const structuralNotes: string[] = [];

  if (facts.materialDiff !== 0) {
    const ahead = facts.materialDiff > 0 ? 'White' : 'Black';
    structuralNotes.push(`${ahead} is ahead by ${Math.abs(facts.materialDiff)} point(s) of material.`);
  }
  if (facts.hangingPieces.length > 0) {
    const first = facts.hangingPieces[0]!;
    structuralNotes.push(
      `Watch the undefended ${first.piece.toUpperCase()} on ${first.square}.`,
    );
  }
  if (facts.tactics.length > 0) {
    structuralNotes.push(`${facts.tactics[0]!.description}.`);
  }
  if (facts.openFiles.length > 0 && level !== 'beginner') {
    structuralNotes.push(`Open file(s): ${facts.openFiles.join(', ')}.`);
  }

  const summary = [evalSentence, ...structuralNotes.slice(0, 2)].join(' ');

  const bestUci = facts.bestMoveUci;
  const bestSan = facts.bestMoveSan || facts.legalMovesSan[0] || '';
  const whyBest = bestUci
    ? `${bestSan} is strongest here: ${classifyMovePurpose(facts.fen, bestUci, level)}`
    : `Play ${bestSan} to maintain a solid setup.`;

  let pieceOrMoveDetail = '';
  if (facts.playedMoveContext) {
    const ctx = facts.playedMoveContext;
    pieceOrMoveDetail = `You played ${ctx.san} (${ctx.classification.toUpperCase()}). ${
      ctx.bestMoveSan && ctx.bestMoveSan !== ctx.san
        ? `Engine preferred ${ctx.bestMoveSan}.`
        : 'This matched the top engine choice.'
    }${ctx.opponentBestReplySan ? ` Opponent's strongest reply is ${ctx.opponentBestReplySan}.` : ''}`;
  } else if (facts.selectedPieceInsight) {
    const ins = facts.selectedPieceInsight;
    pieceOrMoveDetail = `${ins.summary}${
      ins.bestDestination ? ` Strongest destination square: ${ins.bestDestination}.` : ''
    }${ins.worstDestination ? ` Risky square to avoid: ${ins.worstDestination}.` : ''}`;
  } else {
    pieceOrMoveDetail =
      facts.openingName
        ? `Currently in ${facts.openingEco}: ${facts.openingName}. Focus on development and king safety.`
        : `We are in the ${facts.phase}. Coordinate pieces around key central squares.`;
  }

  // Build 3-4 verified candidate ideas
  const chess = new Chess(facts.fen);
  const legalVerbose = chess.moves({ verbose: true }) as Move[];
  const ideas: IdeaCandidate[] = [];
  const usedSan = new Set<string>();

  for (const line of facts.topLines) {
    if (!line.san || usedSan.has(line.san)) continue;
    const matched = legalVerbose.find((m) => m.san === line.san);
    const uci = matched ? `${matched.from}${matched.to}${matched.promotion ?? ''}` : '';
    ideas.push({
      san: line.san,
      uci,
      evalText: line.evalText,
      reason: uci ? classifyMovePurpose(facts.fen, uci, level) : 'Top engine continuation.',
    });
    usedSan.add(line.san);
    if (ideas.length >= 4) break;
  }

  for (const m of legalVerbose) {
    if (ideas.length >= 4) break;
    if (usedSan.has(m.san)) continue;
    const uci = `${m.from}${m.to}${m.promotion ?? ''}`;
    ideas.push({
      san: m.san,
      uci,
      evalText: 'Alt',
      reason: classifyMovePurpose(facts.fen, uci, level),
    });
    usedSan.add(m.san);
  }

  return {
    summary,
    whyBest,
    pieceOrMoveDetail,
    ideas,
    source: 'engine-verified',
    modelName: 'Deterministic Engine Narrator',
    validationPassed: true,
    cached: false,
  };
}
