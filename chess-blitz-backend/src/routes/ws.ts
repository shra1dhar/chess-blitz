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

  // CrazyGames platform user info (optional, passed from frontend)
  const platformUsername = c.req.query("platformUsername");
  const platformAvatarUrl = c.req.query("platformAvatarUrl");
  if (platformUsername) {
    url.searchParams.set("platformUsername", platformUsername);
  }
  if (platformAvatarUrl) {
    url.searchParams.set("platformAvatarUrl", platformAvatarUrl);
  }

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
 * GET /ws/lobby/:lobbyId
 * WebSocket upgrade for private lobby (CrazyGames "Play with Friends")
 *
 * Query params:
 * - token: JWT auth token
 * - action: 'create' | 'join'
 * - tournamentType: Required when action='create'
 */
wsRoutes.get("/lobby/:lobbyId", async (c) => {
  const lobbyId = c.req.param("lobbyId");
  const token = c.req.query("token");
  const action = c.req.query("action");
  const tournamentType = c.req.query("tournamentType");

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

  // Validate action
  if (!action || !['create', 'join'].includes(action)) {
    return c.json({ error: "Action required (create/join)" }, 400);
  }

  // Validate lobbyId format (alphanumeric, dashes, max 36 chars for UUID)
  if (!lobbyId || lobbyId.length > 36 || !/^[a-zA-Z0-9-]+$/.test(lobbyId)) {
    return c.json({ error: "Invalid lobby ID" }, 400);
  }

  // Validate tournamentType if creating
  if (action === 'create') {
    if (!tournamentType || !TOURNAMENT_TYPES.includes(tournamentType as TournamentType)) {
      return c.json({ error: "Valid tournament type required for create" }, 400);
    }
  }

  // Get player ELO from JWT payload
  const playerElo = tournamentType
    ? (payload.elo?.[tournamentType as TournamentType] || ELO.STARTING)
    : ELO.STARTING;

  // Get private lobby DO
  const privateLobbyId = c.env.PRIVATE_LOBBY.idFromName(lobbyId);
  const getStub = () => c.env.PRIVATE_LOBBY.get(privateLobbyId);

  // Build URL with player info
  const url = new URL(c.req.url);
  url.searchParams.set("playerId", payload.playerId);
  url.searchParams.set("displayName", payload.displayName);
  url.searchParams.set("elo", playerElo.toString());
  url.searchParams.set("action", action);
  if (tournamentType) {
    url.searchParams.set("tournamentType", tournamentType);
  }

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
