-- ==============================================
-- Chess Blitz - Database Schema
-- Multiplayer tournament system tables
-- ==============================================

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  is_guest INTEGER DEFAULT 0,
  elo_3min INTEGER DEFAULT 1200,
  elo_5min INTEGER DEFAULT 1200,
  elo_10min INTEGER DEFAULT 1200,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL
);

-- Active games (for reconnection support)
CREATE TABLE IF NOT EXISTS active_games (
  id TEXT PRIMARY KEY,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('3min', '5min', '10min')),
  white_player_id TEXT NOT NULL,
  black_player_id TEXT NOT NULL,
  fen TEXT NOT NULL,
  pgn TEXT,
  white_time_ms INTEGER NOT NULL,
  black_time_ms INTEGER NOT NULL,
  turn TEXT NOT NULL CHECK (turn IN ('w', 'b')),
  started_at INTEGER NOT NULL,
  last_move_at INTEGER NOT NULL,
  FOREIGN KEY (white_player_id) REFERENCES players(id),
  FOREIGN KEY (black_player_id) REFERENCES players(id)
);

-- Game history
CREATE TABLE IF NOT EXISTS game_history (
  id TEXT PRIMARY KEY,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('3min', '5min', '10min')),
  white_player_id TEXT NOT NULL,
  black_player_id TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('white', 'black', 'draw')),
  result_reason TEXT CHECK (result_reason IN ('checkmate', 'timeout', 'resign', 'stalemate', 'draw', 'disconnect')),
  pgn TEXT NOT NULL,
  white_elo_before INTEGER,
  black_elo_before INTEGER,
  white_elo_after INTEGER,
  black_elo_after INTEGER,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  FOREIGN KEY (white_player_id) REFERENCES players(id),
  FOREIGN KEY (black_player_id) REFERENCES players(id)
);

-- Leaderboard (materialized view updated on game end)
CREATE TABLE IF NOT EXISTS leaderboard (
  player_id TEXT NOT NULL,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('3min', '5min', '10min')),
  elo INTEGER NOT NULL,
  rank INTEGER,
  PRIMARY KEY (player_id, tournament_type),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_elo_3min ON players(elo_3min DESC);
CREATE INDEX IF NOT EXISTS idx_players_elo_5min ON players(elo_5min DESC);
CREATE INDEX IF NOT EXISTS idx_players_elo_10min ON players(elo_10min DESC);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON game_history(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON game_history(black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_ended_at ON game_history(ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_active_games_white ON active_games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_active_games_black ON active_games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_elo ON leaderboard(tournament_type, elo DESC);
