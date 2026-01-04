import type { TournamentType } from "./constants";

// Player stored in database
export interface Player {
  id: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
  guestExpiresAt: number | null;

  // ELO ratings per tournament type
  eloBullet: number;
  eloBlitz: number;
  eloRapid: number;
  eloClassical: number;

  // Aggregate stats
  totalGames: number;
  totalWins: number;
  totalDraws: number;
  totalLosses: number;

  // Timestamps
  createdAt: number;
  lastActiveAt: number;

  // Flags
  isBanned: boolean;
  banReason: string | null;
}

// Player info for API responses
export interface PlayerProfile {
  id: string;
  displayName: string;
  isGuest: boolean;
  ratings: Record<TournamentType, number>;
  stats: {
    totalGames: number;
    totalWins: number;
    totalDraws: number;
    totalLosses: number;
    winRate: number;
  };
  createdAt: number;
  lastActiveAt: number;
}

// ELO ratings stored in JWT for guest sessions
export interface EloRatings {
  bullet: number;
  blitz: number;
  rapid: number;
  classical: number;
}

// JWT payload (includes ELO for guest-only mode)
export interface AuthPayload {
  playerId: string;
  displayName: string;
  elo: EloRatings;
  exp?: number;
  iat?: number;
}

// Auth responses
export interface AuthResponse {
  token: string;
  playerId: string;
  displayName: string;
  isGuest: boolean;
  expiresAt?: number;
}

// Registration/login requests
export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Leaderboard entry
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  elo: number;
  gamesPlayed: number;
  winRate: number;
}

// Player stats per tournament type
export interface PlayerTournamentStats {
  tournamentType: TournamentType;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  elo: number;
  peakElo: number;
  winStreak: number;
  bestWinStreak: number;
}

// Game history entry
export interface GameHistoryEntry {
  id: string;
  tournamentType: TournamentType;
  opponent: {
    id: string;
    displayName: string;
    isBot: boolean;
  };
  yourColor: "white" | "black";
  result: "win" | "loss" | "draw";
  resultReason: string;
  eloChange: number;
  eloBefore: number;
  eloAfter: number;
  moveCount: number;
  durationMs: number;
  playedAt: number;
}
