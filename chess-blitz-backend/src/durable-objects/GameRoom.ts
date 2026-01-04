import { DurableObject } from "cloudflare:workers";
import { Chess } from "chess.js";
import type { Env } from "../env.d";
import {
  TournamentType,
  TIME_CONTROLS,
  GAME,
  RATE_LIMITS,
  BOT_DIFFICULTY,
  Color,
  ResultReason,
  GameResult,
} from "../types/constants";
import type {
  GameState,
  GamePlayer,
  MoveInfo,
  SerializedGameState,
  GameEndResult,
  GameConnectionState,
  PendingTimeouts,
  GameInitConfig,
} from "../types/game";
import {
  ClientMessageType,
  ServerMessageType,
  DrawClaimReason,
  type ClientMessage,
  type ServerMessage,
} from "../types/messages";
import {
  safeSend,
  safeClose,
  broadcast,
  parseClientMessage,
} from "../utils/websocket";
import { checkRateLimit, RATE_LIMIT_CONFIGS, createRateLimitState } from "../utils/rate-limiter";
import {
  colorHasSufficientMaterial,
  getPositionKey,
  validateSquareFormat,
  validatePromotion,
  chessColorToColor,
  makeMove,
} from "../utils/chess";
import { calculateGameEloChanges } from "../services/elo";

interface PlayerConnection {
  ws: WebSocket;
  connected: boolean;
  disconnectedAt?: number;
}

/**
 * GameRoom Durable Object
 *
 * One instance per active game.
 * Handles all game logic, move validation, clock management, and persistence.
 *
 * Uses WebSocket Hibernation API for cost efficiency.
 */
export class GameRoom extends DurableObject<Env> {
  private game: GameState | null = null;
  private chess: Chess | null = null;
  private connections: Map<Color, PlayerConnection> = new Map();
  private pendingTimeouts: PendingTimeouts = {
    disconnectTimeouts: { white: null, black: null },
    rematchDeadline: null,
    cleanupDeadline: null,
    noShowDeadline: null,
    bothDisconnectedDeadline: null,
  };

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Restore state on wake
    this.ctx.blockConcurrencyWhile(async () => {
      await this.restoreState();
    });

    // Set up auto ping/pong
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /**
   * Restore game state from storage after hibernation.
   */
  private async restoreState(): Promise<void> {
    const stored = await this.ctx.storage.get<{
      game: Omit<GameState, "positionHistory"> & { positionHistory: [string, number][] };
      pendingTimeouts: PendingTimeouts;
    }>("state");

    if (stored) {
      this.game = {
        ...stored.game,
        positionHistory: new Map(stored.game.positionHistory),
      };
      this.chess = new Chess(this.game.fen);
      this.pendingTimeouts = stored.pendingTimeouts;
    }
  }

  /**
   * Persist state to storage.
   */
  private async persistState(): Promise<void> {
    if (!this.game) return;

    await this.ctx.storage.put("state", {
      game: {
        ...this.game,
        positionHistory: Array.from(this.game.positionHistory.entries()),
      },
      pendingTimeouts: this.pendingTimeouts,
    });
  }

  /**
   * Handle incoming HTTP requests.
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize game (called by MatchmakingQueue)
    if (request.method === "POST" && url.pathname === "/init") {
      return this.handleInit(request);
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    // GET /state - return game state
    if (request.method === "GET" && url.pathname === "/state") {
      if (!this.game) {
        return Response.json({ error: "Game not found" }, { status: 404 });
      }
      return Response.json(this.serializeGameState());
    }

    return new Response("GameRoom", { status: 200 });
  }

  /**
   * Initialize a new game.
   */
  private async handleInit(request: Request): Promise<Response> {
    try {
      const config = (await request.json()) as GameInitConfig;

      // Validate
      if (!config.gameId || !config.tournamentType || !config.white || !config.black) {
        return Response.json({ error: "Missing required fields" }, { status: 400 });
      }

      // Prevent duplicate initialization
      if (this.game && this.game.status !== "finished") {
        return Response.json({ error: "Game already exists" }, { status: 409 });
      }

      const timeControl = TIME_CONTROLS[config.tournamentType];
      const now = Date.now();

      this.chess = new Chess();

      this.game = {
        gameId: config.gameId,
        tournamentType: config.tournamentType,
        white: config.white,
        black: config.black,
        fen: this.chess.fen(),
        pgn: "",
        moveHistory: [],
        whiteTimeMs: timeControl.initial,
        blackTimeMs: timeControl.initial,
        lastMoveAt: now,
        increment: timeControl.increment,
        status: "waiting",
        turn: "white",
        moveCount: 0,
        positionHistory: new Map([[getPositionKey(this.chess.fen()), 1]]),
        halfMoveClock: 0,
        startedAt: now,
      };

      // Set no-show timeout
      this.pendingTimeouts.noShowDeadline = now + GAME.NO_SHOW_TIMEOUT_MS;

      await this.persistState();
      await this.scheduleNextAlarm();

      return Response.json({ success: true, gameId: config.gameId });
    } catch (error) {
      console.error("[GameRoom] Init failed:", error);
      return Response.json({ error: "Initialization failed" }, { status: 500 });
    }
  }

