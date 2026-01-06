import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../env.d";
import { ELO, TOURNAMENT_TYPES } from "../types/constants";
import {
  createToken,
  verifyToken,
  TokenError,
  type EloRatings,
} from "@chess-blitz/shared";

// Zod schema for /update-elo endpoint
const updateEloSchema = z.object({
  tournamentType: z.enum(TOURNAMENT_TYPES),
  newElo: z.number().min(ELO.FLOOR),
});

const authRoutes = new Hono<{ Bindings: Env }>();

// Default ELO ratings for new guests
const DEFAULT_ELO: EloRatings = {
  bullet: ELO.STARTING,
  blitz: ELO.STARTING,
  rapid: ELO.STARTING,
  classical: ELO.STARTING,
};

/**
 * POST /auth/guest
 * Create a guest player session with ELO stored in token
 */
authRoutes.post("/guest", async (c) => {
  try {
    const playerId = crypto.randomUUID();
    const displayName = `Guest_${playerId.slice(0, 8)}`;
    const elo = { ...DEFAULT_ELO };

    const token = await createToken({
      playerId,
      displayName,
      elo,
    });

    // Calculate expiresAt (10 days from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

    return c.json({
      token,
      playerId,
      displayName,
      elo,
      expiresAt: expiresAt * 1000,
    });
  } catch (error) {
    console.error("[Auth] Failed to create guest session:", error);
    return c.json({ error: "Failed to create session" }, 500);
  }
});

/**
 * POST /auth/refresh
 * Refresh an existing token (preserves ELO from old token)
 */
authRoutes.post("/refresh", async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const oldToken = authHeader.slice(7);
    const oldPayload = await verifyToken(oldToken);

    // Preserve ELO from old token, or use default if missing
    const elo = oldPayload.elo || { ...DEFAULT_ELO };

    const token = await createToken({
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
    });

    // Calculate expiresAt (10 days from now)
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 24 * 60 * 60;

    return c.json({
      token,
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
      expiresAt: expiresAt * 1000,
    });
  } catch (error) {
    if (error instanceof TokenError) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: "Invalid token" }, 401);
  }
});

/**
 * POST /auth/update-elo
 * Update ELO in token after a game (called by client with game result)
 * This allows ELO to persist across sessions in the token
 */
authRoutes.post("/update-elo", zValidator("json", updateEloSchema), async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const oldToken = authHeader.slice(7);
    const oldPayload = await verifyToken(oldToken);

    const { tournamentType, newElo } = c.req.valid("json");

    // Update ELO for the specific tournament type
    const elo = oldPayload.elo || { ...DEFAULT_ELO };
    elo[tournamentType] = newElo;

    const token = await createToken({
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
    });

    return c.json({
      token,
      elo,
    });
  } catch (error) {
    if (error instanceof TokenError) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: "Invalid token" }, 401);
  }
});

export { authRoutes };
