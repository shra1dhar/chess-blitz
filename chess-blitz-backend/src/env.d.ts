import type { TournamentType } from "./types/constants";

// Environment bindings for Cloudflare Workers
export interface Env {
  // Durable Objects
  MATCHMAKING_QUEUE: DurableObjectNamespace;
  GAME_ROOM: DurableObjectNamespace;
  PRIVATE_LOBBY: DurableObjectNamespace;

  // Static assets
  ASSETS: Fetcher;

  // Environment variables
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
}

// Extend Hono's context
declare module "hono" {
  interface ContextVariableMap {
    // Auth payload after JWT verification (guest-only mode)
    auth: {
      playerId: string;
      displayName: string;
    };
  }
}
