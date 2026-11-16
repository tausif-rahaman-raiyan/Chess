import { describe, expect, it } from 'vitest';
import { computeBlunderProbability, mapRatingToStrength } from '../electron/engine/strength';

describe('mapRatingToStrength', () => {
  it('uses Humanizer with MultiPV=6 for ratings below 1320', () => {
    const p400 = mapRatingToStrength(400);
    expect(p400.useHumanizer).toBe(true);
    expect(p400.multiPv).toBe(6);
    expect(p400.blunderProbability).toBeCloseTo(0.3, 2);

    const p1200 = mapRatingToStrength(1200);
    expect(p1200.useHumanizer).toBe(true);
    expect(p1200.blunderProbability).toBeCloseTo(0.06, 2);
  });

  it('uses native UCI_LimitStrength between 1320 and 3190', () => {
    const p2000 = mapRatingToStrength(2000);
    expect(p2000.useHumanizer).toBe(false);
    expect(p2000.uciLimitStrength).toBe(true);
    expect(p2000.uciElo).toBe(2000);
  });

  it('disables UCI_LimitStrength for Max strength >= 3200', () => {
    const p3500 = mapRatingToStrength(3500);
    expect(p3500.useHumanizer).toBe(false);
    expect(p3500.uciLimitStrength).toBe(false);
    expect(p3500.skillLevel).toBe(20);
  });

  it('monotonically decreases blunder probability from 0 to 1319', () => {
    expect(computeBlunderProbability(0)).toBeGreaterThan(computeBlunderProbability(400));
    expect(computeBlunderProbability(400)).toBeGreaterThan(computeBlunderProbability(800));
    expect(computeBlunderProbability(800)).toBeGreaterThan(computeBlunderProbability(1200));
  });
});
