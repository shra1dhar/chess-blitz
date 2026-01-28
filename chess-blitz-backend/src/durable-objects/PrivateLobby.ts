import { DurableObject } from "cloudflare:workers";
import type { Env } from "../env.d";
import type { TournamentType, Color } from "../types/constants";
import {
  ClientMessageType,
  ServerMessageType,
  type ClientMessage,
  type ServerMessage,
  type LobbyPlayerInfo,
  type LobbyStateInfo,
} from "../types/messages";
import { safeSend, safeClose, broadcast, parseClientMessage } from "../utils/websocket";
import { checkRateLimit, RATE_LIMIT_CONFIGS, createRateLimitState } from "../utils/rate-limiter";
import type { RateLimitState } from "../utils/rate-limiter";

interface LobbyPlayer {
  playerId: string;
  displayName: string;
  elo: number;
  ws: WebSocket;
  /** CrazyGames platform username (if available) */
  platformUsername?: string;
  /** CrazyGames platform avatar URL (if available) */
  platformAvatarUrl?: string;
}

interface LobbyState {
  lobbyId: string;
  host: LobbyPlayer | null;
  guest: LobbyPlayer | null;
  tournamentType: TournamentType;
  status: 'waiting' | 'ready' | 'starting' | 'closed';
  createdAt: number;
}

interface WebSocketAttachment {
  playerId: string;
  isHost: boolean;
  rateLimit: {
    message: RateLimitState;
  };
}

/**
 * PrivateLobby Durable Object
 *
 * Handles private 2-player lobbies for CrazyGames "Play with Friends" feature.
 * - Host creates lobby and can change time control
 * - Guest joins via invite link
 * - When both players ready, creates GameRoom and transitions
 * - Auto-cleanup after 5 minutes if guest doesn't join
 */
export class PrivateLobby extends DurableObject<Env> {
  private lobby: LobbyState | null = null;
  private cleanupTimeout: number | null = null;
  private readonly LOBBY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Restore state on wake
    this.ctx.blockConcurrencyWhile(async () => {
      await this.restoreState();
      this.restoreAllConnections();
    });

    // Auto ping/pong
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  private async restoreState(): Promise<void> {
    const stored = await this.ctx.storage.get<LobbyState>("lobby");
    if (stored) {
      this.lobby = {
        ...stored,
        host: null,
        guest: null,
      };
    }
  }

