// ==============================================
// Chess Blitz - Multiplayer Types
// ==============================================

import type { Color as ChessColor, Square, PieceSymbol } from 'chess.js';

// ==============================================
// WebSocket Message Type Enums
// ==============================================

/**
 * Client -> Server message types
 * Use these enums instead of string literals for type safety
 */
export enum ClientMessageType {
  // Matchmaking
  JoinQueue = "join_queue",
  LeaveQueue = "leave_queue",
  // Game actions
  Move = "move",
  OfferDraw = "offer_draw",
  AcceptDraw = "accept_draw",
  DeclineDraw = "decline_draw",
  Resign = "resign",
  Abort = "abort",
  ClaimDraw = "claim_draw",
  // Rematch
  OfferRematch = "offer_rematch",
  AcceptRematch = "accept_rematch",
  DeclineRematch = "decline_rematch",
  // Utility
  Ping = "ping",
}

/**
 * Server -> Client message types
 * Use these enums instead of string literals for type safety
 */
export enum ServerMessageType {
  // Connection
  Connected = "connected",
  Error = "error",
  Pong = "pong",
  // Matchmaking
  QueueJoined = "queue_joined",
  QueuePosition = "queue_position",
  QueueLeft = "queue_left",
  MatchFound = "match_found",
  // Game state
  GameStart = "game_start",
  GameState = "game_state",
  MoveMade = "move_made",
  ClockUpdate = "clock_update",
  GameOver = "game_over",
  // Draw handling
  DrawOffered = "draw_offered",
  DrawDeclined = "draw_declined",
  DrawClaimAvailable = "draw_claim_available",
  // Rematch
  RematchOffered = "rematch_offered",
  RematchDeclined = "rematch_declined",
  RematchStarting = "rematch_starting",
  // Disconnect handling
  OpponentDisconnected = "opponent_disconnected",
  OpponentReconnected = "opponent_reconnected",
  // Warnings
  LowTimeWarning = "low_time_warning",
  FiftyMoveWarning = "fifty_move_warning",
}

/**
 * Draw claim reason enum
 */
export enum DrawClaimReason {
  FiftyMove = "fifty_move",
  ThreefoldRepetition = "threefold_repetition",
}

// Tournament types (aligned with backend)
export type TournamentType = 'bullet' | 'blitz' | 'rapid' | 'classical';

export const TOURNAMENT_TIME_MS: Record<TournamentType, number> = {
  bullet: 60_000,
  blitz: 180_000,
  rapid: 300_000,
  classical: 600_000,
};

export const TOURNAMENT_LABELS: Record<TournamentType, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
};

// Color types
export type Color = 'white' | 'black';

// Convert backend color to chess.js color
export function toChessColor(color: Color): ChessColor {
  return color === 'white' ? 'w' : 'b';
}

// Convert chess.js color to backend color
export function fromChessColor(color: ChessColor): Color {
  return color === 'w' ? 'white' : 'black';
}

// ==============================================
// Authentication Types (JWT-based)
// ==============================================

export interface AuthPayload {
  playerId: string;
  displayName: string;
  elo: Record<TournamentType, number>;
  exp?: number;
  iat?: number;
}

export interface AuthResponse {
  token: string;
  playerId: string;
  displayName: string;
  elo: Record<TournamentType, number>;
  expiresAt: number;
}

// ==============================================
// Player Types
// ==============================================

export interface Player {
  id: string;
  displayName: string;
  isGuest: boolean;
  elo: Record<TournamentType, number>;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
  lastActive: number;
}

export interface PlayerInfo {
  id: string;
  displayName: string;
  elo: number;
  isBot?: boolean;
  botLevel?: BotDifficulty;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';

// ==============================================
// Game Types
// ==============================================

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';
export type GameResultReason =
  | 'checkmate'
  | 'timeout'
  | 'resignation'
  | 'stalemate'
  | 'draw_agreement'
  | 'fifty_move'
  | 'seventy_five_move'
  | 'threefold_repetition'
  | 'fivefold_repetition'
  | 'insufficient_material'
  | 'timeout_vs_insufficient'
  | 'abort'
  | 'disconnect'
  | 'no_show';

export type GameStatus = 'waiting' | 'active' | 'paused' | 'finished';

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

export interface GamePlayer {
  id: string;
  displayName: string;
  elo: number;
  isBot: boolean;
  botLevel?: BotDifficulty;
}

// Serialized game state from backend
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
  white: GamePlayer;
  black: GamePlayer;
}