  /**
   * Handle WebSocket upgrade.
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const colorParam = url.searchParams.get("color") as Color;

    if (!this.game) {
      return new Response("Game not found", { status: 404 });
    }

    // Validate player is a participant
    const isWhite = this.game.white.id === playerId;
    const isBlack = this.game.black.id === playerId;

    if (!isWhite && !isBlack) {
      return new Response("Not a participant", { status: 403 });
    }

    const color: Color = isWhite ? "white" : "black";

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair());

    // Accept with hibernation API
    this.ctx.acceptWebSocket(server, [playerId, color]);

    // Attach state
    const connectionState: GameConnectionState = {
      playerId,
      color,
      rateLimit: createRateLimitState(),
    };
    (server as any).state = connectionState;

    // Handle connection
    this.handlePlayerConnect(server, color);

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Handle player connection.
   */
  private async handlePlayerConnect(ws: WebSocket, color: Color): Promise<void> {
    if (!this.game) return;

    // Store connection
    const existingConn = this.connections.get(color);
    if (existingConn?.ws) {
      safeClose(existingConn.ws, 1000, "Replaced");
    }

    this.connections.set(color, { ws, connected: true });

    // Clear disconnect timeout
    this.pendingTimeouts.disconnectTimeouts[color] = null;

    // Resume clock if it was paused for this player
    if (this.game.clockPausedAt && this.game.clockPausedFor === color) {
      // Resume the clock - set lastMoveAt to now so time doesn't jump
      this.game.lastMoveAt = Date.now();
      this.game.clockPausedAt = undefined;
      this.game.clockPausedFor = undefined;
      await this.persistState();
    }

    // Clear both disconnected deadline if opponent is still connected
    const opponentColor: Color = color === "white" ? "black" : "white";
    const opponentConn = this.connections.get(opponentColor);
    if (opponentConn?.connected || this.game[opponentColor].isBot) {
      this.pendingTimeouts.bothDisconnectedDeadline = null;
    }

    // Send current game state with sync info
    const gameState = this.serializeGameState();
    safeSend(ws, {
      type: ServerMessageType.GameState,
      gameState,
      // Include sync info for reconnecting player
      syncInfo: {
        isReconnection: true,
        missedMoveCount: this.game.moveHistory.length,
        clockPaused: !!this.game.clockPausedAt,
      }
    });

    // Send any pending events the player might have missed
    if (this.game.pendingDrawOffer && this.game.pendingDrawOffer !== color) {
      // Opponent offered a draw while this player was away
      safeSend(ws, { type: ServerMessageType.DrawOffered, by: this.game.pendingDrawOffer });
    }

    if (this.game.status === "finished" && this.game.pendingRematchOffer && this.game.pendingRematchOffer !== color) {
      // Opponent offered a rematch while this player was away
      safeSend(ws, { type: ServerMessageType.RematchOffered, by: this.game.pendingRematchOffer });
    }

    // Notify opponent of reconnection
    if (opponentConn?.connected && opponentConn.ws) {
      safeSend(opponentConn.ws, { type: ServerMessageType.OpponentReconnected });
    }

    // Check if game should start
    if (this.game.status === "waiting") {
      const whiteConn = this.connections.get("white");
      const blackConn = this.connections.get("black");

      const whiteReady = whiteConn?.connected || this.game.white.isBot;
      const blackReady = blackConn?.connected || this.game.black.isBot;

      if (whiteReady && blackReady) {
        this.startGame();
      }
    }
  }

  /**
   * Start the game.
   */
  private async startGame(): Promise<void> {
    if (!this.game || this.game.status !== "waiting") return;

    this.game.status = "active";
    this.game.lastMoveAt = Date.now();
    this.pendingTimeouts.noShowDeadline = null;

    await this.persistState();

    // Broadcast game start
    this.broadcastToPlayers({ type: ServerMessageType.GameStart, gameState: this.serializeGameState() });

    // Schedule clock alarm
    await this.scheduleNextAlarm();

    // If it's bot's turn, make a move
    const currentPlayer = this.game.turn === "white" ? this.game.white : this.game.black;
    if (currentPlayer.isBot) {
      setTimeout(() => this.makeBotMove(), this.getBotThinkTime());
    }
  }