  private restoreAllConnections(): void {
    const connections = this.ctx.getWebSockets();
    for (const ws of connections) {
      const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
      if (!attachment || !this.lobby) continue;

      const player: LobbyPlayer = {
        playerId: attachment.playerId,
        displayName: "Reconnected", // Will be updated from query params on reconnect
        elo: 1200,
        ws,
      };

      if (attachment.isHost) {
        this.lobby.host = player;
      } else {
        this.lobby.guest = player;
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      return this.handleWebSocketUpgrade(request);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const playerId = url.searchParams.get("playerId");
    const displayName = url.searchParams.get("displayName");
    const elo = parseInt(url.searchParams.get("elo") || "1200", 10);
    const action = url.searchParams.get("action") as 'create' | 'join' | null;
    const tournamentTypeParam = url.searchParams.get("tournamentType") as TournamentType | null;
    // CrazyGames platform user info (optional)
    const platformUsername = url.searchParams.get("platformUsername") || undefined;
    const platformAvatarUrl = url.searchParams.get("platformAvatarUrl") || undefined;

    if (!playerId || !displayName || !action) {
      return new Response("Missing required parameters", { status: 400 });
    }

    // Create lobby if doesn't exist
    if (!this.lobby) {
      if (action !== 'create' || !tournamentTypeParam) {
        return new Response("Lobby does not exist", { status: 404 });
      }

      this.lobby = {
        lobbyId: this.ctx.id.toString(),
        host: null,
        guest: null,
        tournamentType: tournamentTypeParam,
        status: 'waiting',
        createdAt: Date.now(),
      };

      await this.ctx.storage.put("lobby", {
        lobbyId: this.lobby.lobbyId,
        tournamentType: this.lobby.tournamentType,
        status: this.lobby.status,
        createdAt: this.lobby.createdAt,
      });

      // Set cleanup timeout
      this.scheduleCleanup();
    }

    // Check if lobby is already closed or full
    if (this.lobby.status === 'closed') {
      return new Response("Lobby is closed", { status: 410 });
    }

    if (this.lobby.status === 'starting') {
      return new Response("Game is starting", { status: 409 });
    }

    // Check if lobby is full
    if (action === 'join' && this.lobby.guest) {
      return new Response("Lobby is full", { status: 409 });
    }

    // Upgrade to WebSocket
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    const isHost = action === 'create' || (this.lobby.host === null && this.lobby.guest !== null);

    const attachment: WebSocketAttachment = {
      playerId,
      isHost,
      rateLimit: {
        message: createRateLimitState(),
      },
    };

    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    const player: LobbyPlayer = {
      playerId,
      displayName,
      elo,
      ws: server,
      platformUsername,
      platformAvatarUrl,
    };

    // Add player to lobby
    if (isHost) {
      this.lobby.host = player;
    } else {
      this.lobby.guest = player;
      this.lobby.status = 'ready';

      // Cancel cleanup timeout when guest joins
      if (this.cleanupTimeout !== null) {
        clearTimeout(this.cleanupTimeout);
        this.cleanupTimeout = null;
      }

      // Notify host that guest joined
      if (this.lobby.host) {
        safeSend(this.lobby.host.ws, {
          type: ServerMessageType.LobbyPlayerJoined,
          player: {
            id: player.playerId,
            displayName: player.displayName,
            elo: player.elo,
            platformUsername: player.platformUsername,
            platformAvatarUrl: player.platformAvatarUrl,
          },
        });
      }
    }

    // Send initial state to connecting player
    safeSend(server, {
      type: ServerMessageType.Connected,
      playerId,
      displayName,
    });

    safeSend(server, {
      type: ServerMessageType.LobbyState,
      lobby: this.getLobbyStateInfo(),
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const attachment = ws.deserializeAttachment() as WebSocketAttachment;
    if (!attachment) return;

    // Rate limiting
    if (!checkRateLimit(attachment.rateLimit.message, RATE_LIMIT_CONFIGS.MESSAGE)) {
      safeSend(ws, {
        type: ServerMessageType.Error,
        code: "rate_limit_exceeded",
        message: "Too many messages",
      });
      return;
    }

    const parsed = parseClientMessage(message);
    if (!parsed) {
      safeSend(ws, {
        type: ServerMessageType.Error,
        code: "invalid_message",
        message: "Invalid message format",
      });
      return;
    }

    await this.handleMessage(ws, parsed, attachment);
  }

  private async handleMessage(
    ws: WebSocket,
    message: ClientMessage,
    attachment: WebSocketAttachment
  ): Promise<void> {
    if (!this.lobby) return;

    switch (message.type) {
      case ClientMessageType.SetLobbyTournamentType:
        if (!attachment.isHost) {
          safeSend(ws, {
            type: ServerMessageType.Error,
            code: "permission_denied",
            message: "Only host can change tournament type",
          });
          return;
        }

        this.lobby.tournamentType = message.tournamentType;
        await this.ctx.storage.put("lobby", {
          lobbyId: this.lobby.lobbyId,
          tournamentType: this.lobby.tournamentType,
          status: this.lobby.status,
          createdAt: this.lobby.createdAt,
        });

        // Broadcast updated state
        this.broadcastLobbyState();
        break;

      case ClientMessageType.StartPrivateGame:
        if (!attachment.isHost) {
          safeSend(ws, {
            type: ServerMessageType.Error,
            code: "permission_denied",
            message: "Only host can start game",
          });
          return;
        }

        if (this.lobby.status !== 'ready') {
          safeSend(ws, {
            type: ServerMessageType.Error,
            code: "lobby_not_ready",
            message: "Waiting for guest to join",
          });
          return;
        }

        await this.startGame();
        break;

      case ClientMessageType.LeaveLobby:
        this.handlePlayerLeave(attachment.playerId);
        break;

      case ClientMessageType.Ping:
        safeSend(ws, { type: ServerMessageType.Pong });
        break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const attachment = ws.deserializeAttachment() as WebSocketAttachment | null;
    if (!attachment) return;

    this.handlePlayerLeave(attachment.playerId);
  }

  private handlePlayerLeave(playerId: string): void {
    if (!this.lobby) return;

    const isHost = this.lobby.host?.playerId === playerId;
    const isGuest = this.lobby.guest?.playerId === playerId;

    if (isHost) {
      // If host leaves, close lobby
      this.closeLobby("Host left the lobby");
    } else if (isGuest) {
      // If guest leaves, go back to waiting
      this.lobby.guest = null;
      this.lobby.status = 'waiting';

      // Notify host
      if (this.lobby.host) {
        safeSend(this.lobby.host.ws, {
          type: ServerMessageType.LobbyPlayerLeft,
        });
        this.broadcastLobbyState();
      }

      // Restart cleanup timeout
      this.scheduleCleanup();
    }
  }

  private async startGame(): Promise<void> {
    if (!this.lobby || !this.lobby.host || !this.lobby.guest) return;

    this.lobby.status = 'starting';
    this.broadcastLobbyState();

    // Randomly assign colors
    const [white, black] = Math.random() < 0.5
      ? [this.lobby.host, this.lobby.guest]
      : [this.lobby.guest, this.lobby.host];

    const gameId = crypto.randomUUID();

    try {
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
            tournamentType: this.lobby.tournamentType,
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
        opponent: {
          id: black.playerId,
          displayName: black.displayName,
          elo: black.elo,
          isBot: false,
        },
        color: "white" as Color,
      });

      safeSend(black.ws, {
        type: ServerMessageType.MatchFound,
        gameId,
        opponent: {
          id: white.playerId,
          displayName: white.displayName,
          elo: white.elo,
          isBot: false,
        },
        color: "black" as Color,
      });

      // Close lobby
      this.closeLobby("Game started");
    } catch (error) {
      console.error("[PrivateLobby] Failed to create game:", error);

      safeSend(this.lobby.host.ws, {
        type: ServerMessageType.Error,
        code: "game_creation_failed",
        message: "Failed to create game",
      });

      if (this.lobby.guest) {
        safeSend(this.lobby.guest.ws, {
          type: ServerMessageType.Error,
          code: "game_creation_failed",
          message: "Failed to create game",
        });
      }

      this.lobby.status = 'ready';
      this.broadcastLobbyState();
    }
  }

  private closeLobby(reason: string): void {
    if (!this.lobby) return;

    this.lobby.status = 'closed';

    // Notify all players
    const message: ServerMessage = {
      type: ServerMessageType.LobbyClosed,
      reason,
    };

    if (this.lobby.host) {
      safeSend(this.lobby.host.ws, message);
      safeClose(this.lobby.host.ws);
    }

    if (this.lobby.guest) {
      safeSend(this.lobby.guest.ws, message);
      safeClose(this.lobby.guest.ws);
    }

    // Clear cleanup timeout
    if (this.cleanupTimeout !== null) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    // Clear storage
    this.ctx.storage.deleteAll();
    this.lobby = null;
  }

  private scheduleCleanup(): void {
    if (this.cleanupTimeout !== null) {
      clearTimeout(this.cleanupTimeout);
    }

    this.cleanupTimeout = setTimeout(() => {
      this.closeLobby("Lobby expired (no guest joined)");
    }, this.LOBBY_TIMEOUT_MS) as unknown as number;
  }

  private broadcastLobbyState(): void {
    if (!this.lobby) return;

    const state = this.getLobbyStateInfo();
    const message: ServerMessage = {
      type: ServerMessageType.LobbyState,
      lobby: state,
    };

    if (this.lobby.host) {
      safeSend(this.lobby.host.ws, message);
    }

    if (this.lobby.guest) {
      safeSend(this.lobby.guest.ws, message);
    }
  }

  private getLobbyStateInfo(): LobbyStateInfo {
    if (!this.lobby) {
      throw new Error("Lobby not initialized");
    }

    return {
      lobbyId: this.lobby.lobbyId,
      host: this.lobby.host
        ? {
            id: this.lobby.host.playerId,
            displayName: this.lobby.host.displayName,
            elo: this.lobby.host.elo,
            platformUsername: this.lobby.host.platformUsername,
            platformAvatarUrl: this.lobby.host.platformAvatarUrl,
          }
        : { id: "", displayName: "Unknown", elo: 1200 },
      guest: this.lobby.guest
        ? {
            id: this.lobby.guest.playerId,
            displayName: this.lobby.guest.displayName,
            elo: this.lobby.guest.elo,
            platformUsername: this.lobby.guest.platformUsername,
            platformAvatarUrl: this.lobby.guest.platformAvatarUrl,
          }
        : null,
      tournamentType: this.lobby.tournamentType,
      status: this.lobby.status,
      createdAt: this.lobby.createdAt,
    };
  }
}
