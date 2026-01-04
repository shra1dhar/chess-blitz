import type {
  TournamentType,
  GameResult,
  ResultReason,
  Color,
  BotDifficulty,
} from "./constants";

// Player info for a game
export interface GamePlayer {
  id: string;
  displayName: string;
  elo: number;
  isBot: boolean;
  botLevel?: BotDifficulty;
}

// Full game state (server-side)
export interface GameState {
  gameId: string;
  tournamentType: TournamentType;

  // Players
  white: GamePlayer;
  black: GamePlayer;

  // Board state
  fen: string;
  pgn: string;
  moveHistory: MoveInfo[];

  // Clock
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: number;
  increment: number;

  // Game status
  status: GameStatus;
  turn: Color;
  moveCount: number;

  // Draw/rematch offers
  pendingDrawOffer?: Color;
  pendingRematchOffer?: Color;
  lastDrawOfferAt?: Record<Color, number>; // Cooldown tracking per player

  // Clock pause during disconnect
  clockPausedAt?: number; // When clock was paused due to disconnect
  clockPausedFor?: Color; // Which player's disconnect paused the clock

  // Game end
  result?: GameResult;
  resultReason?: ResultReason;

  // For draw detection
  positionHistory: Map<string, number>;
  halfMoveClock: number;

  // Timestamps
  startedAt: number;
  endedAt?: number;
}

export type GameStatus = "waiting" | "active" | "paused" | "finished";

// Move info
export interface MoveInfo {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fen: string;
  isCheck: boolean;
  isCheckmate: boolean;
  capturedPiece?: string;
  timestamp: number;
}

// Client-facing game state (serialized)
export interface SerializedGameState {
  gameId: string;
  tournamentType: TournamentType;
  fen: string;
  pgn: string;
  turn: Color;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveAt: number;
  serverTime: number; // Server timestamp for clock sync
  status: GameStatus;
  moveCount: number;
  moveHistory: MoveInfo[];
  lastMove?: { from: string; to: string };
  pendingDrawOffer?: Color;
  white: {
    id: string;
    displayName: string;
    elo: number;
    isBot: boolean;
  };
  black: {
    id: string;
    displayName: string;
    elo: number;
    isBot: boolean;
  };
}

// Game end result with ELO changes
export interface GameEndResult {
  winner: Color | "draw" | null;
  reason: ResultReason;
  whiteEloChange: number;
  blackEloChange: number;
  whiteEloNew: number;
  blackEloNew: number;
}

// Connection state attached to WebSocket
export interface GameConnectionState {
  playerId: string;
  color: Color;
  rateLimit: RateLimitState;
}

export interface RateLimitState {
  count: number;
  windowStart: number;
}

// Pending timeouts (persisted to storage)
export interface PendingTimeouts {
  disconnectTimeouts: Record<Color, number | null>;
  rematchDeadline: number | null;
  cleanupDeadline: number | null;
  noShowDeadline: number | null;
  bothDisconnectedDeadline: number | null;
}

// Game initialization config
export interface GameInitConfig {
  gameId: string;
  tournamentType: TournamentType;
  white: GamePlayer;
  black: GamePlayer;
}
