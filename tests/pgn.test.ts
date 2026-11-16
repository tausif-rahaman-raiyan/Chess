import { describe, expect, it } from 'vitest';
import { exportAnnotatedPgn, parseSinglePgn, splitMultiGamePgn } from '../src/core/pgn';

describe('PGN export and import', () => {
  it('round-trips an annotated PGN cleanly', () => {
    const pgn = exportAnnotatedPgn({
      white: 'You',
      black: 'Stockfish (1200)',
      result: '1-0',
      date: '2026-11-16',
      timeControl: '10+0',
      openingEco: 'C50',
      openingName: 'Italian Game',
      includeAnnotations: true,
      moves: [
        {
          ply: 1,
          san: 'e4',
          uci: 'e2e4',
          fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
          evalCp: 32,
          mate: null,
          winProb: 53,
          bestMove: 'e4',
          classification: 'book',
          timeMs: 1200,
        },
        {
          ply: 2,
          san: 'e5',
          uci: 'e7e5',
          fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          evalCp: 28,
          mate: null,
          winProb: 52,
          bestMove: null,
          classification: null,
          timeMs: 800,
        },
      ],
    });

    expect(pgn).toContain('[Opening "Italian Game"]');
    expect(pgn).toContain('1. e4 {[%eval +0.32] [%cls book]} e5');

    const chunks = splitMultiGamePgn(pgn);
    expect(chunks).toHaveLength(1);
    const parsed = parseSinglePgn(chunks[0]!);
    expect(parsed.moves).toHaveLength(2);
    expect(parsed.moves[0]?.san).toBe('e4');
  });
});
