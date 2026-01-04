import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import type { Env } from "../env.d";
import type { AuthPayload } from "../types/player";

/**
 * JWT authentication middleware.
 * Verifies the Authorization header and sets auth context.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = (await verify(token, c.env.JWT_SECRET)) as unknown as AuthPayload;

    // Check if token is expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: "Token expired" }, 401);
    }

    // Set auth context (guest-only mode)
    c.set("auth", {
      playerId: payload.playerId,
      displayName: payload.displayName,
    });

    await next();
  } catch (error) {
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
      const payload = (await verify(token, c.env.JWT_SECRET)) as unknown as AuthPayload;

      if (!payload.exp || payload.exp >= Math.floor(Date.now() / 1000)) {
        c.set("auth", {
          playerId: payload.playerId,
          displayName: payload.displayName,
        });
      }
    } catch {
      // Invalid token - continue without auth
    }
  }

  await next();
});
