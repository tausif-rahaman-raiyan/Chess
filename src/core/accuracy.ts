/**
 * Exact per-game accuracy formula:
 * accuracy = 103.1668 * exp(-0.04354 * avgWinPctDrop) - 3.1669, clamped 0-100.
 */
export function computeGameAccuracy(winPctDrops: number[]): number {
  if (winPctDrops.length === 0) return 100;
  const sum = winPctDrops.reduce((acc, d) => acc + Math.max(0, d), 0);
  const avgDrop = sum / winPctDrops.length;
  const raw = 103.1668 * Math.exp(-0.04354 * avgDrop) - 3.1669;
  return Number(Math.max(0, Math.min(100, raw)).toFixed(1));
}
