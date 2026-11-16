import { OfflineDatabase } from '../database';
import { EngineEvaluation, ExplanationResult } from '../../../src/shared/types';

export class AnalysisCacheRepository {
  constructor(private readonly database: OfflineDatabase) {}

  public getCachedAnalysis(
    fen: string,
    multipv: number,
    depth: number,
    engineVersion: string,
  ): EngineEvaluation | null {
    const row = this.database.db
      .prepare(
        `SELECT payload_json FROM analysis_cache
         WHERE fen = ? AND multipv = ? AND depth >= ? AND engine_version = ?
         ORDER BY depth DESC LIMIT 1`,
      )
      .get(fen, multipv, depth, engineVersion) as { payload_json: string } | undefined;

    if (!row) return null;
    try {
      const parsed = JSON.parse(row.payload_json) as EngineEvaluation;
      return { ...parsed, fromCache: true };
    } catch {
      return null;
    }
  }

  public putCachedAnalysis(evalResult: EngineEvaluation): void {
    this.database.db
      .prepare(
        `INSERT INTO analysis_cache (fen, multipv, depth, engine_version, payload_json, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(fen, multipv, depth, engine_version)
         DO UPDATE SET payload_json = excluded.payload_json, updated_at = datetime('now')`,
      )
      .run(
        evalResult.fen,
        Math.max(1, evalResult.lines.length),
        evalResult.depth,
        evalResult.engineVersion,
        JSON.stringify(evalResult),
      );
  }

  public getCachedExplanation(cacheKey: string): ExplanationResult | null {
    const row = this.database.db
      .prepare('SELECT payload_json FROM explanation_cache WHERE cache_key = ?')
      .get(cacheKey) as { payload_json: string } | undefined;

    if (!row) return null;
    try {
      const parsed = JSON.parse(row.payload_json) as ExplanationResult;
      return { ...parsed, cached: true };
    } catch {
      return null;
    }
  }

  public putCachedExplanation(cacheKey: string, result: ExplanationResult): void {
    this.database.db
      .prepare(
        `INSERT INTO explanation_cache (cache_key, payload_json, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(cache_key)
         DO UPDATE SET payload_json = excluded.payload_json, updated_at = datetime('now')`,
      )
      .run(cacheKey, JSON.stringify(result));
  }

  public clearCaches(): void {
    this.database.db.exec('DELETE FROM analysis_cache; DELETE FROM explanation_cache;');
  }
}
