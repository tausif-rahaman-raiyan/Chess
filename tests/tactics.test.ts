import { describe, expect, it } from 'vitest';
import { buildPositionFacts } from '../src/core/tactics';

describe('buildPositionFacts', () => {
  it('detects a knight fork and hanging pieces deterministically', () => {
    // White knight on c7 simultaneously attacks Black king on e8 and rook on a8
    const forkFen = 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1';
    const facts = buildPositionFacts({ fen: forkFen });
    const hasFork = facts.tactics.some((t) => t.type === 'fork' && t.attackerSquare === 'c7');
    expect(hasFork).toBe(true);
    expect(facts.hangingPieces.some((h) => h.square === 'a8' && h.piece === 'r')).toBe(true);
  });

  it('identifies selected piece insight for a specific square', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const facts = buildPositionFacts({ fen: startFen, selectedSquare: 'g1' });
    expect(facts.selectedPieceInsight?.piece).toBe('n');
    expect(facts.selectedPieceInsight?.legalDestinations).toEqual(expect.arrayContaining(['f3', 'h3']));
  });
});
