import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { requestId } from "hono/request-id";

import type { Env } from "./env.d";
import { authRoutes } from "./routes/auth";
import { wsRoutes } from "./routes/ws";

// Export Durable Objects
export { MatchmakingQueue } from "./durable-objects/MatchmakingQueue";
export { GameRoom } from "./durable-objects/GameRoom";
export { PrivateLobby } from "./durable-objects/PrivateLobby";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", requestId());

// Body limit for auth routes (security - prevents large payload attacks)
app.use(
  "/auth/*",
  bodyLimit({
    maxSize: 10 * 1024, // 10KB limit
    onError: (c) => c.json({ error: "Payload too large" }, 413),
  })
);

app.use("*", async (c, next) => {
  // Dynamic CORS based on environment
  const origin = c.env.CORS_ORIGIN || "http://localhost:3000";
  const corsMiddleware = cors({
    origin: origin.split(",").map((o) => o.trim()),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
  return corsMiddleware(c, next);
});

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT || "development",
  });
});

// API version
app.get("/", (c) => {
  return c.json({
    name: "chess-blitz-backend",
    version: "1.0.0",
    mode: "guest-only",
    endpoints: {
      health: "/health",
      auth: {
        guest: "POST /auth/guest",
        refresh: "POST /auth/refresh",
        updateElo: "POST /auth/update-elo",
      },
      ws: {
        queue: "GET /ws/queue/:tournamentType",
        queueStatus: "GET /ws/queue/:tournamentType/status",
        game: "GET /ws/game/:gameId",
        gameState: "GET /ws/game/:gameId/state",
      },
    },
  });
});

// Routes with chaining for RPC type inference
const routes = app
  .route("/auth", authRoutes)
  .route("/ws", wsRoutes);

// Error handler
routes.onError((err, c) => {
  console.error("[Error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

// 404 handler
routes.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

// Export type for RPC clients (frontend/other Workers)
export type AppType = typeof routes;
export default routes;