// Frontend-friendly game state (converted from backend)
export interface MultiplayerGameState {
  id: string;
  tournamentType: TournamentType;
  white: PlayerInfo;
  black: PlayerInfo;
  fen: string;
  pgn: string;
  whiteTimeMs: number;
  blackTimeMs: number;
  turn: ChessColor;
  lastMoveAt: number;
  serverTime: number; // Server timestamp for clock sync
  status: GameStatus;
  result?: GameResult;
  resultReason?: GameResultReason;
  lastMove?: { from: Square; to: Square };
}

export interface GameHistoryEntry {
  id: string;
  tournamentType: TournamentType;
  whitePlayerId: string;
  blackPlayerId: string;
  result: GameResult;
  resultReason?: GameResultReason;
  pgn: string;
  whiteEloBefore: number;
  blackEloBefore: number;
  whiteEloAfter: number;
  blackEloAfter: number;
  startedAt: number;
  endedAt: number;
}

// ==============================================
// Matchmaking Types
// ==============================================

export type MatchState = 'idle' | 'queued' | 'matched' | 'playing' | 'ended';

export interface QueueStatus {
  position: number;
  estimatedWait: number;
  tournamentType: TournamentType;
}

// ==============================================
// WebSocket Message Types (using enums for type safety)
// ==============================================

// Sync info sent on reconnection
export interface ReconnectionSyncInfo {
  isReconnection: boolean;
  missedMoveCount: number;
  clockPaused: boolean;
}

// Client -> Server Messages
export type ClientMessage =
  // Matchmaking
  | { type: ClientMessageType.JoinQueue; tournamentType: TournamentType }
  | { type: ClientMessageType.LeaveQueue }
  // Game actions
  | { type: ClientMessageType.Move; from: string; to: string; promotion?: string }
  | { type: ClientMessageType.OfferDraw }
  | { type: ClientMessageType.AcceptDraw }
  | { type: ClientMessageType.DeclineDraw }
  | { type: ClientMessageType.Resign }
  | { type: ClientMessageType.Abort }
  | { type: ClientMessageType.ClaimDraw; reason: DrawClaimReason }
  // Rematch
  | { type: ClientMessageType.OfferRematch }
  | { type: ClientMessageType.AcceptRematch }
  | { type: ClientMessageType.DeclineRematch }
  // Utility
  | { type: ClientMessageType.Ping };

// Server -> Client Messages
export type ServerMessage =
  // Connection
  | { type: ServerMessageType.Connected; playerId: string; displayName: string }
  | { type: ServerMessageType.Error; code: ErrorCode; message: string }
  | { type: ServerMessageType.Pong }
  // Matchmaking
  | {
      type: ServerMessageType.QueueJoined;
      tournamentType: TournamentType;
      position: number;
      estimatedWaitMs: number;
    }
  | { type: ServerMessageType.QueuePosition; position: number; estimatedWaitMs: number }
  | { type: ServerMessageType.QueueLeft }
  | {
      type: ServerMessageType.MatchFound;
      gameId: string;
      opponent: OpponentInfo;
      color: Color;
    }
  // Game state
  | { type: ServerMessageType.GameStart; gameState: SerializedGameState }
  | { type: ServerMessageType.GameState; gameState: SerializedGameState; syncInfo?: ReconnectionSyncInfo }
  | { type: ServerMessageType.MoveMade; move: MoveInfo; gameState: SerializedGameState }
  | { type: ServerMessageType.ClockUpdate; white: number; black: number; serverTime: number; turn: Color; lastMoveAt: number; paused?: boolean }
  | { type: ServerMessageType.GameOver; result: GameEndResult }
  // Draw handling
  | { type: ServerMessageType.DrawOffered; by: Color }
  | { type: ServerMessageType.DrawDeclined }
  | { type: ServerMessageType.DrawClaimAvailable; reason: DrawClaimReason }
  // Rematch
  | { type: ServerMessageType.RematchOffered; by: Color }
  | { type: ServerMessageType.RematchDeclined }
  | { type: ServerMessageType.RematchStarting; gameId: string; yourColor: Color }
  // Disconnect handling
  | { type: ServerMessageType.OpponentDisconnected; timeoutMs: number; clockPaused?: boolean }
  | { type: ServerMessageType.OpponentReconnected }
  // Warnings
  | { type: ServerMessageType.LowTimeWarning; player: Color; timeMs: number }
  | { type: ServerMessageType.FiftyMoveWarning; halfMoves: number };

