import openingsData from '../../resources/book/openings.json';

export interface BookMoveStat {
  san: string;
  uci: string;
  games: number;
  whitePct: number;
  drawPct: number;
  blackPct: number;
}

export interface BookPositionEntry {
  eco: string;
  name: string;
  moves: BookMoveStat[];
}

export interface OpeningLookupResult {
  inBook: boolean;
  eco: string;
  name: string;
  mainPlan: string;
  bookMoves: BookMoveStat[];
  outOfBookMoveNumber: number | null;
}

const BOOK_INDEX = openingsData as Record<string, BookPositionEntry>;

const ECO_FAMILY_PLANS: Record<string, string> = {
  A: 'Control key central squares indirectly from the flanks, prepare timely pawn breaks with c4/d4 or e4, and harmonize fianchettoed bishops.',
  B: 'Fight asymmetrically against 1.e4: Black seeks queenside counterplay along the c-file or solid central light-square control, while White aims for rapid development and kingside space.',
  C: 'Contest the center directly with e4/e5, develop minor pieces toward f3/c4/b5, castle early, and prepare central pawn tension with d4 or c3.',
  D: 'Build a classical central pawn duo on d4/c4, challenge Black’s d5 outpost, and utilize the c-file and minority attacks in the middlegame.',
  E: 'Hypermodern Indian structures: White claims central space with d4 and c4 while Black pressures the dark squares with Nf6, g6/e6, and timely ...c5 or ...e5 breaks.',
};

export function normalizeFenForBook(fen: string): string {
  return fen.split(' ').slice(0, 4).join(' ');
}

export function lookupOpeningByFen(
  fen: string,
  moveHistoryFens: string[] = [],
): OpeningLookupResult {
  const key = normalizeFenForBook(fen);
  const direct = BOOK_INDEX[key];

  if (direct) {
    const family = direct.eco[0]?.toUpperCase() ?? 'C';
    return {
      inBook: true,
      eco: direct.eco,
      name: direct.name,
      mainPlan: ECO_FAMILY_PLANS[family] ?? ECO_FAMILY_PLANS.C!,
      bookMoves: direct.moves,
      outOfBookMoveNumber: null,
    };
  }

  // Walk backwards through game history to find last known opening name & exact ply where book ended
  let lastKnown: BookPositionEntry | null = null;
  let lastBookPly = 0;

  for (let i = 0; i < moveHistoryFens.length; i++) {
    const histKey = normalizeFenForBook(moveHistoryFens[i]!);
    const entry = BOOK_INDEX[histKey];
    if (entry) {
      lastKnown = entry;
      lastBookPly = i + 1;
    }
  }

  const currentFullMove = Number(fen.split(' ')[5] ?? '1') || Math.max(1, Math.ceil((lastBookPly + 1) / 2));
  const eco = lastKnown?.eco ?? 'A00';
  const name = lastKnown?.name ?? 'Unclassified Opening';
  const family = eco[0]?.toUpperCase() ?? 'C';

  return {
    inBook: false,
    eco,
    name,
    mainPlan: ECO_FAMILY_PLANS[family] ?? ECO_FAMILY_PLANS.C!,
    bookMoves: [],
    outOfBookMoveNumber: currentFullMove,
  };
}

export function isBookMoveUci(fenBefore: string, moveUci: string): boolean {
  const key = normalizeFenForBook(fenBefore);
  const entry = BOOK_INDEX[key];
  if (!entry) return false;
  return entry.moves.some((m) => m.uci === moveUci);
}

export function getAllIndexedOpenings(): Array<{ fenKey: string; eco: string; name: string; moves: BookMoveStat[] }> {
  return Object.entries(BOOK_INDEX)
    .filter(([, val]) => val.moves.length > 0)
    .map(([fenKey, val]) => ({
      fenKey,
      eco: val.eco,
      name: val.name,
      moves: val.moves,
    }));
}
