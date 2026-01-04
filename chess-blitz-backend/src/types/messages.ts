import type { TournamentType, Color, ResultReason, BotDifficulty } from "./constants";
import type { SerializedGameState, MoveInfo, GameEndResult } from "./game";

// ============================================
// WebSocket Message Type Enums
// ============================================

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

// ============================================
// Client -> Server Messages
// ============================================

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

// ============================================
// Server -> Client Messages
// ============================================

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

// ============================================
// Supporting Types
// ============================================

export interface OpponentInfo {
  id: string;
  displayName: string;
  elo: number;
  isBot: boolean;
  botLevel?: BotDifficulty;
}

// Sync info sent on reconnection
export interface ReconnectionSyncInfo {
  isReconnection: boolean;
  missedMoveCount: number;
  clockPaused: boolean;
}

// Error codes
export type ErrorCode =
  // Connection errors
  | "INVALID_TOKEN"
  | "CONNECTION_CLOSED"
  | "RATE_LIMITED"
  | "MESSAGE_TOO_LARGE"
  | "INVALID_MESSAGE"
  // Queue errors
  | "ALREADY_IN_QUEUE"
  | "NOT_IN_QUEUE"
  | "QUEUE_FULL"
  | "INVALID_TOURNAMENT_TYPE"
  // Game errors
  | "GAME_NOT_FOUND"
  | "GAME_NOT_ACTIVE"
  | "NOT_YOUR_TURN"
  | "INVALID_MOVE"
  | "INVALID_MOVE_FORMAT"
  | "NOT_A_PARTICIPANT"
  | "GAME_ALREADY_STARTED"
  | "GAME_CANCELLED"
  // Draw errors
  | "NO_DRAW_OFFER"
  | "CANNOT_ACCEPT_OWN_DRAW"
  | "DRAW_ALREADY_OFFERED"
  | "DRAW_OFFER_COOLDOWN"
  | "DRAW_NOT_CLAIMABLE"
  // Abort errors
  | "CANNOT_ABORT"
  // Rematch errors
  | "NO_REMATCH_OFFER"
  | "CANNOT_ACCEPT_OWN_REMATCH"
  // Generic
  | "INTERNAL_ERROR";

// ============================================
// Matchmaking Types
// ============================================

export interface QueuedPlayer {
  playerId: string;
  displayName: string;
  elo: number;
  joinedAt: number;
  currentEloRange: number;
  recentOpponents: string[];
}

export interface MatchmakingConnectionState {
  playerId: string;
  displayName: string;
  elo: number;
  inQueue: boolean;
  rateLimit: {
    joinCount: number;
    joinWindowStart: number;
    messageCount: number;
    messageWindowStart: number;
  };
}