  /**
   * Handle WebSocket messages.
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const state = (ws as any).state as GameConnectionState;
    if (!state || !this.game) {
      safeSend(ws, { type: ServerMessageType.Error, code: "INTERNAL_ERROR", message: "Invalid state" });
      return;
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(state.rateLimit, RATE_LIMIT_CONFIGS.messages);
    state.rateLimit = rateLimitResult.newState;

    if (!rateLimitResult.allowed) {
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
      case ClientMessageType.Move:
        await this.handleMove(ws, state.color, msg.from, msg.to, msg.promotion);
        break;

      case ClientMessageType.OfferDraw:
        await this.handleDrawOffer(state.color);
        break;

      case ClientMessageType.AcceptDraw:
        await this.handleDrawAccept(state.color);
        break;

      case ClientMessageType.DeclineDraw:
        await this.handleDrawDecline(state.color);
        break;

      case ClientMessageType.Resign:
        await this.handleResign(state.color);
        break;

      case ClientMessageType.Abort:
        await this.handleAbort(state.color);
        break;

      case ClientMessageType.ClaimDraw:
        await this.handleDrawClaim(state.color, msg.reason);
        break;

      case ClientMessageType.OfferRematch:
        await this.handleRematchOffer(state.color);
        break;

      case ClientMessageType.AcceptRematch:
        await this.handleRematchAccept(state.color);
        break;

      case ClientMessageType.DeclineRematch:
        await this.handleRematchDecline(state.color);
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
    const state = (ws as any).state as GameConnectionState;
    if (!state || !this.game) return;

    const conn = this.connections.get(state.color);
    if (conn) {
      conn.connected = false;
      conn.disconnectedAt = Date.now();
    }

    // If game is active, start disconnect timer and pause clock
    if (this.game.status === "active") {
      const now = Date.now();
      this.pendingTimeouts.disconnectTimeouts[state.color] = now + GAME.DISCONNECT_TIMEOUT_MS;

      // Pause the clock if it's the disconnecting player's turn
      // This prevents them from losing on time due to disconnect
      if (this.game.turn === state.color && !this.game.clockPausedAt) {
        // Deduct time elapsed before pause
        const elapsed = now - this.game.lastMoveAt;
        if (state.color === "white") {
          this.game.whiteTimeMs = Math.max(0, this.game.whiteTimeMs - elapsed);
        } else {
          this.game.blackTimeMs = Math.max(0, this.game.blackTimeMs - elapsed);
        }
        // Update lastMoveAt to prevent double-counting if updateClock runs
        this.game.lastMoveAt = now;
        this.game.clockPausedAt = now;
        this.game.clockPausedFor = state.color;
      }

      // Check if both disconnected
      const opponentColor: Color = state.color === "white" ? "black" : "white";
      const opponentConn = this.connections.get(opponentColor);
      if (!opponentConn?.connected && !this.game[opponentColor].isBot) {
        this.pendingTimeouts.bothDisconnectedDeadline = now + GAME.BOTH_DISCONNECT_TIMEOUT_MS;
      }

      // Notify opponent (only if not a bot)
      if (opponentConn?.connected && opponentConn.ws && !this.game[state.color].isBot) {
        safeSend(opponentConn.ws, {
          type: ServerMessageType.OpponentDisconnected,
          timeoutMs: GAME.DISCONNECT_TIMEOUT_MS,
          clockPaused: this.game.clockPausedAt ? true : false
        });
      }

      await this.persistState();
      await this.scheduleNextAlarm();
    }
  }

  /**
   * Handle WebSocket error.
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("[GameRoom] WebSocket error:", error);
    // Treat as disconnect
    await this.webSocketClose(ws, 1006, "Error");
  }

  /**
   * Alarm handler - clock updates, timeout checks, cleanup.
   */
  async alarm(): Promise<void> {
    if (!this.game) return;

    const now = Date.now();

    // Check no-show timeout
    if (
      this.game.status === "waiting" &&
      this.pendingTimeouts.noShowDeadline &&
      now >= this.pendingTimeouts.noShowDeadline
    ) {
      // Determine who showed up
      const whiteConn = this.connections.get("white");
      const blackConn = this.connections.get("black");
      const whitePresent = whiteConn?.connected || this.game.white.isBot;
      const blackPresent = blackConn?.connected || this.game.black.isBot;

      if (!whitePresent && !blackPresent) {
        await this.endGame(null, "no_show");
      } else if (!whitePresent) {
        await this.endGame("black", "no_show");
      } else if (!blackPresent) {
        await this.endGame("white", "no_show");
      }
      return;
    }

    // Check disconnect timeouts
    for (const color of ["white", "black"] as Color[]) {
      const deadline = this.pendingTimeouts.disconnectTimeouts[color];
      if (deadline && now >= deadline && this.game.status === "active") {
        const opponent: Color = color === "white" ? "black" : "white";
        await this.endGame(opponent, "disconnect");
        return;
      }
    }

    // Check both disconnected
    if (
      this.pendingTimeouts.bothDisconnectedDeadline &&
      now >= this.pendingTimeouts.bothDisconnectedDeadline &&
      this.game.status === "active"
    ) {
      await this.endGame("draw", "disconnect");
      return;
    }

    // Update clock if game is active
    if (this.game.status === "active") {
      await this.updateClock();
    }

    // Check cleanup deadline
    if (this.pendingTimeouts.cleanupDeadline && now >= this.pendingTimeouts.cleanupDeadline) {
      await this.cleanup();
      return;
    }

    // Check rematch deadline
    if (
      this.pendingTimeouts.rematchDeadline &&
      now >= this.pendingTimeouts.rematchDeadline &&
      this.game.status === "finished"
    ) {
      this.game.pendingRematchOffer = undefined;
      this.pendingTimeouts.rematchDeadline = null;
      this.broadcastToPlayers({ type: ServerMessageType.RematchDeclined });
      await this.persistState();
    }

    await this.scheduleNextAlarm();
  }

