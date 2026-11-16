import { describe, expect, it } from 'vitest';
import { expectedPoints, winPctFromCentipawns, winPctFromScore } from '../src/core/winProbability';

describe('winProbability', () => {
  it('returns 50% at 0 centipawns', () => {
    expect(winPctFromCentipawns(0)).toBeCloseTo(50, 4);
  });

  it('is symmetric around 50% for +cp and -cp', () => {
    const plus = winPctFromCentipawns(250);
    const minus = winPctFromCentipawns(-250);
    expect(plus + minus).toBeCloseTo(100, 3);
  });

  it('handles forced mate scores as 100% or 0%', () => {
    expect(winPctFromScore(null, 3, 'w', 'w')).toBe(100);
    expect(winPctFromScore(null, 3, 'w', 'b')).toBe(0);
    expect(winPctFromScore(null, -2, 'b', 'b')).toBe(0);
  });

  it('clamps expected points between 0 and 1', () => {
    expect(expectedPoints(120)).toBe(1);
    expect(expectedPoints(-10)).toBe(0);
    expect(expectedPoints(50)).toBe(0.5);
  });
});
