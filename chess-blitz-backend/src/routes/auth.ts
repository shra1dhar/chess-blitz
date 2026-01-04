import { Hono } from "hono";
import { sign, verify } from "hono/jwt";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../env.d";
import { ELO, TOURNAMENT_TYPES } from "../types/constants";
import type { AuthPayload, EloRatings } from "../types/player";

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
 * Create a guest player session with ELO stored in JWT
 */
authRoutes.post("/guest", async (c) => {
  try {
    // Check if JWT_SECRET is configured
    if (!c.env.JWT_SECRET) {
      console.error("[Auth] JWT_SECRET is not configured. Create a .dev.vars file with JWT_SECRET=your-secret");
      return c.json({ error: "Server configuration error: JWT_SECRET missing" }, 500);
    }

    const playerId = crypto.randomUUID();
    const displayName = `Guest_${playerId.slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60; // 7 days

    const payload: AuthPayload = {
      playerId,
      displayName,
      elo: { ...DEFAULT_ELO },
      exp: expiresAt,
      iat: now,
    };

    const token = await sign(payload as unknown as Record<string, unknown>, c.env.JWT_SECRET);

    return c.json({
      token,
      playerId,
      displayName,
      elo: payload.elo,
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
    const oldPayload = (await verify(oldToken, c.env.JWT_SECRET)) as unknown as AuthPayload;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60; // 7 days

    // Preserve ELO from old token, or use default if missing
    const elo = oldPayload.elo || { ...DEFAULT_ELO };

    const newPayload: AuthPayload = {
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
      exp: expiresAt,
      iat: now,
    };

    const token = await sign(newPayload as unknown as Record<string, unknown>, c.env.JWT_SECRET);

    return c.json({
      token,
      playerId: newPayload.playerId,
      displayName: newPayload.displayName,
      elo: newPayload.elo,
      expiresAt: expiresAt * 1000,
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

/**
 * POST /auth/update-elo
 * Update ELO in token after a game (called by client with game result)
 * This allows ELO to persist across sessions in the JWT
 */
authRoutes.post("/update-elo", zValidator("json", updateEloSchema), async (c) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "No token provided" }, 401);
  }

  try {
    const oldToken = authHeader.slice(7);
    const oldPayload = (await verify(oldToken, c.env.JWT_SECRET)) as unknown as AuthPayload;

    const { tournamentType, newElo } = c.req.valid("json");

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60;

    // Update ELO for the specific tournament type
    const elo = oldPayload.elo || { ...DEFAULT_ELO };
    elo[tournamentType] = newElo;

    const newPayload: AuthPayload = {
      playerId: oldPayload.playerId,
      displayName: oldPayload.displayName,
      elo,
      exp: expiresAt,
      iat: now,
    };

    const token = await sign(newPayload as unknown as Record<string, unknown>, c.env.JWT_SECRET);

    return c.json({
      token,
      elo: newPayload.elo,
    });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

export { authRoutes };