  /**
   * Update clock and check for timeout.
   */
  private async updateClock(): Promise<void> {
    if (!this.game || this.game.status !== "active") return;

    // Skip clock update if paused due to disconnect
    if (this.game.clockPausedAt) {
      // Still broadcast current time so clients stay in sync
      this.broadcastToPlayers({
        type: ServerMessageType.ClockUpdate,
        white: this.game.whiteTimeMs,
        black: this.game.blackTimeMs,
        serverTime: Date.now(),
        turn: this.game.turn,
        lastMoveAt: this.game.lastMoveAt,
        paused: true,
      });
      return;
    }

    const now = Date.now();
    const elapsed = now - this.game.lastMoveAt;

    // Deduct time from current player
    if (this.game.turn === "white") {
      this.game.whiteTimeMs = Math.max(0, this.game.whiteTimeMs - elapsed);
      if (this.game.whiteTimeMs <= 0) {
        await this.handleTimeout("white");
        return;
      }
    } else {
      this.game.blackTimeMs = Math.max(0, this.game.blackTimeMs - elapsed);
      if (this.game.blackTimeMs <= 0) {
        await this.handleTimeout("black");
        return;
      }
    }

    this.game.lastMoveAt = now;

    // Broadcast clock update with serverTime for client sync
    this.broadcastToPlayers({
      type: ServerMessageType.ClockUpdate,
      white: this.game.whiteTimeMs,
      black: this.game.blackTimeMs,
      serverTime: now,
      turn: this.game.turn,
      lastMoveAt: this.game.lastMoveAt,
    });

    await this.persistState();
  }

  /**
   * Handle move from a player.
   */
  private async handleMove(
    ws: WebSocket,
    color: Color,
    from: string,
    to: string,
    promotion?: string
  ): Promise<void> {
    if (!this.game || !this.chess) {
      safeSend(ws, { type: ServerMessageType.Error, code: "GAME_NOT_FOUND", message: "Game not found" });
      return;
    }

    if (this.game.status !== "active") {
      safeSend(ws, { type: ServerMessageType.Error, code: "GAME_NOT_ACTIVE", message: "Game not active" });
      return;
    }

    if (this.game.turn !== color) {
      safeSend(ws, { type: ServerMessageType.Error, code: "NOT_YOUR_TURN", message: "Not your turn" });
      return;
    }

    // Validate move format
    if (!validateSquareFormat(from) || !validateSquareFormat(to)) {
      safeSend(ws, { type: ServerMessageType.Error, code: "INVALID_MOVE_FORMAT", message: "Invalid square format" });
      return;
    }

    // Update clock before processing move (check for timeout)
    const now = Date.now();
    const elapsed = now - this.game.lastMoveAt;

    if (color === "white") {
      this.game.whiteTimeMs -= elapsed;
      if (this.game.whiteTimeMs <= 0) {
        await this.handleTimeout("white");
        return;
      }
    } else {
      this.game.blackTimeMs -= elapsed;
      if (this.game.blackTimeMs <= 0) {
        await this.handleTimeout("black");
        return;
      }
    }

    // Make the move
    const validPromotion = validatePromotion(promotion);
    const result = makeMove(this.chess, from, to, validPromotion);

    if (!result.success) {
      safeSend(ws, { type: ServerMessageType.Error, code: "INVALID_MOVE", message: result.error || "Invalid move" });
      return;
    }

    // Apply increment
    if (this.game.increment > 0) {
      if (color === "white") {
        this.game.whiteTimeMs += this.game.increment;
      } else {
        this.game.blackTimeMs += this.game.increment;
      }
    }

    // Update game state
    this.game.fen = this.chess.fen();
    this.game.pgn = this.chess.pgn();
    this.game.turn = color === "white" ? "black" : "white";
    this.game.moveCount++;
    this.game.lastMoveAt = now;

    // Update position history for repetition detection
    const positionKey = getPositionKey(this.game.fen);
    const posCount = (this.game.positionHistory.get(positionKey) || 0) + 1;
    this.game.positionHistory.set(positionKey, posCount);

    // Update halfmove clock
    if (result.captured || this.chess.history({ verbose: true }).slice(-1)[0]?.piece === "p") {
      this.game.halfMoveClock = 0;
    } else {
      this.game.halfMoveClock++;
    }

    // Clear pending draw offer on move
    this.game.pendingDrawOffer = undefined;

    // Create move info
    const moveInfo: MoveInfo = {
      from,
      to,
      promotion: validPromotion,
      san: result.san!,
      fen: this.game.fen,
      isCheck: result.isCheck!,
      isCheckmate: result.isCheckmate!,
      capturedPiece: result.captured,
      timestamp: now,
    };

    this.game.moveHistory.push(moveInfo);

    await this.persistState();

    // Broadcast move
    this.broadcastToPlayers({ type: ServerMessageType.MoveMade, move: moveInfo, gameState: this.serializeGameState() });

    // Check game end conditions
    const gameEnded = await this.checkGameEndConditions();

    // If game didn't end and it's bot's turn, schedule bot move
    if (!gameEnded) {
      const nextPlayer = this.game.turn === "white" ? this.game.white : this.game.black;
      if (nextPlayer.isBot) {
        setTimeout(() => this.makeBotMove(), this.getBotThinkTime());
      }
    }
  }

