CREATE INDEX IF NOT EXISTS idx_games_date ON games(date DESC);
CREATE INDEX IF NOT EXISTS idx_games_result ON games(result);
CREATE INDEX IF NOT EXISTS idx_games_opening ON games(opening_eco, opening_name);
CREATE INDEX IF NOT EXISTS idx_games_accuracy ON games(accuracy_me DESC);
CREATE INDEX IF NOT EXISTS idx_games_autosave ON games(is_autosave);
CREATE INDEX IF NOT EXISTS idx_moves_game_ply ON moves(game_id, ply ASC);
