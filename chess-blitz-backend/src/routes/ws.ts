import { Hono } from "hono";
import type { Env } from "../env.d";
import { TOURNAMENT_TYPES, TournamentType, ELO } from "../types/constants";
import { verifyToken, TokenError, type TokenPayload } from "@chess-blitz/shared";
import { fetchWithRetry } from "../utils/do-helper";


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

  let payload: TokenPayload;
  try {
    payload = await verifyToken(token);
  } catch (error) {
    if (error instanceof TokenError) {
      return c.json({ error: error.message }, 401);
    }
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


  // Use fetchWithRetry helper
  const getStub = () => c.env.MATCHMAKING_QUEUE.get(queueId);


  // Build URL with player info
  const url = new URL(c.req.url);
  url.searchParams.set("playerId", payload.playerId);
  url.searchParams.set("displayName", payload.displayName);
  url.searchParams.set("elo", playerElo.toString());
  url.searchParams.set("tournament", tournamentType);

  // Forward to DO with retry logic
  return fetchWithRetry(
    getStub,
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

  let payload: TokenPayload;
  try {
    payload = await verifyToken(token);
  } catch (error) {
    if (error instanceof TokenError) {
      return c.json({ error: error.message }, 401);
    }
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

  const getStub = () => c.env.GAME_ROOM.get(gameRoomId);


  // Build URL with player info
  const url = new URL(c.req.url);
  url.searchParams.set("playerId", payload.playerId);
  url.searchParams.set("color", color);

  // Forward to DO with retry logic
  return fetchWithRetry(
    getStub,
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

  const getStub = () => c.env.MATCHMAKING_QUEUE.get(queueId);

  const response = await fetchWithRetry(getStub, new Request("https://internal/status"));
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

  const getStub = () => c.env.GAME_ROOM.get(gameRoomId);

  const response = await fetchWithRetry(getStub, new Request("https://internal/state"));
  return response;
});

export { wsRoutes };
