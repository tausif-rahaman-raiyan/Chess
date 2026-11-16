import { describe, expect, it } from 'vitest';
import { selectHumanizedMove } from '../electron/engine/humanizer';
import { mapRatingToStrength } from '../electron/engine/strength';
import { EngineLine } from '../src/shared/types';

describe('humanizer safeguards', () => {
  it('always takes immediate mate-in-1 when rating > 500', () => {
    const fen = '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1'; // Rd8#
    const lines: EngineLine[] = [
      { multipv: 1, depth: 8, seldepth: 8, scoreCp: null, mateIn: 1, nodes: 100, nps: 1000, pvUci: ['d1d8'], pvSan: ['Rd8#'] },
      { multipv: 2, depth: 8, seldepth: 8, scoreCp: 20, mateIn: null, nodes: 100, nps: 1000, pvUci: ['h2h3'], pvSan: ['h3'] },
    ];
    const profile = mapRatingToStrength(650);
    const res = selectHumanizedMove(fen, lines, profile, () => 0.99);
    expect(res.selectedUci).toBe('d1d8');
  });

  it('refuses to hang the queen for nothing when rating > 600', () => {
    // White Queen on d1; Qd5 walks into Black pawn on e6!
    const fen = 'rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2';
    const lines: EngineLine[] = [
      { multipv: 1, depth: 4, seldepth: 4, scoreCp: -800, mateIn: null, nodes: 50, nps: 1000, pvUci: ['d1d5'], pvSan: ['Qd5'] },
      { multipv: 2, depth: 4, seldepth: 4, scoreCp: 30, mateIn: null, nodes: 50, nps: 1000, pvUci: ['e2e4'], pvSan: ['e4'] },
    ];
    const profile = mapRatingToStrength(750);
    const res = selectHumanizedMove(fen, lines, profile, () => 0.01);
    expect(res.selectedUci).toBe('e2e4');
  });
});
