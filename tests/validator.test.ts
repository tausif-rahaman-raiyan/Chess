import { describe, expect, it } from 'vitest';
import { validateLlmExplanation } from '../electron/llm/validator';
import { buildPositionFacts } from '../src/core/tactics';

describe('validateLlmExplanation', () => {
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const facts = buildPositionFacts({ fen: startFen });

  it('accepts valid JSON referencing only legal moves', () => {
    const validJson = JSON.stringify({
      summary: 'Both sides are ready to develop their pieces in a balanced opening.',
      whyBest: 'Playing e4 claims central space immediately.',
      pieceOrMoveDetail: 'The e2 pawn can advance safely.',
      ideas: [
        { san: 'e4', reason: 'Controls d5 and opens diagonals.' },
        { san: 'd4', reason: 'Establishes a strong central presence.' },
      ],
    });
    const res = validateLlmExplanation(validJson, facts);
    expect(res.valid).toBe(true);
  });

  it('rejects output that recommends an illegal move', () => {
    const invalidJson = JSON.stringify({
      summary: 'White has a huge attack already.',
      whyBest: 'Play Qxe8# immediately.',
      pieceOrMoveDetail: '',
      ideas: [{ san: 'Qxe8#', reason: 'Wins the king.' }],
    });
    const res = validateLlmExplanation(invalidJson, facts);
    expect(res.valid).toBe(false);
    expect(res.reasons.some((r) => r.includes('Qxe8#'))).toBe(true);
  });
});
