import { createMiddleware } from "hono/factory";
import { verifyToken, TokenError } from "@chess-blitz/shared";
import type { Env } from "../env.d";

/**
 * Token authentication middleware.
 * Verifies the Authorization header and sets auth context.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token);

    // Set auth context (guest-only mode)
    c.set("auth", {
      playerId: payload.playerId,
      displayName: payload.displayName,
    });

    await next();
  } catch (error) {
    if (error instanceof TokenError) {
      return c.json({ error: error.message }, 401);
    }
    return c.json({ error: "Invalid token" }, 401);
  }
});

/**
 * Optional auth middleware - doesn't reject if no token.
 * Useful for endpoints that work for both authenticated and anonymous users.
 */
export const optionalAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token);
      c.set("auth", {
        playerId: payload.playerId,
        displayName: payload.displayName,
      });
    } catch {
      // Invalid token - continue without auth
    }
  }

  await next();
});
