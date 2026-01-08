/**
 * Match state during matchmaking and gameplay lifecycle
 * Used by frontend to track current state of multiplayer experience
 */
export enum MatchState {
  Idle = "idle", // Not in queue, not playing
  Queued = "queued", // In matchmaking queue
  Matched = "matched", // Match found, transitioning to game
  Playing = "playing", // Game in progress
  Ended = "ended", // Game finished
}

/**
 * Rematch request state after game ends
 */
export enum RematchState {
  Idle = "idle", // No rematch activity
  Requested = "requested", // I requested rematch
  Received = "received", // Opponent requested rematch
  Accepted = "accepted", // Rematch accepted, starting new game
}

/**
 * Game room status on the backend
 * Used by GameRoom durable object
 */
export enum GameRoomStatus {
  Waiting = "waiting", // Waiting for both players
  Active = "active", // Game in progress
  Paused = "paused", // Paused due to disconnect
  Finished = "finished", // Game ended
}

/**
 * WebSocket connection status
 */
export enum WebSocketStatus {
  Connecting = "connecting",
  Connected = "connected",
  Disconnected = "disconnected",
  Error = "error",
}

/**
 * Draw claim type (extends DrawClaimReason with 'none')
 */
export enum DrawClaimType {
  None = "none",
  FiftyMove = "fifty_move",
  ThreefoldRepetition = "threefold_repetition",
}
