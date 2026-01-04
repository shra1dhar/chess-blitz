-- ==============================================
-- Chess Blitz - Add 1min Hyper Bullet Support
-- ==============================================

-- Add elo_1min column to players table
ALTER TABLE players ADD COLUMN elo_1min INTEGER DEFAULT 1200;

-- Create index for 1min elo
CREATE INDEX IF NOT EXISTS idx_players_elo_1min ON players(elo_1min DESC);

-- Note: SQLite doesn't support modifying CHECK constraints directly
-- The existing CHECK constraints on active_games, game_history, and leaderboard
-- will need to be recreated if strict enforcement is needed.
-- For now, the application code validates tournament types.
