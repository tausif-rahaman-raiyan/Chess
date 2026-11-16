import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

export class OfflineDatabase {
  public db: Database.Database;
  public readonly storageDir: string;
  public readonly dbPath: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
    fs.mkdirSync(this.storageDir, { recursive: true });
    this.dbPath = path.join(this.storageDir, 'offlinechess.db');
    this.db = new Database(this.dbPath);
    this.configurePragmas();
    this.runMigrations();
  }

  private configurePragmas(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');
  }

  public runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    const row = this.db.prepare('SELECT MAX(version) as v FROM schema_version').get() as {
      v: number | null;
    };
    const currentVersion = row?.v ?? 0;

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const match = /^(\d+)_/.exec(file);
      if (!match) continue;
      const version = Number(match[1]);
      if (version <= currentVersion) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const apply = this.db.transaction(() => {
        this.db.exec(sql);
        this.db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
      });
      apply();
    }
  }

  public getSchemaVersion(): number {
    const row = this.db.prepare('SELECT MAX(version) as v FROM schema_version').get() as {
      v: number | null;
    };
    return row?.v ?? 0;
  }

  public exportBackupZip(destinationZipPath: string): void {
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    const zip = new AdmZip();
    if (fs.existsSync(this.dbPath)) {
      zip.addLocalFile(this.dbPath);
    }
    const settingsPath = path.join(this.storageDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      zip.addLocalFile(settingsPath);
    }
    zip.writeZip(destinationZipPath);
  }

  public importBackupZip(sourceZipPath: string): void {
    const zip = new AdmZip(sourceZipPath);
    const entries = zip.getEntries();
    const hasDb = entries.some((e) => e.entryName === 'offlinechess.db');
    if (!hasDb) {
      throw new Error('Invalid backup archive: offlinechess.db not found.');
    }

    this.db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const target = `${this.dbPath}${suffix}`;
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }

    zip.extractAllTo(this.storageDir, true);
    this.db = new Database(this.dbPath);
    this.configurePragmas();
    this.runMigrations();
  }

  public clearAllData(): void {
    this.db.exec(`
      DELETE FROM moves;
      DELETE FROM games;
      DELETE FROM analysis_cache;
      DELETE FROM explanation_cache;
      VACUUM;
    `);
  }

  public close(): void {
    try {
      this.db.pragma('wal_checkpoint(PASSIVE)');
      this.db.close();
    } catch {
      // Ignore already closed DB during shutdown
    }
  }
}
