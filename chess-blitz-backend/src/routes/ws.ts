import { Hono } from "hono";
import { verify } from "hono/jwt";
import type { Env } from "../env.d";
import { TOURNAMENT_TYPES, TournamentType, ELO } from "../types/constants";
import type { AuthPayload } from "../types/player";

const wsRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET /ws/queue/:tournamentType
 * WebSocket upgrade for matchmaking queue
 *
 * Query params:
 * - token: JWT auth token
 */
wsRoutes.get("/queue/:tournamentType", async (c) => {
  const tournamentType = c.req.param("tournamentType");
  const token = c.req.query("token");

  // Validate token
  if (!token) {
    return c.json({ error: "Token required" }, 401);
  }

  let payload: AuthPayload;
  try {
    payload = (await verify(token, c.env.JWT_SECRET)) as unknown as AuthPayload;

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: "Token expired" }, 401);
    }
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Validate tournament type
  if (!TOURNAMENT_TYPES.includes(tournamentType as TournamentType)) {
    return c.json({ error: "Invalid tournament type" }, 400);
  }

  // Get player ELO from JWT payload (guest-only mode)
  const playerElo = payload.elo?.[tournamentType as TournamentType] || ELO.STARTING;

  // Get matchmaking queue DO
  const queueId = c.env.MATCHMAKING_QUEUE.idFromName(`queue-${tournamentType}`);
  const queue = c.env.MATCHMAKING_QUEUE.get(queueId);

  // Build URL with player info
  const url = new URL(c.req.url);
  url.searchParams.set("playerId", payload.playerId);
  url.searchParams.set("displayName", payload.displayName);
  url.searchParams.set("elo", playerElo.toString());
  url.searchParams.set("tournament", tournamentType);

  // Forward to DO
  return queue.fetch(
    new Request(url.toString(), {
      headers: c.req.raw.headers,
    })
  );
});

/**
 * GET /ws/game/:gameId
 * WebSocket upgrade for game room
 *
 * Query params:
 * - token: JWT auth token
 * - color: Player's color (white/black)
 */
wsRoutes.get("/game/:gameId", async (c) => {
  const gameId = c.req.param("gameId");
  const token = c.req.query("token");
  const color = c.req.query("color");

  // Validate token
  if (!token) {
    return c.json({ error: "Token required" }, 401);
  }

  let payload: AuthPayload;
  try {
    payload = (await verify(token, c.env.JWT_SECRET)) as unknown as AuthPayload;

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: "Token expired" }, 401);
    }
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }

  // Validate color
  if (!color || !["white", "black"].includes(color)) {
    return c.json({ error: "Color required (white/black)" }, 400);
  }

  // Validate gameId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(gameId)) {
    return c.json({ error: "Invalid game ID" }, 400);
  }

  // Get game room DO
  const gameRoomId = c.env.GAME_ROOM.idFromName(gameId);
  const gameRoom = c.env.GAME_ROOM.get(gameRoomId);

  // Build URL with player info
  const url = new URL(c.req.url);
  url.searchParams.set("playerId", payload.playerId);
  url.searchParams.set("color", color);

  // Forward to DO
  return gameRoom.fetch(
    new Request(url.toString(), {
      headers: c.req.raw.headers,
    })
  );
});

/**
 * GET /ws/queue/:tournamentType/status
 * Get queue status without connecting
 */
wsRoutes.get("/queue/:tournamentType/status", async (c) => {
  const tournamentType = c.req.param("tournamentType");

  // Validate tournament type
  if (!TOURNAMENT_TYPES.includes(tournamentType as TournamentType)) {
    return c.json({ error: "Invalid tournament type" }, 400);
  }

  // Get queue status
  const queueId = c.env.MATCHMAKING_QUEUE.idFromName(`queue-${tournamentType}`);
  const queue = c.env.MATCHMAKING_QUEUE.get(queueId);

  const response = await queue.fetch(new Request("https://internal/status"));
  return response;
});

/**
 * GET /ws/game/:gameId/state
 * Get game state without connecting
 */
wsRoutes.get("/game/:gameId/state", async (c) => {
  const gameId = c.req.param("gameId");

  // Validate gameId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(gameId)) {
    return c.json({ error: "Invalid game ID" }, 400);
  }

  // Get game state
  const gameRoomId = c.env.GAME_ROOM.idFromName(gameId);
  const gameRoom = c.env.GAME_ROOM.get(gameRoomId);

  const response = await gameRoom.fetch(new Request("https://internal/state"));
  return response;
});

export { wsRoutes };
