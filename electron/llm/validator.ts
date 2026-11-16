import { PositionFacts } from '../../src/shared/types';

export interface RawLlmExplanation {
  summary: string;
  whyBest: string;
  pieceOrMoveDetail?: string;
  ideas: Array<{
    san: string;
    reason: string;
  }>;
}

export interface ValidationOutcome {
  valid: boolean;
  reasons: string[];
  parsed: RawLlmExplanation | null;
}

const SAN_TOKEN_REGEX =
  /(?:O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)/g;

export function extractMentionedMoves(text: string): string[] {
  const matches = text.match(SAN_TOKEN_REGEX) ?? [];
  return Array.from(new Set(matches));
}

export function validateLlmExplanation(
  rawOutput: string,
  facts: PositionFacts,
): ValidationOutcome {
  const reasons: string[] = [];
  let parsed: RawLlmExplanation;

  try {
    const cleaned = rawOutput
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const obj = JSON.parse(cleaned) as Partial<RawLlmExplanation>;

    if (typeof obj.summary !== 'string' || obj.summary.trim().length < 8) {
      return { valid: false, reasons: ['Missing or empty summary field'], parsed: null };
    }
    if (typeof obj.whyBest !== 'string' || obj.whyBest.trim().length < 5) {
      return { valid: false, reasons: ['Missing or empty whyBest field'], parsed: null };
    }
    if (!Array.isArray(obj.ideas)) {
      return { valid: false, reasons: ['Missing ideas array'], parsed: null };
    }

    parsed = {
      summary: obj.summary.trim(),
      whyBest: obj.whyBest.trim(),
      pieceOrMoveDetail: typeof obj.pieceOrMoveDetail === 'string' ? obj.pieceOrMoveDetail.trim() : '',
      ideas: obj.ideas
        .filter((i): i is { san: string; reason: string } => Boolean(i && typeof i.san === 'string' && typeof i.reason === 'string'))
        .map((i) => ({ san: i.san.trim(), reason: i.reason.trim() })),
    };
  } catch (err) {
    return {
      valid: false,
      reasons: [`Malformed JSON from model: ${(err as Error).message}`],
      parsed: null,
    };
  }

  const legalSet = new Set(facts.legalMovesSan);
  const stripCheck = (m: string) => m.replace(/[+#?!]/g, '');
  const legalStripped = new Set(facts.legalMovesSan.map(stripCheck));

  // Verify every idea move is strictly legal
  for (const idea of parsed.ideas) {
    if (!legalSet.has(idea.san) && !legalStripped.has(stripCheck(idea.san))) {
      reasons.push(`Idea move "${idea.san}" is not in legalMovesSan`);
    }
  }

  // Verify all SAN move tokens mentioned in prose exist in legalMovesSan (or playedMoveSan)
  const allowedExtra = new Set<string>();
  if (facts.playedMoveContext?.san) {
    allowedExtra.add(stripCheck(facts.playedMoveContext.san));
  }
  for (const line of facts.topLines) {
    for (const san of line.pvSan) {
      allowedExtra.add(stripCheck(san));
    }
  }

  const allProse = `${parsed.summary} ${parsed.whyBest} ${parsed.pieceOrMoveDetail ?? ''}`;
  for (const token of extractMentionedMoves(allProse)) {
    const norm = stripCheck(token);
    // Ignore pure destination square names like "e4" when used as square references
    if (/^[a-h][1-8]$/.test(norm)) continue;
    if (!legalStripped.has(norm) && !allowedExtra.has(norm)) {
      reasons.push(`Mentioned illegal or hallucinated move "${token}"`);
    }
  }

  // Fact-contradiction check: claiming "hanging queen" when no queen is hanging
  const lowerProse = allProse.toLowerCase();
  if (lowerProse.includes('hanging queen')) {
    const queenHangs = facts.hangingPieces.some((p) => p.piece === 'q');
    if (!queenHangs) {
      reasons.push('Claimed hanging queen when no queen is undefended');
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
    parsed,
  };
}
