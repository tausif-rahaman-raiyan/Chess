import { Chess } from 'chess.js';
import { MoveClassification, PieceColor, RecordedMove } from '../shared/types';

const CLASSIFICATION_NAG: Partial<Record<MoveClassification, string>> = {
  brilliant: '!!',
  great: '!',
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
};

export interface ExportPgnOptions {
  white: string;
  black: string;
  result: string;
  date: string;
  timeControl: string;
  openingEco: string;
  openingName: string;
  initialFen?: string;
  moves: RecordedMove[];
  includeAnnotations?: boolean;
}

export function exportAnnotatedPgn(opts: ExportPgnOptions): string {
  const headers = [
    `[Event "OfflineChess Pro Match"]`,
    `[Site "Local Windows Workstation"]`,
    `[Date "${opts.date.replace(/-/g, '.')}"]`,
    `[White "${opts.white}"]`,
    `[Black "${opts.black}"]`,
    `[Result "${opts.result}"]`,
    `[TimeControl "${opts.timeControl}"]`,
    `[ECO "${opts.openingEco}"]`,
    `[Opening "${opts.openingName}"]`,
  ];

  if (opts.initialFen) {
    headers.push(`[SetUp "1"]`);
    headers.push(`[FEN "${opts.initialFen}"]`);
  }

  const bodyTokens: string[] = [];
  for (let i = 0; i < opts.moves.length; i++) {
    const m = opts.moves[i]!;
    if (i % 2 === 0) {
      bodyTokens.push(`${Math.floor(i / 2) + 1}.`);
    }
    const suffix =
      opts.includeAnnotations && m.classification
        ? (CLASSIFICATION_NAG[m.classification] ?? '')
        : '';
    bodyTokens.push(`${m.san}${suffix}`);

    if (opts.includeAnnotations && (m.evalCp !== null || m.mate !== null || m.classification)) {
      const evalTag =
        m.mate !== null
          ? `#${m.mate}`
          : m.evalCp !== null
            ? `${m.evalCp >= 0 ? '+' : ''}${(m.evalCp / 100).toFixed(2)}`
            : '';
      const clsTag = m.classification ? `[%cls ${m.classification}]` : '';
      const evStr = evalTag ? `[%eval ${evalTag}]` : '';
      if (clsTag || evStr) {
        bodyTokens.push(`{${[evStr, clsTag].filter(Boolean).join(' ')}}`);
      }
    }
  }

  bodyTokens.push(opts.result);
  return `${headers.join('
')}

${bodyTokens.join(' ')}
`;
}

export interface ImportedPgnGame {
  white: string;
  black: string;
  result: string;
  date: string;
  timeControl: string;
  openingEco: string;
  openingName: string;
  myColor: PieceColor;
  pgn: string;
  moves: RecordedMove[];
}

export function splitMultiGamePgn(rawPgn: string): string[] {
  const normalized = rawPgn.replace(/
/g, '
').trim();
  if (!normalized) return [];
  const chunks = normalized.split(/
(?=\[Event\s)/g).map((c) => c.trim()).filter(Boolean);
  return chunks.length > 0 ? chunks : [normalized];
}

export function parseSinglePgn(singlePgn: string): ImportedPgnGame {
  const chess = new Chess();
  chess.loadPgn(singlePgn, { strict: false });
  const headers = chess.header();
  const verboseHistory = chess.history({ verbose: true });

  const replay = new Chess(headers.FEN || undefined);
  const moves: RecordedMove[] = [];

  for (let i = 0; i < verboseHistory.length; i++) {
    const h = verboseHistory[i]!;
    const applied = replay.move(h.san);
    if (!applied) break;
    moves.push({
      ply: i + 1,
      san: applied.san,
      uci: `${applied.from}${applied.to}${applied.promotion ?? ''}`,
      fenAfter: replay.fen(),
      evalCp: null,
      mate: null,
      winProb: 50,
      bestMove: null,
      classification: null,
      timeMs: 0,
    });
  }

  return {
    white: headers.White ?? 'Player',
    black: headers.Black ?? 'Opponent',
    result: headers.Result ?? '*',
    date: (headers.Date ?? new Date().toISOString().slice(0, 10)).replace(/\./g, '-'),
    timeControl: headers.TimeControl ?? '10+0',
    openingEco: headers.ECO ?? 'A00',
    openingName: headers.Opening ?? 'Imported Game',
    myColor: 'w',
    pgn: singlePgn,
    moves,
  };
}
