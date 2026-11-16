import { describe, expect, it } from 'vitest';
import { computeGameAccuracy } from '../src/core/accuracy';

describe('computeGameAccuracy', () => {
  it('returns 100% when average win-percentage drop is zero', () => {
    expect(computeGameAccuracy([0, 0, 0, 0])).toBe(100);
  });

  it('decreases smoothly as average drop rises and clamps at 0', () => {
    const highAcc = computeGameAccuracy([1.5, 2.0, 0.5]);
    const lowAcc = computeGameAccuracy([15, 22, 18]);
    const zeroAcc = computeGameAccuracy([90, 95, 100]);
    expect(highAcc).toBeGreaterThan(85);
    expect(lowAcc).toBeLessThan(55);
    expect(zeroAcc).toBe(0);
  });
});
