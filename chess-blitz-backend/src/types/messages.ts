import type { TournamentType, Color, ResultReason, BotDifficulty } from "./constants";
import type { SerializedGameState, LiteSerializedGameState, MoveInfo, GameEndResult } from "./game";

// ============================================
// Re-export shared enums from @chess-blitz/shared
// ============================================

export {
  ClientMessageType,
  ServerMessageType,
  DrawClaimReason,
} from "@chess-blitz/shared";

// Import the enums and types for use in this file
import { ClientMessageType, ServerMessageType, DrawClaimReason } from "@chess-blitz/shared";
import type { ErrorCode } from "@chess-blitz/shared";
export type { ErrorCode } from "@chess-blitz/shared";

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
  | { type: ServerMessageType.MoveMade; move: MoveInfo; gameState: LiteSerializedGameState }
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
  | { type: ServerMessageType.FiftyMoveWarning; halfMoves: number }
  // First-move timeout warning
  | { type: ServerMessageType.FirstMoveWarning; player: Color; remainingMs: number };

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

// ErrorCode is re-exported from @chess-blitz/shared above

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

import type { RateLimitState } from "../utils/rate-limiter";

export interface MatchmakingConnectionState {
  playerId: string;
  displayName: string;
  elo: number;
  inQueue: boolean;
  rateLimit: {
    message: RateLimitState;
    join: RateLimitState;
  };
}