// ==============================================
// Supporting Types
// ==============================================

export interface OpponentInfo {
  id: string;
  displayName: string;
  elo: number;
  isBot: boolean;
  botLevel?: BotDifficulty;
}

export interface GameEndResult {
  winner: Color | 'draw' | null;
  reason: GameResultReason;
  whiteEloChange: number;
  blackEloChange: number;
  whiteEloNew: number;
  blackEloNew: number;
}

// Error codes
export type ErrorCode =
  // Connection errors
  | 'INVALID_TOKEN'
  | 'CONNECTION_CLOSED'
  | 'RATE_LIMITED'
  | 'MESSAGE_TOO_LARGE'
  | 'INVALID_MESSAGE'
  // Queue errors
  | 'ALREADY_IN_QUEUE'
  | 'NOT_IN_QUEUE'
  | 'QUEUE_FULL'
  | 'INVALID_TOURNAMENT_TYPE'
  // Game errors
  | 'GAME_NOT_FOUND'
  | 'GAME_NOT_ACTIVE'
  | 'NOT_YOUR_TURN'
  | 'INVALID_MOVE'
  | 'INVALID_MOVE_FORMAT'
  | 'NOT_A_PARTICIPANT'
  | 'GAME_ALREADY_STARTED'
  | 'GAME_CANCELLED'
  // Draw errors
  | 'NO_DRAW_OFFER'
  | 'CANNOT_ACCEPT_OWN_DRAW'
  | 'DRAW_ALREADY_OFFERED'
  | 'DRAW_OFFER_COOLDOWN'
  | 'DRAW_NOT_CLAIMABLE'
  // Abort errors
  | 'CANNOT_ABORT'
  // Rematch errors
  | 'NO_REMATCH_OFFER'
  | 'CANNOT_ACCEPT_OWN_REMATCH'
  // Generic
  | 'INTERNAL_ERROR';

// ==============================================
// Elo Types
// ==============================================

export interface EloChanges {
  white: number;
  black: number;
  whiteNew: number;
  blackNew: number;
}

// ==============================================
// Constants
// ==============================================

export const MATCHMAKING_TIMEOUT_MS = 30_000; // 30 seconds before bot fallback
export const RECONNECT_TIMEOUT_MS = 30_000; // 30 seconds to reconnect
export const REMATCH_TIMEOUT_MS = 30_000; // 30 seconds to accept/decline rematch
export const GAME_ROOM_CLEANUP_TIMEOUT_MS = 60_000; // 60 seconds after game ends to cleanup
export const ELO_K_FACTOR = 32;
export const DEFAULT_ELO = 1200;
export const ELO_MATCH_RANGE = 200; // Match players within this Elo range

// Edge case handling constants
export const MAX_QUEUE_SIZE = 500; // Maximum players in matchmaking queue
export const MAX_WAIT_MS = 120_000; // 2 minutes max wait before auto-cancel
export const NO_SHOW_TIMEOUT_MS = 30_000; // 30 seconds for players to connect after match
export const DRAW_OFFER_COOLDOWN_MS = 30_000; // 30 seconds between draw offers
export const BOTH_DISCONNECT_DRAW_MS = 60_000; // 60 seconds before draw if both disconnect
export const MESSAGE_RATE_LIMIT_PER_SEC = 10; // Max WebSocket messages per second
export const MAX_MESSAGE_SIZE_BYTES = 10 * 1024; // 10KB max message size
export const JOIN_RATE_LIMIT_PER_MIN = 5; // Max queue joins per minute per player
