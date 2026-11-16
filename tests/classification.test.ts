import { describe, expect, it } from 'vitest';
import { classifyPlayerMove } from '../src/core/classification';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

describe('classifyPlayerMove', () => {
  it('prioritizes book moves above all other classifications', () => {
    const res = classifyPlayerMove({
      fenBefore: START_FEN,
      fenAfter: AFTER_E4,
      playedUci: 'e2e4',
      playedSan: 'e4',
      moverColor: 'w',
      isBookMove: true,
      bestMoveUci: 'd2d4',
      bestScoreCp: 35,
      bestMateIn: null,
      secondBestScoreCp: 30,
      secondBestMateIn: null,
      afterMoveScoreCp: -30,
      afterMoveMateIn: null,
    });
    expect(res.classification).toBe('book');
  });

  it('identifies Great (!) moves when best move leads 2nd best by >= 0.10 EP', () => {
    const res = classifyPlayerMove({
      fenBefore: START_FEN,
      fenAfter: AFTER_E4,
      playedUci: 'e2e4',
      playedSan: 'e4',
      moverColor: 'w',
      isBookMove: false,
      bestMoveUci: 'e2e4',
      bestScoreCp: 160,
      bestMateIn: null,
      secondBestScoreCp: 10,
      secondBestMateIn: null,
      afterMoveScoreCp: -160,
      afterMoveMateIn: null,
    });
    expect(res.classification).toBe('great');
  });

  it('identifies Blunder (??) when expected points loss exceeds 0.20', () => {
    const res = classifyPlayerMove({
      fenBefore: START_FEN,
      fenAfter: AFTER_E4,
      playedUci: 'f2f3',
      playedSan: 'f3',
      moverColor: 'w',
      isBookMove: false,
      bestMoveUci: 'e2e4',
      bestScoreCp: 180,
      bestMateIn: null,
      secondBestScoreCp: 160,
      secondBestMateIn: null,
      afterMoveScoreCp: 220, // Opponent is +2.20 ahead
      afterMoveMateIn: null,
    });
    expect(res.classification).toBe('blunder');
  });

  it('identifies Miss when player had >=85% win chance and dropped >=0.15 EP without losing', () => {
    const res = classifyPlayerMove({
      fenBefore: START_FEN,
      fenAfter: AFTER_E4,
      playedUci: 'a2a3',
      playedSan: 'a3',
      moverColor: 'w',
      isBookMove: false,
      bestMoveUci: 'e2e4',
      bestScoreCp: 620, // ~90.7% win prob
      bestMateIn: null,
      secondBestScoreCp: 580,
      secondBestMateIn: null,
      afterMoveScoreCp: -80, // White still slightly ahead (~57.3% win prob)
      afterMoveMateIn: null,
    });
    expect(res.classification).toBe('miss');
  });
});
