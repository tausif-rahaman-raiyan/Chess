export interface StrengthProfile {
  rating: number;
  label: string;
  description: string;
  useHumanizer: boolean;
  uciLimitStrength: boolean;
  uciElo: number;
  skillLevel: number;
  multiPv: number;
  depthCap: number | null;
  movetimeCapMs: number | null;
  softmaxTemp: number;
  blunderProbability: number;
}

export const RATING_PRESETS: Array<{ rating: number; label: string; description: string }> = [
  { rating: 400, label: 'Beginner', description: 'Learns basic rules, hangs pieces occasionally.' },
  { rating: 800, label: 'Casual', description: 'Spots simple 1-move threats, misses deeper tactics.' },
  { rating: 1100, label: 'Improver', description: 'Develops pieces, occasionally overlooks forks or pins.' },
  { rating: 1400, label: 'Club', description: 'Solid fundamentals and decent tactical awareness.' },
  { rating: 1800, label: 'Strong Club', description: 'Structured middlegame plans and sharp calculation.' },
  { rating: 2000, label: 'Expert', description: 'Candidate-master precision with strong endgame play.' },
  { rating: 2400, label: 'Master', description: 'International Master level positional & tactical depth.' },
  { rating: 2700, label: 'GM', description: 'Grandmaster strength with deep theoretical accuracy.' },
  { rating: 3000, label: 'Super-GM', description: 'World-championship contender caliber.' },
  { rating: 3500, label: 'Max', description: 'Unrestricted Stockfish 17 full hardware strength.' },
];

export function describeRating(rating: number): { label: string; description: string } {
  const clamped = Math.max(0, Math.min(3500, Math.round(rating)));
  if (clamped >= 3200) {
    return {
      label: 'Max Strength',
      description: 'Unrestricted Stockfish 17 neural network at full threads & hash.',
    };
  }
  let closest = RATING_PRESETS[0]!;
  for (const preset of RATING_PRESETS) {
    if (Math.abs(preset.rating - clamped) <= Math.abs(closest.rating - clamped)) {
      closest = preset;
    }
  }
  return { label: closest.label, description: closest.description };
}

export function computeBlunderProbability(rating: number): number {
  const r = Math.max(0, Math.min(1319, rating));
  if (r <= 400) {
    return Number((0.45 - (r / 400) * 0.15).toFixed(4));
  }
  if (r <= 800) {
    return Number((0.3 - ((r - 400) / 400) * 0.15).toFixed(4));
  }
  if (r <= 1200) {
    return Number((0.15 - ((r - 800) / 400) * 0.09).toFixed(4));
  }
  return Number((0.06 - ((r - 1200) / 119) * 0.03).toFixed(4));
}

export function mapRatingToStrength(rawRating: number): StrengthProfile {
  const rating = Math.max(0, Math.min(3500, Math.round(rawRating)));
  const { label, description } = describeRating(rating);

  // Band 1: 3200+ ("Max") -> Full unrestricted Stockfish strength
  if (rating >= 3200) {
    return {
      rating,
      label,
      description,
      useHumanizer: false,
      uciLimitStrength: false,
      uciElo: 3190,
      skillLevel: 20,
      multiPv: 1,
      depthCap: null,
      movetimeCapMs: 1200,
      softmaxTemp: 0,
      blunderProbability: 0,
    };
  }

  // Band 2: 1320 - 3190 -> Stockfish native UCI_LimitStrength + UCI_Elo
  if (rating >= 1320) {
    const skillLevel = Math.min(20, Math.max(6, Math.round(((rating - 1320) / 1870) * 14 + 6)));
    return {
      rating,
      label,
      description,
      useHumanizer: false,
      uciLimitStrength: true,
      uciElo: rating,
      skillLevel,
      multiPv: 1,
      depthCap: null,
      movetimeCapMs: 700,
      softmaxTemp: 0,
      blunderProbability: 0,
    };
  }

  // Band 3: 0 - 1319 -> Humanized MultiPV=6 sampling + blunder model
  const ratio = rating / 1319;
  const depthCap = Math.max(1, Math.min(8, Math.round(1 + ratio * 7)));
  const movetimeCapMs = Math.max(30, Math.min(300, Math.round(30 + ratio * 270)));
  const skillLevel = Math.max(0, Math.min(20, Math.round(ratio * 20)));
  const softmaxTemp = Number((0.55 - ratio * 0.47).toFixed(4));
  const blunderProbability = computeBlunderProbability(rating);

  return {
    rating,
    label,
    description,
    useHumanizer: true,
    uciLimitStrength: false,
    uciElo: 1320,
    skillLevel,
    multiPv: 6,
    depthCap,
    movetimeCapMs,
    softmaxTemp,
    blunderProbability,
  };
}
