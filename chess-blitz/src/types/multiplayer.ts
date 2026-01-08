// ==============================================
// Chess Blitz - Multiplayer Types
// ==============================================

import type { Color as ChessColor, Square, PieceSymbol } from 'chess.js';

// ==============================================
// Re-export shared types from @chess-blitz/shared
// ==============================================

export {
  ClientMessageType,
  ServerMessageType,
  DrawClaimReason,
  MatchState,
  RematchState,
  WebSocketStatus,
  DrawClaimType,
} from '@chess-blitz/shared';

// Import the enums for use in this file's type definitions
import {
  ClientMessageType,
  ServerMessageType,
  DrawClaimReason,
  MatchState,
  RematchState,
  WebSocketStatus,
  DrawClaimType,
} from '@chess-blitz/shared';

export type { TournamentType, Color, BotDifficulty, ErrorCode, GameResult } from '@chess-blitz/shared';
export { TIME_CONTROLS, ELO } from '@chess-blitz/shared';
import type { TournamentType, Color, BotDifficulty, ErrorCode, GameResult } from '@chess-blitz/shared';
import { ELO } from '@chess-blitz/shared';

// Re-export ELO values for backwards compatibility
export const DEFAULT_ELO = ELO.STARTING;

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

// ==============================================
// Game Types
// ==============================================

// GameResult is re-exported from shared above
// Define GameResultReason locally (frontend uses this name)
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

// Lite version for frequent updates (omits heavy history)
export type LiteSerializedGameState = Omit<SerializedGameState, 'moveHistory'>;

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

// MatchState is now imported from @chess-blitz/shared (see exports above)
// Available values: MatchState.Idle, MatchState.Queued, MatchState.Matched, MatchState.Playing, MatchState.Ended

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

// ErrorCode is re-exported from @chess-blitz/shared above

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
// Constants (re-exported from shared + frontend-specific)
// ==============================================

// Re-export shared constants (ELO is already exported above)
export { MATCHMAKING, GAME, RATE_LIMITS, MAX_MESSAGE_SIZE_BYTES } from '@chess-blitz/shared';

// Frontend-specific aliases for convenience
export const MATCHMAKING_TIMEOUT_MS = 30_000; // 30 seconds before bot fallback
export const RECONNECT_TIMEOUT_MS = 30_000; // 30 seconds to reconnect
export const ELO_MATCH_RANGE = 200; // Match players within this Elo range