  /**
   * Check all game end conditions.
   */
  private async checkGameEndConditions(): Promise<boolean> {
    if (!this.game || !this.chess) return false;

    // Checkmate
    if (this.chess.isCheckmate()) {
      const winner: Color = this.game.turn === "white" ? "black" : "white";
      await this.endGame(winner, "checkmate");
      return true;
    }

    // Stalemate
    if (this.chess.isStalemate()) {
      await this.endGame("draw", "stalemate");
      return true;
    }

    // Insufficient material
    if (this.chess.isInsufficientMaterial()) {
      await this.endGame("draw", "insufficient_material");
      return true;
    }

    // Fivefold repetition (automatic)
    const positionKey = getPositionKey(this.game.fen);
    if ((this.game.positionHistory.get(positionKey) || 0) >= 5) {
      await this.endGame("draw", "fivefold_repetition");
      return true;
    }

    // 75-move rule (automatic)
    if (this.game.halfMoveClock >= 150) {
      await this.endGame("draw", "seventy_five_move");
      return true;
    }

    // Notify about claimable draws
    if ((this.game.positionHistory.get(positionKey) || 0) >= 3) {
      this.broadcastToPlayers({ type: ServerMessageType.DrawClaimAvailable, reason: DrawClaimReason.ThreefoldRepetition });
    }

    if (this.game.halfMoveClock >= 100) {
      this.broadcastToPlayers({ type: ServerMessageType.FiftyMoveWarning, halfMoves: this.game.halfMoveClock });
    }

    return false;
  }

  /**
   * Handle timeout.
   */
  private async handleTimeout(color: Color): Promise<void> {
    if (!this.game || !this.chess) return;

    const opponent: Color = color === "white" ? "black" : "white";

    // Check if opponent has sufficient material
    const opponentChessColor = opponent === "white" ? "w" : "b";
    if (!colorHasSufficientMaterial(this.chess, opponentChessColor)) {
      await this.endGame("draw", "timeout_vs_insufficient");
    } else {
      await this.endGame(opponent, "timeout");
    }
  }

