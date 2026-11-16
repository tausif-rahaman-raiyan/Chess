import { OfflineDatabase } from '../database';
import { RecordedMove, SavedGameRecord, SaveGamePayload } from '../../../src/shared/types';

interface GameRow {
  id: number;
  pgn: string;
  white: string;
  black: string;
  result: string;
  date: string;
  time_control: string;
  my_color: 'w' | 'b';
  opponent_rating: number;
  opening_eco: string;
  opening_name: string;
  accuracy_me: number | null;
  created_at: string;
  notes: string;
  favorite: number;
  is_autosave: number;
}

interface MoveRow {
  ply: number;
  san: string;
  uci: string;
  fen_after: string;
  eval_cp: number | null;
  mate: number | null;
  win_prob: number;
  best_move: string | null;
  classification: RecordedMove['classification'];
  time_ms: number;
}

function mapGameRow(row: GameRow): SavedGameRecord {
  return {
    id: row.id,
    pgn: row.pgn,
    white: row.white,
    black: row.black,
    result: row.result,
    date: row.date,
    timeControl: row.time_control,
    myColor: row.my_color,
    opponentRating: row.opponent_rating,
    openingEco: row.opening_eco,
    openingName: row.opening_name,
    accuracyMe: row.accuracy_me,
    createdAt: row.created_at,
    notes: row.notes,
    favorite: row.favorite === 1,
    isAutosave: row.is_autosave === 1,
  };
}

export class GamesRepository {
  constructor(private readonly database: OfflineDatabase) {}

  public saveGame(payload: SaveGamePayload): SavedGameRecord {
    const db = this.database.db;

    const tx = db.transaction((): number => {
      let targetId = payload.id;

      if (payload.isAutosave && !targetId) {
        const existingAuto = db
          .prepare('SELECT id FROM games WHERE is_autosave = 1 LIMIT 1')
          .get() as { id: number } | undefined;
        if (existingAuto) {
          targetId = existingAuto.id;
        }
      }

      if (targetId) {
        db.prepare(
          `UPDATE games SET
            pgn = ?, white = ?, black = ?, result = ?, date = ?,
            time_control = ?, my_color = ?, opponent_rating = ?,
            opening_eco = ?, opening_name = ?, accuracy_me = ?,
            notes = ?, favorite = ?, is_autosave = ?
           WHERE id = ?`,
        ).run(
          payload.pgn,
          payload.white,
          payload.black,
          payload.result,
          payload.date,
          payload.timeControl,
          payload.myColor,
          payload.opponentRating,
          payload.openingEco,
          payload.openingName,
          payload.accuracyMe,
          payload.notes,
          payload.favorite ? 1 : 0,
          payload.isAutosave ? 1 : 0,
          targetId,
        );
        db.prepare('DELETE FROM moves WHERE game_id = ?').run(targetId);
      } else {
        const info = db
          .prepare(
            `INSERT INTO games (
              pgn, white, black, result, date, time_control, my_color,
              opponent_rating, opening_eco, opening_name, accuracy_me,
              notes, favorite, is_autosave
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            payload.pgn,
            payload.white,
            payload.black,
            payload.result,
            payload.date,
            payload.timeControl,
            payload.myColor,
            payload.opponentRating,
            payload.openingEco,
            payload.openingName,
            payload.accuracyMe,
            payload.notes,
            payload.favorite ? 1 : 0,
            payload.isAutosave ? 1 : 0,
          );
        targetId = Number(info.lastInsertRowid);
      }

      const insertMove = db.prepare(
        `INSERT INTO moves (
          game_id, ply, san, uci, fen_after, eval_cp, mate,
          win_prob, best_move, classification, time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      for (const m of payload.moves) {
        insertMove.run(
          targetId,
          m.ply,
          m.san,
          m.uci,
          m.fenAfter,
          m.evalCp,
          m.mate,
          m.winProb,
          m.bestMove,
          m.classification,
          m.timeMs,
        );
      }

      return targetId;
    });

    const savedId = tx();
    const record = this.getGameById(savedId);
    if (!record) {
      throw new Error('Failed to load saved game record after insert.');
    }
    return record;
  }

  public listGames(includeAutosave = false): SavedGameRecord[] {
    const rows = this.database.db
      .prepare(
        `SELECT * FROM games
         ${includeAutosave ? '' : 'WHERE is_autosave = 0'}
         ORDER BY favorite DESC, created_at DESC, id DESC`,
      )
      .all() as GameRow[];
    return rows.map(mapGameRow);
  }

  public getGameById(id: number): SavedGameRecord | null {
    const row = this.database.db.prepare('SELECT * FROM games WHERE id = ?').get(id) as
      | GameRow
      | undefined;
    if (!row) return null;

    const moveRows = this.database.db
      .prepare('SELECT * FROM moves WHERE game_id = ? ORDER BY ply ASC')
      .all(id) as MoveRow[];

    const record = mapGameRow(row);
    record.moves = moveRows.map((m) => ({
      ply: m.ply,
      san: m.san,
      uci: m.uci,
      fenAfter: m.fen_after,
      evalCp: m.eval_cp,
      mate: m.mate,
      winProb: m.win_prob,
      bestMove: m.best_move,
      classification: m.classification,
      timeMs: m.time_ms,
    }));
    return record;
  }

  public getAutosaveGame(): SavedGameRecord | null {
    const row = this.database.db
      .prepare('SELECT id FROM games WHERE is_autosave = 1 ORDER BY id DESC LIMIT 1')
      .get() as { id: number } | undefined;
    if (!row) return null;
    return this.getGameById(row.id);
  }

  public deleteGames(ids: number[]): number {
    if (ids.length === 0) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const info = this.database.db
      .prepare(`DELETE FROM games WHERE id IN (${placeholders})`)
      .run(...ids);
    return info.changes;
  }

  public toggleFavorite(id: number): boolean {
    const row = this.database.db.prepare('SELECT favorite FROM games WHERE id = ?').get(id) as
      | { favorite: number }
      | undefined;
    if (!row) return false;
    const next = row.favorite === 1 ? 0 : 1;
    this.database.db.prepare('UPDATE games SET favorite = ? WHERE id = ?').run(next, id);
    return next === 1;
  }

  public updateNotes(id: number, notes: string): void {
    this.database.db.prepare('UPDATE games SET notes = ? WHERE id = ?').run(notes, id);
  }
}
