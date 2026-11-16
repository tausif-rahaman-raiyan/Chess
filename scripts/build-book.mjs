import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const ROOT = process.cwd();
const OUT_PATH = path.join(ROOT, 'resources', 'book', 'openings.json');

const CURATED_CC0_OPENINGS = [
  { eco: 'A00', name: 'Polish Opening', pgn: '1. b4', games: 18400, w: 35, d: 27, b: 38 },
  { eco: 'A04', name: 'Zukertort Opening', pgn: '1. Nf3', games: 142000, w: 38, d: 34, b: 28 },
  { eco: 'A10', name: 'English Opening', pgn: '1. c4', games: 310000, w: 39, d: 33, b: 28 },
  { eco: 'A20', name: 'English Opening: Reversed Sicilian', pgn: '1. c4 e5', games: 98000, w: 38, d: 34, b: 28 },
  { eco: 'A45', name: 'Indian Defense', pgn: '1. d4 Nf6', games: 890000, w: 38, d: 34, b: 28 },
  { eco: 'B00', name: "King's Pawn Game", pgn: '1. e4', games: 1450000, w: 38, d: 31, b: 31 },
  { eco: 'B01', name: 'Scandinavian Defense', pgn: '1. e4 d5', games: 165000, w: 40, d: 29, b: 31 },
  { eco: 'B07', name: 'Pirc Defense', pgn: '1. e4 d6 2. d4 Nf6 3. Nc3', games: 112000, w: 40, d: 30, b: 30 },
  { eco: 'B10', name: 'Caro-Kann Defense', pgn: '1. e4 c6', games: 295000, w: 37, d: 34, b: 29 },
  { eco: 'B12', name: 'Caro-Kann Defense: Advance Variation', pgn: '1. e4 c6 2. d4 d5 3. e5', games: 118000, w: 38, d: 33, b: 29 },
  { eco: 'B20', name: 'Sicilian Defense', pgn: '1. e4 c5', games: 940000, w: 37, d: 31, b: 32 },
  { eco: 'B22', name: 'Sicilian Defense: Alapin Variation', pgn: '1. e4 c5 2. c3', games: 134000, w: 38, d: 32, b: 30 },
  { eco: 'B33', name: 'Sicilian Defense: Sveshnikov Variation', pgn: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 e5', games: 76000, w: 37, d: 35, b: 28 },
  { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation', pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6', games: 215000, w: 37, d: 33, b: 30 },
  { eco: 'C00', name: 'French Defense', pgn: '1. e4 e6', games: 340000, w: 38, d: 32, b: 30 },
  { eco: 'C02', name: 'French Defense: Advance Variation', pgn: '1. e4 e6 2. d4 d5 3. e5', games: 128000, w: 38, d: 31, b: 31 },
  { eco: 'C20', name: "King's Pawn Game: Open Game", pgn: '1. e4 e5', games: 820000, w: 38, d: 32, b: 30 },
  { eco: 'C42', name: "Petrov's Defense", pgn: '1. e4 e5 2. Nf3 Nf6', games: 115000, w: 37, d: 38, b: 25 },
  { eco: 'C44', name: 'Scotch Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4', games: 96000, w: 39, d: 32, b: 29 },
  { eco: 'C50', name: 'Italian Game', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4', games: 390000, w: 38, d: 32, b: 30 },
  { eco: 'C53', name: 'Italian Game: Giuoco Piano', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3', games: 145000, w: 38, d: 33, b: 29 },
  { eco: 'C60', name: 'Ruy Lopez', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5', games: 460000, w: 39, d: 34, b: 27 },
  { eco: 'C65', name: 'Ruy Lopez: Berlin Defense', pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6', games: 132000, w: 37, d: 39, b: 24 },
  { eco: 'D00', name: "Queen's Pawn Game", pgn: '1. d4 d5', games: 610000, w: 39, d: 34, b: 27 },
  { eco: 'D02', name: 'London System', pgn: '1. d4 d5 2. Nf3 Nf6 3. Bf4', games: 185000, w: 39, d: 33, b: 28 },
  { eco: 'D06', name: "Queen's Gambit", pgn: '1. d4 d5 2. c4', games: 480000, w: 40, d: 34, b: 26 },
  { eco: 'D30', name: "Queen's Gambit Declined", pgn: '1. d4 d5 2. c4 e6', games: 240000, w: 40, d: 35, b: 25 },
  { eco: 'D37', name: "Queen's Gambit Declined: Classical", pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Nf3', games: 158000, w: 40, d: 36, b: 24 },
  { eco: 'D85', name: 'Grünfeld Defense: Exchange Variation', pgn: '1. d4 Nf6 2. c4 g6 3. Nc3 d5 4. cxd5 Nxd5', games: 94000, w: 39, d: 36, b: 25 },
  { eco: 'E00', name: 'Catalan Opening', pgn: '1. d4 Nf6 2. c4 e6 3. g3', games: 124000, w: 41, d: 35, b: 24 },
  { eco: 'E20', name: 'Nimzo-Indian Defense', pgn: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4', games: 192000, w: 38, d: 36, b: 26 },
  { eco: 'E60', name: "King's Indian Defense", pgn: '1. d4 Nf6 2. c4 g6', games: 210000, w: 40, d: 30, b: 30 },
];

function normalizeFenKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

const positions = {};
for (const entry of CURATED_CC0_OPENINGS) {
  const chess = new Chess();
  const tokens = entry.pgn.replace(/\d+\.(\.\.)?/g, '').trim().split(/\s+/).filter(Boolean);
  for (const san of tokens) {
    const fenBefore = normalizeFenKey(chess.fen());
    if (!positions[fenBefore]) positions[fenBefore] = { eco: entry.eco, name: entry.name, moves: {} };
    const moveObj = chess.move(san);
    if (!moveObj) break;
    const uci = `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ''}`;
    if (!positions[fenBefore].moves[uci]) {
      positions[fenBefore].moves[uci] = {
        san: moveObj.san,
        uci,
        games: entry.games,
        whitePct: entry.w,
        drawPct: entry.d,
        blackPct: entry.b,
      };
    } else {
      positions[fenBefore].moves[uci].games += entry.games;
    }
    const fenAfter = normalizeFenKey(chess.fen());
    positions[fenAfter] = {
      eco: entry.eco,
      name: entry.name,
      moves: positions[fenAfter]?.moves ?? {},
    };
  }
}

const serialized = {};
for (const [fenKey, record] of Object.entries(positions)) {
  serialized[fenKey] = {
    eco: record.eco,
    name: record.name,
    moves: Object.values(record.moves).sort((a, b) => b.games - a.games),
  };
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, `${JSON.stringify(serialized, null, 2)}\n`, 'utf8');
console.log(`Built offline opening book with ${Object.keys(serialized).length} FEN positions.`);
