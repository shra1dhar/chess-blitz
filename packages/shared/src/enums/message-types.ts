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
