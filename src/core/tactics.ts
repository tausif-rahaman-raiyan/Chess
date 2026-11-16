import { Chess, Color, Move, PieceSymbol, Square } from 'chess.js';
import {
  EngineEvaluation,
  MoveClassification,
  PieceSquareInsight,
  PositionFacts,
  TacticalPieceRef,
  TacticalRelation,
} from '../shared/types';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
const CENTER_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c5', 'f5'];

function winProbabilityFromCp(cp: number | null, mateIn: number | null, turn: Color): number {
  if (mateIn !== null) {
    const moverWinning = mateIn > 0;
    const whiteWinning = turn === 'w' ? moverWinning : !moverWinning;
    return whiteWinning ? 100 : 0;
  }
  const whiteCp = turn === 'w' ? (cp ?? 0) : -(cp ?? 0);
  const raw = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * whiteCp)) - 1);
  return Number(Math.max(0, Math.min(100, raw)).toFixed(2));
}

function formatEvalText(scoreCp: number | null, mateIn: number | null, turn: Color): string {
  if (mateIn !== null) {
    const sign = (turn === 'w' ? mateIn : -mateIn) > 0 ? '+' : '-';
    return `${sign}M${Math.abs(mateIn)}`;
  }
  const whiteCp = turn === 'w' ? (scoreCp ?? 0) : -(scoreCp ?? 0);
  const pawns = whiteCp / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

function getAttackersOfSquare(chess: Chess, targetSq: Square, attackerColor: Color): TacticalPieceRef[] {
  const result: TacticalPieceRef[] = [];
  for (const file of FILES) {
    for (const rank of RANKS) {
      const sq = `${file}${rank}` as Square;
      const piece = chess.get(sq);
      if (!piece || piece.color !== attackerColor) continue;
      if (canPieceAttackSquare(chess, sq, piece.type, attackerColor, targetSq)) {
        result.push({
          square: sq,
          piece: piece.type,
          color: attackerColor,
          value: PIECE_VALUES[piece.type],
        });
      }
    }
  }
  return result;
}

function canPieceAttackSquare(
  chess: Chess,
  from: Square,
  type: PieceSymbol,
  color: Color,
  target: Square,
): boolean {
  if (from === target) return false;
  const fx = FILES.indexOf(from[0] as (typeof FILES)[number]);
  const fy = RANKS.indexOf(from[1] as (typeof RANKS)[number]);
  const tx = FILES.indexOf(target[0] as (typeof FILES)[number]);
  const ty = RANKS.indexOf(target[1] as (typeof RANKS)[number]);
  const dx = tx - fx;
  const dy = ty - fy;

  if (type === 'p') {
    const dir = color === 'w' ? 1 : -1;
    return dy === dir && Math.abs(dx) === 1;
  }
  if (type === 'n') {
    return (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
  }
  if (type === 'k') {
    return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
  }

  const isDiag = Math.abs(dx) === Math.abs(dy);
  const isOrtho = dx === 0 || dy === 0;
  if (type === 'b' && !isDiag) return false;
  if (type === 'r' && !isOrtho) return false;
  if (type === 'q' && !isDiag && !isOrtho) return false;

  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  let cx = fx + stepX;
  let cy = fy + stepY;
  while (cx !== tx || cy !== ty) {
    const midSq = `${FILES[cx]}${RANKS[cy]}` as Square;
    if (chess.get(midSq)) return false;
    cx += stepX;
    cy += stepY;
  }
  return true;
}

function detectPinsAndSkewers(chess: Chess): TacticalRelation[] {
  const relations: TacticalRelation[] = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];

  for (const file of FILES) {
    for (const rank of RANKS) {
      const sq = `${file}${rank}` as Square;
      const attacker = chess.get(sq);
      if (!attacker || (attacker.type !== 'b' && attacker.type !== 'r' && attacker.type !== 'q')) {
        continue;
      }
      const fx = FILES.indexOf(file);
      const fy = RANKS.indexOf(rank);

      for (const [dx, dy] of dirs) {
        const isDiag = dx !== 0 && dy !== 0;
        if (attacker.type === 'b' && !isDiag) continue;
        if (attacker.type === 'r' && isDiag) continue;

        let cx = fx + dx!;
        let cy = fy + dy!;
        const encountered: Array<{ sq: Square; color: Color; type: PieceSymbol }> = [];

        while (cx >= 0 && cx < 8 && cy >= 0 && cy < 8 && encountered.length < 2) {
          const curSq = `${FILES[cx]}${RANKS[cy]}` as Square;
          const occ = chess.get(curSq);
          if (occ) {
            encountered.push({ sq: curSq, color: occ.color, type: occ.type });
          }
          cx += dx!;
          cy += dy!;
        }

        if (
          encountered.length === 2 &&
          encountered[0]!.color !== attacker.color &&
          encountered[1]!.color !== attacker.color
        ) {
          const front = encountered[0]!;
          const back = encountered[1]!;
          if (back.type === 'k' || PIECE_VALUES[back.type] > PIECE_VALUES[front.type]) {
            relations.push({
              type: 'pin',
              attackerSquare: sq,
              attackerPiece: attacker.type,
              targetSquares: [front.sq, back.sq],
              description: `${PIECE_NAMES[attacker.type]} on ${sq} pins ${PIECE_NAMES[front.type]} on ${front.sq} to ${PIECE_NAMES[back.type]} on ${back.sq}`,
            });
          } else if (
            front.type === 'k' ||
            (PIECE_VALUES[front.type] >= 5 && PIECE_VALUES[back.type] >= 3)
          ) {
            relations.push({
              type: 'skewer',
              attackerSquare: sq,
              attackerPiece: attacker.type,
              targetSquares: [front.sq, back.sq],
              description: `${PIECE_NAMES[attacker.type]} on ${sq} skewers ${PIECE_NAMES[front.type]} on ${front.sq} and ${PIECE_NAMES[back.type]} on ${back.sq}`,
            });
          }
        }
      }
    }
  }
  return relations;
}

export interface BuildFactsOptions {
  fen: string;
  evaluation?: EngineEvaluation | null;
  openingEco?: string | null;
  openingName?: string | null;
  selectedSquare?: Square | null;
  playedMoveContext?: PositionFacts['playedMoveContext'];
}

export function buildPositionFacts(opts: BuildFactsOptions): PositionFacts {
  const chess = new Chess(opts.fen);
  const turn = chess.turn();
  const fullMoveNumber = Number(opts.fen.split(' ')[5] ?? '1') || 1;
  const legalMovesVerbose = chess.moves({ verbose: true }) as Move[];
  const legalMovesSan = legalMovesVerbose.map((m) => m.san);

  let materialWhite = 0;
  let materialBlack = 0;
  let nonPawnMaterial = 0;
  const whitePawnsByFile = new Map<number, number[]>();
  const blackPawnsByFile = new Map<number, number[]>();
  const hangingPieces: TacticalPieceRef[] = [];
  const tactics: TacticalRelation[] = [];

  let whiteKingSq: Square = 'e1';
  let blackKingSq: Square = 'e8';

  for (let fx = 0; fx < 8; fx++) {
    for (let fy = 0; fy < 8; fy++) {
      const sq = `${FILES[fx]}${RANKS[fy]}` as Square;
      const piece = chess.get(sq);
      if (!piece) continue;

      const val = PIECE_VALUES[piece.type];
      if (piece.color === 'w') {
        materialWhite += val;
        if (piece.type !== 'p' && piece.type !== 'k') nonPawnMaterial += val;
        if (piece.type === 'p') {
          const arr = whitePawnsByFile.get(fx) ?? [];
          arr.push(fy);
          whitePawnsByFile.set(fx, arr);
        }
        if (piece.type === 'k') whiteKingSq = sq;
      } else {
        materialBlack += val;
        if (piece.type !== 'p' && piece.type !== 'k') nonPawnMaterial += val;
        if (piece.type === 'p') {
          const arr = blackPawnsByFile.get(fx) ?? [];
          arr.push(fy);
          blackPawnsByFile.set(fx, arr);
        }
        if (piece.type === 'k') blackKingSq = sq;
      }

      if (piece.type !== 'k') {
        const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
        const attackers = getAttackersOfSquare(chess, sq, enemyColor);
        const defenders = getAttackersOfSquare(chess, sq, piece.color);

        if (attackers.length > 0 && defenders.length === 0) {
          hangingPieces.push({
            square: sq,
            piece: piece.type,
            color: piece.color,
            value: val,
          });
          tactics.push({
            type: 'hanging',
            attackerSquare: attackers[0]!.square,
            attackerPiece: attackers[0]!.piece,
            targetSquares: [sq],
            description: `Undefended ${PIECE_NAMES[piece.type]} on ${sq} attacked by ${PIECE_NAMES[attackers[0]!.piece]} on ${attackers[0]!.square}`,
          });
        } else if (attackers.some((a) => a.value < val)) {
          const minorAttacker = attackers.find((a) => a.value < val)!;
          tactics.push({
            type: 'lower_value_attack',
            attackerSquare: minorAttacker.square,
            attackerPiece: minorAttacker.piece,
            targetSquares: [sq],
            description: `${PIECE_NAMES[piece.type]} on ${sq} is attacked by lower-value ${PIECE_NAMES[minorAttacker.piece]} on ${minorAttacker.square}`,
          });
        }

        // Fork check: piece currently attacks 2+ higher/undefended enemy pieces
        const attackedTargets: Square[] = [];
        for (const tFile of FILES) {
          for (const tRank of RANKS) {
            const tSq = `${tFile}${tRank}` as Square;
            const target = chess.get(tSq);
            if (!target || target.color === piece.color) continue;
            if (canPieceAttackSquare(chess, sq, piece.type, piece.color, tSq)) {
              if (target.type === 'k' || PIECE_VALUES[target.type] > val) {
                attackedTargets.push(tSq);
              }
            }
          }
        }
        if (attackedTargets.length >= 2) {
          tactics.push({
            type: 'fork',
            attackerSquare: sq,
            attackerPiece: piece.type,
            targetSquares: attackedTargets,
            description: `${PIECE_NAMES[piece.type]} on ${sq} forks targets on ${attackedTargets.join(' and ')}`,
          });
        }
      }
    }
  }

  tactics.push(...detectPinsAndSkewers(chess));

  // Pawn structure & open files
  let isolatedWhite = 0;
  let isolatedBlack = 0;
  let doubledWhite = 0;
  let doubledBlack = 0;
  const passedWhite: Square[] = [];
  const passedBlack: Square[] = [];
  const openFiles: string[] = [];
  const halfOpenFilesWhite: string[] = [];
  const halfOpenFilesBlack: string[] = [];

  for (let fx = 0; fx < 8; fx++) {
    const wp = whitePawnsByFile.get(fx) ?? [];
    const bp = blackPawnsByFile.get(fx) ?? [];
    const fileChar = FILES[fx]!;

    if (wp.length === 0 && bp.length === 0) openFiles.push(fileChar);
    else if (wp.length === 0) halfOpenFilesWhite.push(fileChar);
    else if (bp.length === 0) halfOpenFilesBlack.push(fileChar);

    if (wp.length > 1) doubledWhite += wp.length - 1;
    if (bp.length > 1) doubledBlack += bp.length - 1;

    const adjWhite = (whitePawnsByFile.get(fx - 1)?.length ?? 0) + (whitePawnsByFile.get(fx + 1)?.length ?? 0);
    const adjBlack = (blackPawnsByFile.get(fx - 1)?.length ?? 0) + (blackPawnsByFile.get(fx + 1)?.length ?? 0);
    if (wp.length > 0 && adjWhite === 0) isolatedWhite += wp.length;
    if (bp.length > 0 && adjBlack === 0) isolatedBlack += bp.length;

    for (const rankIdx of wp) {
      let blocked = false;
      for (let checkF = Math.max(0, fx - 1); checkF <= Math.min(7, fx + 1); checkF++) {
        for (const bRank of blackPawnsByFile.get(checkF) ?? []) {
          if (bRank > rankIdx) blocked = true;
        }
      }
      if (!blocked) passedWhite.push(`${fileChar}${RANKS[rankIdx]}` as Square);
    }

    for (const rankIdx of bp) {
      let blocked = false;
      for (let checkF = Math.max(0, fx - 1); checkF <= Math.min(7, fx + 1); checkF++) {
        for (const wRank of whitePawnsByFile.get(checkF) ?? []) {
          if (wRank < rankIdx) blocked = true;
        }
      }
      if (!blocked) passedBlack.push(`${fileChar}${RANKS[rankIdx]}` as Square);
    }
  }

  const countIslands = (map: Map<number, number[]>) => {
    let islands = 0;
    let inIsland = false;
    for (let fx = 0; fx < 8; fx++) {
      if ((map.get(fx)?.length ?? 0) > 0) {
        if (!inIsland) {
          islands++;
          inIsland = true;
        }
      } else {
        inIsland = false;
      }
    }
    return islands;
  };

  // Phase detection
  const phase: PositionFacts['phase'] =
    nonPawnMaterial <= 24 ? 'endgame' : fullMoveNumber <= 12 && nonPawnMaterial >= 52 ? 'opening' : 'middlegame';

  // King safety & castling
  const whiteCastled = whiteKingSq === 'g1' || whiteKingSq === 'c1';
  const blackCastled = blackKingSq === 'g8' || blackKingSq === 'c8';
  const whiteKingSafety = (whiteCastled ? 30 : 0) - getAttackersOfSquare(chess, whiteKingSq, 'b').length * 15;
  const blackKingSafety = (blackCastled ? 30 : 0) - getAttackersOfSquare(chess, blackKingSq, 'w').length * 15;

  // Back-rank weakness
  const backRankWeaknessWhite =
    whiteKingSq[1] === '1' &&
    ['f2', 'g2', 'h2'].every((s) => chess.get(s as Square)?.type === 'p');
  const backRankWeaknessBlack =
    blackKingSq[1] === '8' &&
    ['f7', 'g7', 'h7'].every((s) => chess.get(s as Square)?.type === 'p');

  // Development & center control
  let devWhite = 0;
  let devBlack = 0;
  for (const sq of ['b1', 'c1', 'f1', 'g1'] as Square[]) {
    if (!chess.get(sq)) devWhite++;
  }
  for (const sq of ['b8', 'c8', 'f8', 'g8'] as Square[]) {
    if (!chess.get(sq)) devBlack++;
  }

  let centerDiff = 0;
  for (const sq of CENTER_SQUARES) {
    centerDiff += getAttackersOfSquare(chess, sq, 'w').length - getAttackersOfSquare(chess, sq, 'b').length;
  }

  const availableChecksSan = legalMovesVerbose
    .filter((m) => m.san.includes('+') || m.san.includes('#'))
    .map((m) => m.san);

  // Selected piece / square insight
  let selectedPieceInsight: PieceSquareInsight | null = null;
  if (opts.selectedSquare && /^[a-h][1-8]$/.test(opts.selectedSquare)) {
    const sq = opts.selectedSquare as Square;
    const p = chess.get(sq);
    if (p) {
      const pieceMoves = legalMovesVerbose.filter((m) => m.from === sq);
      const destinations = pieceMoves.map((m) => m.to);
      const bestMoveFromSq = pieceMoves.find(
        (m) => `${m.from}${m.to}${m.promotion ?? ''}` === opts.evaluation?.bestMoveUci,
      );
      const safeDests = pieceMoves.filter(
        (m) => getAttackersOfSquare(chess, m.to, p.color === 'w' ? 'b' : 'w').length === 0,
      );
      const riskyDests = pieceMoves.filter(
        (m) => getAttackersOfSquare(chess, m.to, p.color === 'w' ? 'b' : 'w').length > 0,
      );

      const isAttacked = getAttackersOfSquare(chess, sq, p.color === 'w' ? 'b' : 'w').length > 0;
      const isDefended = getAttackersOfSquare(chess, sq, p.color).length > 0;
      const bestDest = bestMoveFromSq?.to ?? safeDests[0]?.to ?? destinations[0] ?? null;
      const worstDest = riskyDests[riskyDests.length - 1]?.to ?? null;

      selectedPieceInsight = {
        square: sq,
        piece: p.type,
        color: p.color,
        legalDestinations: destinations,
        bestDestination: bestDest,
        worstDestination: worstDest,
        isAttacked,
        isDefended,
        summary: `${p.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[p.type]} on ${sq} has ${destinations.length} legal move(s), is ${isAttacked ? 'attacked' : 'not attacked'}, and is ${isDefended ? 'defended' : 'undefended'}.`,
      };
    }
  }

  const topLine = opts.evaluation?.lines[0];
  const evalCp = topLine?.scoreCp ?? null;
  const mateIn = topLine?.mateIn ?? null;

  return {
    fen: opts.fen,
    turn,
    fullMoveNumber,
    phase,
    evalCp,
    mateIn,
    winProbWhite: winProbabilityFromCp(evalCp, mateIn, turn),
    depth: opts.evaluation?.depth ?? 0,
    bestMoveSan: opts.evaluation?.bestMoveSan ?? legalMovesSan[0] ?? '',
    bestMoveUci: opts.evaluation?.bestMoveUci ?? '',
    topLines: (opts.evaluation?.lines ?? []).slice(0, 4).map((line) => ({
      san: line.pvSan[0] ?? line.pvUci[0] ?? '',
      evalText: formatEvalText(line.scoreCp, line.mateIn, turn),
      pvSan: line.pvSan.slice(0, 6),
    })),
    materialWhite,
    materialBlack,
    materialDiff: materialWhite - materialBlack,
    hangingPieces,
    tactics,
    backRankWeaknessWhite,
    backRankWeaknessBlack,
    mateThreatAgainstMover: topLine?.mateIn !== null && (topLine?.mateIn ?? 0) < 0,
    availableChecksSan,
    pawnStructure: {
      isolatedWhite,
      isolatedBlack,
      doubledWhite,
      doubledBlack,
      passedWhite,
      passedBlack,
      islandsWhite: countIslands(whitePawnsByFile),
      islandsBlack: countIslands(blackPawnsByFile),
    },
    openFiles,
    halfOpenFilesWhite,
    halfOpenFilesBlack,
    kingSafety: {
      whiteScore: whiteKingSafety,
      blackScore: blackKingSafety,
      whiteCastled,
      blackCastled,
    },
    developmentDiff: devWhite - devBlack,
    centerControlDiff: centerDiff,
    openingEco: opts.openingEco ?? null,
    openingName: opts.openingName ?? null,
    legalMovesSan,
    selectedPieceInsight,
    selectedSquare: opts.selectedSquare ?? null,
    playedMoveContext: opts.playedMoveContext ?? null,
  };
}