  /**
   * Handle draw offer.
   */
  private async handleDrawOffer(color: Color): Promise<void> {
    if (!this.game || this.game.status !== "active") return;

    // Don't allow if there's already a pending offer
    if (this.game.pendingDrawOffer) {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "DRAW_ALREADY_OFFERED", message: "A draw offer is already pending" });
      }
      return;
    }

    // Check cooldown - enforce DRAW_OFFER_COOLDOWN_MS between offers from same player
    const now = Date.now();
    const lastOfferTime = this.game.lastDrawOfferAt?.[color];
    if (lastOfferTime && now - lastOfferTime < RATE_LIMITS.DRAW_OFFER_COOLDOWN_MS) {
      const remainingMs = RATE_LIMITS.DRAW_OFFER_COOLDOWN_MS - (now - lastOfferTime);
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, {
          type: ServerMessageType.Error,
          code: "DRAW_OFFER_COOLDOWN",
          message: `Please wait ${Math.ceil(remainingMs / 1000)} seconds before offering another draw`
        });
      }
      return;
    }

    this.game.pendingDrawOffer = color;
    // Track when this player last offered a draw
    if (!this.game.lastDrawOfferAt) {
      this.game.lastDrawOfferAt = { white: 0, black: 0 };
    }
    this.game.lastDrawOfferAt[color] = now;

    await this.persistState();

    this.broadcastToPlayers({ type: ServerMessageType.DrawOffered, by: color });
  }

  /**
   * Handle draw accept.
   */
  private async handleDrawAccept(color: Color): Promise<void> {
    if (!this.game || this.game.status !== "active") return;

    if (!this.game.pendingDrawOffer) {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "NO_DRAW_OFFER", message: "No draw offer to accept" });
      }
      return;
    }

    if (this.game.pendingDrawOffer === color) {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "CANNOT_ACCEPT_OWN_DRAW", message: "Cannot accept your own draw offer" });
      }
      return;
    }

    await this.endGame("draw", "draw_agreement");
  }

  /**
   * Handle draw decline.
   */
  private async handleDrawDecline(color: Color): Promise<void> {
    if (!this.game) return;

    if (this.game.pendingDrawOffer && this.game.pendingDrawOffer !== color) {
      this.game.pendingDrawOffer = undefined;
      await this.persistState();
      this.broadcastToPlayers({ type: ServerMessageType.DrawDeclined });
    }
  }

  /**
   * Handle draw claim (50-move or threefold).
   */
  private async handleDrawClaim(color: Color, reason: DrawClaimReason): Promise<void> {
    if (!this.game || this.game.status !== "active") return;

    if (reason === DrawClaimReason.FiftyMove && this.game.halfMoveClock >= 100) {
      await this.endGame("draw", "fifty_move");
    } else if (reason === DrawClaimReason.ThreefoldRepetition) {
      const positionKey = getPositionKey(this.game.fen);
      if ((this.game.positionHistory.get(positionKey) || 0) >= 3) {
        await this.endGame("draw", "threefold_repetition");
      }
    } else {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "DRAW_NOT_CLAIMABLE", message: "Draw cannot be claimed" });
      }
    }
  }

  /**
   * Handle resignation.
   */
  private async handleResign(color: Color): Promise<void> {
    if (!this.game || this.game.status !== "active") return;

    const winner: Color = color === "white" ? "black" : "white";
    await this.endGame(winner, "resignation");
  }

  /**
   * Handle abort.
   */
  private async handleAbort(color: Color): Promise<void> {
    if (!this.game) return;

    // Can only abort before move 2
    if (this.game.moveCount >= GAME.ABORT_BEFORE_MOVE) {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "CANNOT_ABORT", message: "Cannot abort after moves have been made" });
      }
      return;
    }

    await this.endGame(null, "abort");
  }

  /**
   * Handle rematch offer.
   */
  private async handleRematchOffer(color: Color): Promise<void> {
    if (!this.game || this.game.status !== "finished") return;

    if (this.game.pendingRematchOffer === color) {
      return; // Already offered
    }

    // If opponent already offered, accept
    if (this.game.pendingRematchOffer) {
      await this.handleRematchAccept(color);
      return;
    }

    this.game.pendingRematchOffer = color;
    this.pendingTimeouts.rematchDeadline = Date.now() + GAME.REMATCH_TIMEOUT_MS;

    await this.persistState();
    await this.scheduleNextAlarm();

    this.broadcastToPlayers({ type: ServerMessageType.RematchOffered, by: color });
  }

  /**
   * Handle rematch accept.
   */
  private async handleRematchAccept(color: Color): Promise<void> {
    if (!this.game || this.game.status !== "finished") return;

    if (!this.game.pendingRematchOffer) {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "NO_REMATCH_OFFER", message: "No rematch offer" });
      }
      return;
    }

    if (this.game.pendingRematchOffer === color) {
      const conn = this.connections.get(color);
      if (conn?.ws) {
        safeSend(conn.ws, { type: ServerMessageType.Error, code: "CANNOT_ACCEPT_OWN_REMATCH", message: "Cannot accept your own rematch offer" });
      }
      return;
    }

    // Start new game with swapped colors
    const newGameId = crypto.randomUUID();
    const timeControl = TIME_CONTROLS[this.game.tournamentType];
    const now = Date.now();

    // Swap colors
    const newWhite = { ...this.game.black };
    const newBlack = { ...this.game.white };

    this.chess = new Chess();

    this.game = {
      gameId: newGameId,
      tournamentType: this.game.tournamentType,
      white: newWhite,
      black: newBlack,
      fen: this.chess.fen(),
      pgn: "",
      moveHistory: [],
      whiteTimeMs: timeControl.initial,
      blackTimeMs: timeControl.initial,
      lastMoveAt: now,
      increment: timeControl.increment,
      status: "waiting",
      turn: "white",
      moveCount: 0,
      positionHistory: new Map([[getPositionKey(this.chess.fen()), 1]]),
      halfMoveClock: 0,
      startedAt: now,
    };

    this.pendingTimeouts = {
      disconnectTimeouts: { white: null, black: null },
      rematchDeadline: null,
      cleanupDeadline: null,
      noShowDeadline: now + GAME.NO_SHOW_TIMEOUT_MS,
      bothDisconnectedDeadline: null,
    };

    await this.persistState();

    // Notify players with their correct new colors
    // Since colors are swapped, the player who was white is now black and vice versa
    const whiteConn = this.connections.get("white");
    const blackConn = this.connections.get("black");

    // Send each player their correct new color
    // Old white player (now in whiteConn) becomes black in the new game
    // Old black player (now in blackConn) becomes white in the new game
    if (whiteConn?.connected && whiteConn.ws) {
      safeSend(whiteConn.ws, {
        type: ServerMessageType.RematchStarting,
        gameId: newGameId,
        yourColor: "black", // Old white is now black
      });
    }
    if (blackConn?.connected && blackConn.ws) {
      safeSend(blackConn.ws, {
        type: ServerMessageType.RematchStarting,
        gameId: newGameId,
        yourColor: "white", // Old black is now white
      });
    }

    // Check if both are still connected to start
    const whiteReady = whiteConn?.connected || newWhite.isBot;
    const blackReady = blackConn?.connected || newBlack.isBot;

    if (whiteReady && blackReady) {
      await this.startGame();
    } else {
      await this.scheduleNextAlarm();
    }
  }

  /**
   * Handle rematch decline.
   */
  private async handleRematchDecline(color: Color): Promise<void> {
    if (!this.game || !this.game.pendingRematchOffer) return;

    if (this.game.pendingRematchOffer !== color) {
      this.game.pendingRematchOffer = undefined;
      this.pendingTimeouts.rematchDeadline = null;
      await this.persistState();
      this.broadcastToPlayers({ type: ServerMessageType.RematchDeclined });
    }
  }

  /**
   * End the game.
   */
  private async endGame(winner: Color | "draw" | null, reason: ResultReason): Promise<void> {
    if (!this.game) return;

    this.game.status = "finished";
    this.game.endedAt = Date.now();

    // Calculate ELO changes (skip for bots or aborts)
    let eloResult: ReturnType<typeof calculateGameEloChanges> = {
      whiteChange: 0,
      blackChange: 0,
      whiteNew: this.game.white.elo,
      blackNew: this.game.black.elo,
    };

    const shouldCalculateElo =
      !this.game.white.isBot &&
      !this.game.black.isBot &&
      reason !== "abort" &&
      reason !== "no_show" &&
      this.game.moveCount >= 2;

    if (shouldCalculateElo) {
      const winnerResult = winner === "white" ? "white" : winner === "black" ? "black" : "draw";
      eloResult = calculateGameEloChanges(this.game.white.elo, this.game.black.elo, winnerResult);
    }

    // Determine result string
    let resultString: GameResult;
    if (winner === "white") resultString = "1-0";
    else if (winner === "black") resultString = "0-1";
    else if (winner === "draw") resultString = "1/2-1/2";
    else resultString = "*";

    this.game.result = resultString;
    this.game.resultReason = reason;

    const gameEndResult: GameEndResult = {
      winner,
      reason,
      whiteEloChange: eloResult.whiteChange,
      blackEloChange: eloResult.blackChange,
      whiteEloNew: eloResult.whiteNew,
      blackEloNew: eloResult.blackNew,
    };

    // Clear timeouts
    this.pendingTimeouts.disconnectTimeouts = { white: null, black: null };
    this.pendingTimeouts.noShowDeadline = null;
    this.pendingTimeouts.bothDisconnectedDeadline = null;

    // Set cleanup deadline
    this.pendingTimeouts.cleanupDeadline = Date.now() + GAME.CLEANUP_TIMEOUT_MS;

    await this.persistState();

    // Broadcast game over
    this.broadcastToPlayers({ type: ServerMessageType.GameOver, result: gameEndResult });

    await this.scheduleNextAlarm();
  }

  /**
   * Make a bot move.
   */
  private async makeBotMove(): Promise<void> {
    if (!this.game || !this.chess || this.game.status !== "active") return;

    const currentPlayer = this.game.turn === "white" ? this.game.white : this.game.black;
    if (!currentPlayer.isBot) return;

    // Get legal moves
    const moves = this.chess.moves({ verbose: true });
    if (moves.length === 0) return;

    // Simple move selection based on difficulty
    let selectedMove;
    const difficulty = currentPlayer.botLevel || "medium";

    if (difficulty === "easy") {
      // Random move
      selectedMove = moves[Math.floor(Math.random() * moves.length)];
    } else if (difficulty === "hard") {
      // Prioritize captures, checks, then random
      const captures = moves.filter((m) => m.captured);
      const checks = moves.filter((m) => {
        const tempChess = new Chess(this.chess!.fen());
        tempChess.move(m);
        return tempChess.isCheck();
      });

      if (checks.length > 0) {
        selectedMove = checks[Math.floor(Math.random() * checks.length)];
      } else if (captures.length > 0) {
        selectedMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
      }
    } else {
      // Medium: slight preference for captures
      const captures = moves.filter((m) => m.captured);
      if (captures.length > 0 && Math.random() < 0.7) {
        selectedMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
      }
    }

    // Simulate the move as if from the bot
    const color = this.game.turn;

    // Create a fake WebSocket for the bot move handler
    // We'll directly call the move logic instead
    await this.processBotMove(color, selectedMove.from, selectedMove.to, selectedMove.promotion);
  }

  /**
   * Process a bot move (similar to handleMove but without WebSocket).
   * Includes retry logic with fallback to random legal move and eventual resignation.
   */
  private async processBotMove(
    color: Color,
    from: string,
    to: string,
    promotion?: string,
    retryCount: number = 0
  ): Promise<void> {
    if (!this.game || !this.chess || this.game.status !== "active") return;

    const now = Date.now();
    const elapsed = now - this.game.lastMoveAt;

    // Update clock
    if (color === "white") {
      this.game.whiteTimeMs -= elapsed;
      if (this.game.whiteTimeMs <= 0) {
        await this.handleTimeout("white");
        return;
      }
    } else {
      this.game.blackTimeMs -= elapsed;
      if (this.game.blackTimeMs <= 0) {
        await this.handleTimeout("black");
        return;
      }
    }

    // Make move
    const validPromotion = validatePromotion(promotion);
    const result = makeMove(this.chess, from, to, validPromotion);

    if (!result.success) {
      console.error("[GameRoom] Bot made invalid move:", from, to, "retry:", retryCount);

      // Retry with a random legal move (max 3 retries)
      if (retryCount < 3) {
        const legalMoves = this.chess.moves({ verbose: true });
        if (legalMoves.length > 0) {
          const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
          console.log("[GameRoom] Bot retrying with random move:", randomMove.from, randomMove.to);
          // Reset clock elapsed time for retry to avoid double-deduction
          this.game.lastMoveAt = Date.now();
          await this.processBotMove(color, randomMove.from, randomMove.to, randomMove.promotion, retryCount + 1);
          return;
        }
      }

      // All retries failed - bot resigns
      console.error("[GameRoom] Bot failed to make valid move after retries, resigning");
      await this.handleResign(color);
      return;
    }

    // Apply increment
    if (this.game.increment > 0) {
      if (color === "white") {
        this.game.whiteTimeMs += this.game.increment;
      } else {
        this.game.blackTimeMs += this.game.increment;
      }
    }

    // Update state
    this.game.fen = this.chess.fen();
    this.game.pgn = this.chess.pgn();
    this.game.turn = color === "white" ? "black" : "white";
    this.game.moveCount++;
    this.game.lastMoveAt = now;

    const positionKey = getPositionKey(this.game.fen);
    const posCount = (this.game.positionHistory.get(positionKey) || 0) + 1;
    this.game.positionHistory.set(positionKey, posCount);

    if (result.captured) {
      this.game.halfMoveClock = 0;
    } else {
      this.game.halfMoveClock++;
    }

    const moveInfo: MoveInfo = {
      from,
      to,
      promotion: validPromotion,
      san: result.san!,
      fen: this.game.fen,
      isCheck: result.isCheck!,
      isCheckmate: result.isCheckmate!,
      capturedPiece: result.captured,
      timestamp: now,
    };

    this.game.moveHistory.push(moveInfo);

    await this.persistState();

    this.broadcastToPlayers({ type: ServerMessageType.MoveMade, move: moveInfo, gameState: this.serializeGameState() });

    const gameEnded = await this.checkGameEndConditions();

    if (!gameEnded) {
      const nextPlayer = this.game.turn === "white" ? this.game.white : this.game.black;
      if (nextPlayer.isBot) {
        setTimeout(() => this.makeBotMove(), this.getBotThinkTime());
      }
    }
  }

  /**
   * Get bot thinking time based on difficulty.
   */
  private getBotThinkTime(): number {
    if (!this.game) return 1000;

    const currentPlayer = this.game.turn === "white" ? this.game.white : this.game.black;
    const difficulty = currentPlayer.botLevel || "medium";
    const baseTime = BOT_DIFFICULTY[difficulty]?.thinkTimeMs || 1000;

    // Add some randomness
    return baseTime + Math.random() * 500;
  }

  /**
   * Schedule the next alarm.
   */
  private async scheduleNextAlarm(): Promise<void> {
    const now = Date.now();
    let nextAlarm: number | null = null;

    // Find earliest deadline
    const deadlines: number[] = [];

    if (this.game?.status === "active") {
      // Clock update every 100ms
      deadlines.push(now + GAME.CLOCK_TICK_MS);
    }

    if (this.pendingTimeouts.noShowDeadline) {
      deadlines.push(this.pendingTimeouts.noShowDeadline);
    }

    for (const deadline of Object.values(this.pendingTimeouts.disconnectTimeouts)) {
      if (deadline) deadlines.push(deadline);
    }

    if (this.pendingTimeouts.bothDisconnectedDeadline) {
      deadlines.push(this.pendingTimeouts.bothDisconnectedDeadline);
    }

    if (this.pendingTimeouts.rematchDeadline) {
      deadlines.push(this.pendingTimeouts.rematchDeadline);
    }

    if (this.pendingTimeouts.cleanupDeadline) {
      deadlines.push(this.pendingTimeouts.cleanupDeadline);
    }

    if (deadlines.length > 0) {
      nextAlarm = Math.min(...deadlines);
    }

    // Delete existing alarm and set new one
    await this.ctx.storage.deleteAlarm();

    if (nextAlarm) {
      await this.ctx.storage.setAlarm(nextAlarm);
    }
  }

  /**
   * Cleanup the game room.
   */
  private async cleanup(): Promise<void> {
    // Close all connections
    for (const conn of this.connections.values()) {
      if (conn.ws) {
        safeClose(conn.ws, 1000, "Game ended");
      }
    }

    // Clear state
    await this.ctx.storage.deleteAll();
  }

  /**
   * Serialize game state for client.
   */
  private serializeGameState(): SerializedGameState {
    if (!this.game) {
      throw new Error("No game state");
    }

    return {
      gameId: this.game.gameId,
      tournamentType: this.game.tournamentType,
      fen: this.game.fen,
      pgn: this.game.pgn,
      turn: this.game.turn,
      whiteTimeMs: this.game.whiteTimeMs,
      blackTimeMs: this.game.blackTimeMs,
      lastMoveAt: this.game.lastMoveAt,
      serverTime: Date.now(), // Server timestamp for clock sync
      status: this.game.status,
      moveCount: this.game.moveCount,
      moveHistory: this.game.moveHistory,
      lastMove:
        this.game.moveHistory.length > 0
          ? {
              from: this.game.moveHistory[this.game.moveHistory.length - 1].from,
              to: this.game.moveHistory[this.game.moveHistory.length - 1].to,
            }
          : undefined,
      pendingDrawOffer: this.game.pendingDrawOffer,
      white: {
        id: this.game.white.id,
        displayName: this.game.white.displayName,
        elo: this.game.white.elo,
        isBot: this.game.white.isBot,
      },
      black: {
        id: this.game.black.id,
        displayName: this.game.black.displayName,
        elo: this.game.black.elo,
        isBot: this.game.black.isBot,
      },
    };
  }

  /**
   * Broadcast message to all connected players.
   */
  private broadcastToPlayers(message: ServerMessage): void {
    for (const conn of this.connections.values()) {
      if (conn.connected && conn.ws) {
        safeSend(conn.ws, message);
      }
    }
  }
}
