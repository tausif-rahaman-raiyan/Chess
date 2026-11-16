CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pgn TEXT NOT NULL,
  white TEXT NOT NULL,
  black TEXT NOT NULL,
  result TEXT NOT NULL,
  date TEXT NOT NULL,
  time_control TEXT NOT NULL,
  my_color TEXT NOT NULL CHECK (my_color IN ('w', 'b')),
  opponent_rating INTEGER NOT NULL DEFAULT 1200,
  opening_eco TEXT NOT NULL DEFAULT 'A00',
  opening_name TEXT NOT NULL DEFAULT 'Unclassified',
  accuracy_me REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes TEXT NOT NULL DEFAULT '',
  favorite INTEGER NOT NULL DEFAULT 0,
  is_autosave INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  ply INTEGER NOT NULL,
  san TEXT NOT NULL,
  uci TEXT NOT NULL DEFAULT '',
  fen_after TEXT NOT NULL,
  eval_cp INTEGER,
  mate INTEGER,
  win_prob REAL NOT NULL DEFAULT 50.0,
  best_move TEXT,
  classification TEXT,
  time_ms INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analysis_cache (
  fen TEXT NOT NULL,
  multipv INTEGER NOT NULL,
  depth INTEGER NOT NULL,
  engine_version TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (fen, multipv, depth, engine_version)
);

CREATE TABLE IF NOT EXISTS explanation_cache (
  cache_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
