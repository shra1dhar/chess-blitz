import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env.d";
import {
  TOURNAMENT_TYPES,
  TournamentType,
  MATCHMAKING,
  RATE_LIMITS,
  BOT_DIFFICULTY,
} from "../types/constants";
import {
  ClientMessageType,
  ServerMessageType,
  type ClientMessage,
  type QueuedPlayer,
  type MatchmakingConnectionState,
} from "../types/messages";
import { safeSend, safeClose, parseClientMessage } from "../utils/websocket";
import { determineBotDifficulty, getBotElo } from "../services/elo";
import { executeSql, queryAll } from "../utils/sqlHelper";

interface QueueEntry extends QueuedPlayer {
  ws: WebSocket;
}

/**
 * MatchmakingQueue Durable Object
 *
 * One instance per tournament type (bullet, blitz, rapid, classical).
 * Handles player queuing, ELO-based matching, and bot fallback.
 *
 * Uses WebSocket Hibernation API for cost efficiency.
 * Uses SQLite for persistent recent opponents tracking.
 */
export class MatchmakingQueue extends DurableObject<Env> {
  private queue: Map<string, QueueEntry> = new Map();
  private matchingInProgress: Set<string> = new Set();
  private tournamentType: TournamentType = "blitz";
  // In-memory cache for recent opponents (loaded from SQLite on demand)
  private recentOpponentsCache: Map<string, string[]> = new Map();
  private sqlInitialized: boolean = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Set up auto ping/pong (doesn't wake DO)
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));

    // Initialize SQLite on first wake
    this.ctx.blockConcurrencyWhile(async () => {
      await this.initializeSql();
    });
  }

  /**
   * Initialize SQLite table for recent opponents persistence.
   */
  private async initializeSql(): Promise<void> {
    if (this.sqlInitialized) return;

    try {
      // Create table for recent opponents
      executeSql(
        this.ctx.storage.sql,
        `CREATE TABLE IF NOT EXISTS recent_opponents (
          player_id TEXT NOT NULL,
          opponent_id TEXT NOT NULL,
          matched_at INTEGER NOT NULL,
          PRIMARY KEY (player_id, opponent_id)
        )`
      );

      // Create index for efficient lookups
      executeSql(
        this.ctx.storage.sql,
        `CREATE INDEX IF NOT EXISTS idx_recent_opponents_player
         ON recent_opponents(player_id, matched_at DESC)`
      );

      // Clean up old entries (older than 1 hour)
      const oneHourAgo = Date.now() - 3600000;
      executeSql(
        this.ctx.storage.sql,
        `DELETE FROM recent_opponents WHERE matched_at < ?`,
        oneHourAgo
      );

      this.sqlInitialized = true;
    } catch (error) {
      console.error("[MatchmakingQueue] SQL init failed:", error);
    }
  }

  /**
   * Handle incoming HTTP requests.
   * WebSocket upgrades are handled here.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Extract tournament type from URL or DO name
    const tournamentParam = url.searchParams.get("tournament");
    if (tournamentParam && TOURNAMENT_TYPES.includes(tournamentParam as TournamentType)) {
      this.tournamentType = tournamentParam as TournamentType;
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    // GET /status - return queue status
    if (request.method === "GET" && url.pathname === "/status") {
      return Response.json({
        tournamentType: this.tournamentType,
        queueSize: this.queue.size,
        estimatedWaitMs: this.estimateWaitTime(),
      });
    }

    return new Response("MatchmakingQueue", { status: 200 });
  }

  /**
   * Handle WebSocket upgrade request.
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const displayName = url.searchParams.get("displayName");
    const eloParam = url.searchParams.get("elo");

    if (!playerId || !displayName) {
      return new Response("Missing player info", { status: 400 });
    }

    // Check if player already in queue - close old connection
    const existingEntry = this.queue.get(playerId);
    if (existingEntry) {
      safeSend(existingEntry.ws, { type: ServerMessageType.Error, code: "ALREADY_IN_QUEUE", message: "Replaced by new connection" });
      safeClose(existingEntry.ws, 1000, "Replaced");
      this.queue.delete(playerId);
    }

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair());

    // Accept with hibernation API
    this.ctx.acceptWebSocket(server, [playerId]);

    // Attach state to WebSocket
    const connectionState: MatchmakingConnectionState = {
      playerId,
      displayName,
      elo: parseInt(eloParam || "1200", 10),
      inQueue: false,
      rateLimit: {
        joinCount: 0,
        joinWindowStart: Date.now(),
        messageCount: 0,
        messageWindowStart: Date.now(),
      },
    };
    (server as any).state = connectionState;

    // Send connected message
    safeSend(server, { type: ServerMessageType.Connected, playerId, displayName });

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Handle WebSocket messages (called even after hibernation).
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const state = (ws as any).state as MatchmakingConnectionState;
    if (!state) {
      safeSend(ws, { type: ServerMessageType.Error, code: "INTERNAL_ERROR", message: "Connection state lost" });
      return;
    }

    // Rate limit messages
    const now = Date.now();
    if (now - state.rateLimit.messageWindowStart >= 1000) {
      state.rateLimit.messageCount = 0;
      state.rateLimit.messageWindowStart = now;
    }
    state.rateLimit.messageCount++;

    if (state.rateLimit.messageCount > RATE_LIMITS.MESSAGES_PER_SECOND) {
      safeSend(ws, { type: ServerMessageType.Error, code: "RATE_LIMITED", message: "Too many messages" });
      return;
    }

    // Parse message
    const parsed = parseClientMessage(message);
    if (!parsed.success) {
      safeSend(ws, { type: ServerMessageType.Error, code: "INVALID_MESSAGE", message: parsed.error || "Invalid message" });
      return;
    }

    const msg = parsed.data as ClientMessage;

    switch (msg.type) {
      case ClientMessageType.JoinQueue:
        await this.handleJoinQueue(ws, state);
        break;

      case ClientMessageType.LeaveQueue:
        await this.handleLeaveQueue(ws, state);
        break;

      case ClientMessageType.Ping:
        safeSend(ws, { type: ServerMessageType.Pong });
        break;

      default:
        safeSend(ws, { type: ServerMessageType.Error, code: "INVALID_MESSAGE", message: "Unknown message type" });
    }
  }

  /**
   * Handle WebSocket close.
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    const state = (ws as any).state as MatchmakingConnectionState;
    if (state?.playerId) {
      this.queue.delete(state.playerId);
      this.matchingInProgress.delete(state.playerId);
    }
  }

  /**
   * Handle WebSocket error.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    const state = (ws as any).state as MatchmakingConnectionState;
    if (state?.playerId) {
      this.queue.delete(state.playerId);
      this.matchingInProgress.delete(state.playerId);
    }
    console.error("[MatchmakingQueue] WebSocket error:", error);
  }

  /**
   * Alarm handler - runs matchmaking and expands ELO ranges.
   */
  async alarm(): Promise<void> {
    // Try to match players
    await this.processMatchmaking();

    // Expand ELO ranges for waiting players
    this.expandEloRanges();

    // Check for bot fallback
    await this.checkBotFallback();

    // Check for max wait timeout
    this.checkMaxWaitTimeout();

    // Broadcast queue positions
    this.broadcastQueuePositions();

    // Schedule next alarm if queue not empty
    if (this.queue.size > 0) {
      await this.ctx.storage.setAlarm(Date.now() + 1000);
    }
  }

  /**
   * Handle player joining the queue.
   */
  private async handleJoinQueue(ws: WebSocket, state: MatchmakingConnectionState): Promise<void> {
    // Check if already in queue
    if (state.inQueue) {
      safeSend(ws, { type: ServerMessageType.Error, code: "ALREADY_IN_QUEUE", message: "Already in queue" });
      return;
    }

    // Rate limit joins
    const now = Date.now();
    if (now - state.rateLimit.joinWindowStart >= 60_000) {
      state.rateLimit.joinCount = 0;
      state.rateLimit.joinWindowStart = now;
    }
    state.rateLimit.joinCount++;

    if (state.rateLimit.joinCount > RATE_LIMITS.QUEUE_JOINS_PER_MINUTE) {
      safeSend(ws, { type: ServerMessageType.Error, code: "RATE_LIMITED", message: "Too many queue joins. Try again later." });
      return;
    }

    // Check queue size limit
    if (this.queue.size >= MATCHMAKING.MAX_QUEUE_SIZE) {
      safeSend(ws, { type: ServerMessageType.Error, code: "QUEUE_FULL", message: "Queue is full. Try again later." });
      return;
    }

    // Get recent opponents from SQLite (persistent across hibernation)
    const recentOpponents = await this.getRecentOpponents(state.playerId);

    // Add to queue
    const entry: QueueEntry = {
      playerId: state.playerId,
      displayName: state.displayName,
      elo: state.elo,
      joinedAt: now,
      currentEloRange: MATCHMAKING.INITIAL_ELO_RANGE,
      recentOpponents,
      ws,
    };

    this.queue.set(state.playerId, entry);
    state.inQueue = true;

    // Calculate position
    const position = this.getQueuePosition(state.playerId);

    // Send confirmation
    safeSend(ws, {
      type: ServerMessageType.QueueJoined,
      tournamentType: this.tournamentType,
      position,
      estimatedWaitMs: this.estimateWaitTime(),
    });

    // Try immediate match
    await this.tryMatchPlayer(entry);

    // Ensure alarm is set
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (!currentAlarm) {
      await this.ctx.storage.setAlarm(Date.now() + 1000);
    }
  }

  /**
   * Handle player leaving the queue.
   */
  private async handleLeaveQueue(ws: WebSocket, state: MatchmakingConnectionState): Promise<void> {
    if (!state.inQueue) {
      safeSend(ws, { type: ServerMessageType.Error, code: "NOT_IN_QUEUE", message: "Not in queue" });
      return;
    }

    this.queue.delete(state.playerId);
    state.inQueue = false;

    safeSend(ws, { type: ServerMessageType.QueueLeft });
  }

  /**
   * Process matchmaking - try to pair all queued players.
   */
  private async processMatchmaking(): Promise<void> {
    const players = Array.from(this.queue.values()).sort((a, b) => a.joinedAt - b.joinedAt);

    for (const player of players) {
      // Skip if already being matched or removed from queue
      if (this.matchingInProgress.has(player.playerId) || !this.queue.has(player.playerId)) {
        continue;
      }

      await this.tryMatchPlayer(player);
    }
  }

  /**
   * Try to find a match for a specific player.
   */
  private async tryMatchPlayer(player: QueueEntry): Promise<boolean> {
    if (this.matchingInProgress.has(player.playerId)) {
      return false;
    }

    const match = this.findBestMatch(player);
    if (!match) {
      return false;
    }

    // Mark both as in progress to prevent double-matching
    this.matchingInProgress.add(player.playerId);
    this.matchingInProgress.add(match.playerId);

    try {
      await this.createMatch(player, match);
      return true;
    } catch (error) {
      console.error("[MatchmakingQueue] Match creation failed:", error);
      // Put players back in queue
      this.matchingInProgress.delete(player.playerId);
      this.matchingInProgress.delete(match.playerId);

      // Notify about error
      safeSend(player.ws, { type: ServerMessageType.Error, code: "INTERNAL_ERROR", message: "Match creation failed" });
      safeSend(match.ws, { type: ServerMessageType.Error, code: "INTERNAL_ERROR", message: "Match creation failed" });
      return false;
    }
  }

  /**
   * Find the best match for a player.
   */
  private findBestMatch(player: QueueEntry): QueueEntry | null {
    const candidates = Array.from(this.queue.values()).filter((candidate) => {
      // Not self
      if (candidate.playerId === player.playerId) return false;

      // Not already being matched
      if (this.matchingInProgress.has(candidate.playerId)) return false;

      // Not a recent opponent
      if (player.recentOpponents.includes(candidate.playerId)) return false;
      if (candidate.recentOpponents.includes(player.playerId)) return false;

      // Within ELO range
      const eloDiff = Math.abs(player.elo - candidate.elo);
      const maxRange = Math.max(player.currentEloRange, candidate.currentEloRange);
      return eloDiff <= maxRange;
    });

    if (candidates.length === 0) return null;

    // Sort by ELO difference (closest first), then by wait time (longest first)
    candidates.sort((a, b) => {
      const eloDiffA = Math.abs(player.elo - a.elo);
      const eloDiffB = Math.abs(player.elo - b.elo);
      if (eloDiffA !== eloDiffB) return eloDiffA - eloDiffB;
      return a.joinedAt - b.joinedAt;
    });

    return candidates[0];
  }

  /**
   * Create a match between two players.
   */
  private async createMatch(player1: QueueEntry, player2: QueueEntry): Promise<void> {
    // Randomly assign colors
    const [white, black] = Math.random() < 0.5 ? [player1, player2] : [player2, player1];

    const gameId = crypto.randomUUID();

    // Create GameRoom DO
    const gameRoomId = this.env.GAME_ROOM.idFromName(gameId);
    const gameRoom = this.env.GAME_ROOM.get(gameRoomId);

    // Initialize game via RPC
    const initResponse = await gameRoom.fetch(
      new Request("https://internal/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          tournamentType: this.tournamentType,
          white: {
            id: white.playerId,
            displayName: white.displayName,
            elo: white.elo,
            isBot: false,
          },
          black: {
            id: black.playerId,
            displayName: black.displayName,
            elo: black.elo,
            isBot: false,
          },
        }),
      })
    );

    if (!initResponse.ok) {
      throw new Error(`GameRoom init failed: ${initResponse.status}`);
    }

    // Notify players
    safeSend(white.ws, {
      type: ServerMessageType.MatchFound,
      gameId,
      opponent: { id: black.playerId, displayName: black.displayName, elo: black.elo, isBot: false },
      color: "white",
    });

    safeSend(black.ws, {
      type: ServerMessageType.MatchFound,
      gameId,
      opponent: { id: white.playerId, displayName: white.displayName, elo: white.elo, isBot: false },
      color: "black",
    });

    // Record recent opponents in memory
    this.recordRecentOpponent(white.playerId, black.playerId);
    this.recordRecentOpponent(black.playerId, white.playerId);

    // Remove from queue
    this.queue.delete(white.playerId);
    this.queue.delete(black.playerId);
    this.matchingInProgress.delete(white.playerId);
    this.matchingInProgress.delete(black.playerId);

    // Update connection state
    const whiteState = (white.ws as any).state as MatchmakingConnectionState;
    const blackState = (black.ws as any).state as MatchmakingConnectionState;
    if (whiteState) whiteState.inQueue = false;
    if (blackState) blackState.inQueue = false;
  }

  /**
   * Create a bot match for a player.
   */
  private async createBotMatch(player: QueueEntry): Promise<void> {
    const difficulty = determineBotDifficulty(player.elo);
    const botElo = getBotElo(difficulty);
    const botInfo = BOT_DIFFICULTY[difficulty];

    // Random color assignment
    const playerColor = Math.random() < 0.5 ? "white" : "black";
    const gameId = crypto.randomUUID();

    // Create GameRoom DO
    const gameRoomId = this.env.GAME_ROOM.idFromName(gameId);
    const gameRoom = this.env.GAME_ROOM.get(gameRoomId);

    const white =
      playerColor === "white"
        ? { id: player.playerId, displayName: player.displayName, elo: player.elo, isBot: false }
        : { id: `bot-${difficulty}`, displayName: botInfo.name, elo: botElo, isBot: true, botLevel: difficulty };

    const black =
      playerColor === "black"
        ? { id: player.playerId, displayName: player.displayName, elo: player.elo, isBot: false }
        : { id: `bot-${difficulty}`, displayName: botInfo.name, elo: botElo, isBot: true, botLevel: difficulty };

    // Initialize game
    const initResponse = await gameRoom.fetch(
      new Request("https://internal/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          tournamentType: this.tournamentType,
          white,
          black,
        }),
      })
    );

    if (!initResponse.ok) {
      throw new Error(`GameRoom init failed: ${initResponse.status}`);
    }

    // Notify player
    safeSend(player.ws, {
      type: ServerMessageType.MatchFound,
      gameId,
      opponent: {
        id: playerColor === "white" ? black.id : white.id,
        displayName: playerColor === "white" ? black.displayName : white.displayName,
        elo: playerColor === "white" ? black.elo : white.elo,
        isBot: true,
        botLevel: difficulty,
      },
      color: playerColor,
    });

    // Remove from queue
    this.queue.delete(player.playerId);
    this.matchingInProgress.delete(player.playerId);

    const state = (player.ws as any).state as MatchmakingConnectionState;
    if (state) state.inQueue = false;
  }

  /**
   * Expand ELO ranges for waiting players.
   */
  private expandEloRanges(): void {
    const now = Date.now();

    for (const player of this.queue.values()) {
      const waitTime = now - player.joinedAt;
      const expansions = Math.floor(waitTime / MATCHMAKING.RANGE_EXPANSION_INTERVAL_MS);
      const newRange = Math.min(
        MATCHMAKING.INITIAL_ELO_RANGE + expansions * MATCHMAKING.RANGE_EXPANSION_AMOUNT,
        MATCHMAKING.MAX_ELO_RANGE
      );
      player.currentEloRange = newRange;
    }
  }

  /**
   * Check for players waiting too long - give them bots.
   */
  private async checkBotFallback(): Promise<void> {
    const now = Date.now();

    for (const player of this.queue.values()) {
      if (this.matchingInProgress.has(player.playerId)) continue;

      const waitTime = now - player.joinedAt;
      if (waitTime >= MATCHMAKING.BOT_FALLBACK_TIMEOUT_MS) {
        this.matchingInProgress.add(player.playerId);
        try {
          await this.createBotMatch(player);
        } catch (error) {
          console.error("[MatchmakingQueue] Bot match creation failed:", error);
          this.matchingInProgress.delete(player.playerId);
        }
      }
    }
  }

  /**
   * Check for players waiting past max time - cancel their search.
   */
  private checkMaxWaitTimeout(): void {
    const now = Date.now();

    for (const player of this.queue.values()) {
      const waitTime = now - player.joinedAt;
      if (waitTime >= MATCHMAKING.MAX_WAIT_MS) {
        safeSend(player.ws, {
          type: ServerMessageType.Error,
          code: "QUEUE_FULL",
          message: "No match found. Please try again.",
        });
        safeSend(player.ws, { type: ServerMessageType.QueueLeft });
        this.queue.delete(player.playerId);

        const state = (player.ws as any).state as MatchmakingConnectionState;
        if (state) state.inQueue = false;
      }
    }
  }

  /**
   * Broadcast queue positions to all players.
   */
  private broadcastQueuePositions(): void {
    const players = Array.from(this.queue.values()).sort((a, b) => a.joinedAt - b.joinedAt);

    players.forEach((player, index) => {
      safeSend(player.ws, {
        type: ServerMessageType.QueuePosition,
        position: index + 1,
        estimatedWaitMs: this.estimateWaitTime(),
      });
    });
  }

  /**
   * Get queue position for a player.
   */
  private getQueuePosition(playerId: string): number {
    const players = Array.from(this.queue.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    const index = players.findIndex((p) => p.playerId === playerId);
    return index + 1;
  }

  /**
   * Estimate wait time based on queue size.
   */
  private estimateWaitTime(): number {
    const queueSize = this.queue.size;
    if (queueSize <= 1) return MATCHMAKING.BOT_FALLBACK_TIMEOUT_MS;
    // Rough estimate: 5 seconds per player in queue
    return Math.min(queueSize * 5000, MATCHMAKING.BOT_FALLBACK_TIMEOUT_MS);
  }

  /**
   * Record a recent opponent in SQLite storage.
   * Persists across hibernation for reliable opponent avoidance.
   */
  private recordRecentOpponent(playerId: string, opponentId: string): void {
    const now = Date.now();

    try {
      // Insert or update the opponent record
      executeSql(
        this.ctx.storage.sql,
        `INSERT OR REPLACE INTO recent_opponents (player_id, opponent_id, matched_at)
         VALUES (?, ?, ?)`,
        playerId,
        opponentId,
        now
      );

      // Clean up old records for this player (keep only last N)
      executeSql(
        this.ctx.storage.sql,
        `DELETE FROM recent_opponents
         WHERE player_id = ?
         AND opponent_id NOT IN (
           SELECT opponent_id FROM recent_opponents
           WHERE player_id = ?
           ORDER BY matched_at DESC
           LIMIT ?
         )`,
        playerId,
        playerId,
        MATCHMAKING.AVOID_RECENT_OPPONENTS_COUNT
      );

      // Invalidate cache for this player
      this.recentOpponentsCache.delete(playerId);
    } catch (error) {
      console.error("[MatchmakingQueue] Failed to record recent opponent:", error);
    }
  }

  /**
   * Get recent opponents for a player from SQLite storage.
   * Uses caching to avoid repeated queries within the same session.
   */
  private async getRecentOpponents(playerId: string): Promise<string[]> {
    // Check cache first
    if (this.recentOpponentsCache.has(playerId)) {
      return this.recentOpponentsCache.get(playerId)!;
    }

    try {
      interface OpponentRow {
        opponent_id: string;
      }

      const rows = queryAll<OpponentRow>(
        this.ctx.storage.sql,
        `SELECT opponent_id FROM recent_opponents
         WHERE player_id = ?
         ORDER BY matched_at DESC
         LIMIT ?`,
        playerId,
        MATCHMAKING.AVOID_RECENT_OPPONENTS_COUNT
      );

      const opponents = rows.map((row) => row.opponent_id);

      // Cache the result
      this.recentOpponentsCache.set(playerId, opponents);

      return opponents;
    } catch (error) {
      console.error("[MatchmakingQueue] Failed to get recent opponents:", error);
      return [];
    }
  }
}
