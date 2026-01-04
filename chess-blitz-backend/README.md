# Chess Blitz Backend

Real-time chess backend built with Cloudflare Workers, Hono, and Durable Objects.

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────────────┐
│   Frontend      │────▶│           Cloudflare Worker                  │
│   (Client)      │     │  ┌────────────────────────────────────────┐  │
└─────────────────┘     │  │              Hono Router                │  │
                        │  │  /auth/*  /ws/*  /health               │  │
                        │  └──────────────┬─────────────────────────┘  │
                        │                 │ Worker Bindings             │
                        │     ┌───────────┴───────────┐                │
                        │     ▼                       ▼                │
                        │  ┌──────────────┐    ┌──────────────┐        │
                        │  │ Matchmaking  │    │   GameRoom   │        │
                        │  │    Queue     │    │     DO       │        │
                        │  │     DO       │    │              │        │
                        │  └──────────────┘    └──────────────┘        │
                        └──────────────────────────────────────────────┘
```

**Key Components:**
- **Hono Router**: HTTP/WebSocket routing with JWT auth
- **MatchmakingQueue DO**: ELO-based matchmaking, bot fallback
- **GameRoom DO**: Game state, move validation, clocks, reconnection

## Features

- Guest-only authentication (ELO stored in JWT)
- PvP matchmaking with ELO-based pairing
- Bot matches (Easy/Medium/Hard difficulty)
- Time controls: Bullet (1min), Blitz (3min), Rapid (5min), Classical (10min)
- 30-second reconnection window
- WebSocket Hibernation API for efficient connections

## Hono Middleware

The backend uses several Hono middleware for security and observability:

| Middleware | Purpose |
|------------|---------|
| `logger` | Request logging |
| `secureHeaders` | Security headers (XSS, clickjacking protection) |
| `requestId` | Request tracing for Cloudflare observability |
| `bodyLimit` | Prevents large payload attacks (10KB limit on `/auth/*`) |
| `cors` | Dynamic CORS based on environment |
| `zValidator` | Zod-based request validation |

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm run dev

# Type check
pnpm run typecheck

# Deploy
pnpm run deploy
```

## Environment Variables

Set secrets via Wrangler:

```bash
wrangler secret put JWT_SECRET
```

Configure in `wrangler.jsonc`:

```jsonc
{
  "vars": {
    "ENVIRONMENT": "production",
    "CORS_ORIGIN": "https://your-frontend.com"
  }
}
```

## API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/guest` | POST | Create guest session |
| `/auth/refresh` | POST | Refresh token (preserves ELO) |
| `/auth/update-elo` | POST | Update ELO after game |

### WebSocket

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ws/queue/:type` | GET | Matchmaking queue (bullet/blitz/rapid/classical) |
| `/ws/queue/:type/status` | GET | Queue status (HTTP) |
| `/ws/game/:gameId` | GET | Game room |
| `/ws/game/:gameId/state` | GET | Game state (HTTP) |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check |

## Client Integration

### 1. Create Guest Session

```typescript
const response = await fetch('https://api.example.com/auth/guest', {
  method: 'POST',
});

const { token, playerId, displayName, elo } = await response.json();
// Store token for subsequent requests
```

### 2. Connect to Matchmaking

```typescript
const ws = new WebSocket(
  `wss://api.example.com/ws/queue/blitz?token=${token}`
);

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'queue_joined':
      console.log('Waiting for opponent...');
      break;
    case 'match_found':
      // Connect to game room
      connectToGame(msg.gameId, msg.color, msg.opponent);
      break;
  }
};
```

### 3. Play Game

```typescript
function connectToGame(gameId: string, color: string, opponent: any) {
  const gameWs = new WebSocket(
    `wss://api.example.com/ws/game/${gameId}?token=${token}&color=${color}`
  );

  gameWs.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'game_state':
        updateBoard(msg.fen, msg.clocks);
        break;
      case 'move_made':
        animateMove(msg.move);
        break;
      case 'game_over':
        showResult(msg.result, msg.reason, msg.eloChanges);
        break;
    }
  };

  // Send move
  gameWs.send(JSON.stringify({
    type: 'make_move',
    from: 'e2',
    to: 'e4',
  }));
}
```

### 4. Refresh Token (Preserve ELO)

```typescript
const response = await fetch('https://api.example.com/auth/refresh', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { token: newToken, elo } = await response.json();
```

## Worker-to-Worker Communication (Service Bindings)

For internal service-to-service calls without external network hops, use **Service Bindings**. This keeps traffic on Cloudflare's internal network.

### Setup Service Binding

Add to `wrangler.jsonc`:

```jsonc
{
  "services": [
    {
      "binding": "CHESS_BACKEND",
      "service": "chess-blitz-backend"
    }
  ]
}
```

### Usage in Another Worker

```typescript
// In your frontend Worker or another service
export interface Env {
  CHESS_BACKEND: Fetcher;  // Service binding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Create guest session via internal binding (no external network)
    const authResponse = await env.CHESS_BACKEND.fetch(
      new Request('https://internal/auth/guest', {
        method: 'POST',
      })
    );

    const { token, playerId } = await authResponse.json();

    // The URL host doesn't matter for service bindings
    // It routes directly to the bound Worker
    return new Response(JSON.stringify({ token, playerId }));
  },
};
```

### Benefits of Service Bindings

1. **No cold starts** - Direct invocation, no external HTTP
2. **Lower latency** - Traffic stays on Cloudflare's backbone
3. **No egress fees** - Internal communication is free
4. **Authentication** - Implicitly trusted (same account)
5. **Type safety** - Share types between Workers

### Type-Safe RPC Client (Hono)

The backend exports `AppType` for type-safe client calls using Hono's RPC feature:

```typescript
// In your frontend or another Worker
import { hc } from 'hono/client';
import type { AppType } from 'chess-blitz-backend';

// Create type-safe client
const client = hc<AppType>('https://api.example.com');

// Fully typed API calls
const res = await client.auth.guest.$post();
const { token, playerId, elo } = await res.json();

// With service binding (internal network)
const internalClient = hc<AppType>('https://internal', {
  fetch: env.CHESS_BACKEND.fetch.bind(env.CHESS_BACKEND),
});
```

### Durable Object Bindings

The backend already uses DO bindings internally:

```typescript
// Already configured in wrangler.jsonc
"durable_objects": {
  "bindings": [
    { "name": "MATCHMAKING_QUEUE", "class_name": "MatchmakingQueue" },
    { "name": "GAME_ROOM", "class_name": "GameRoom" }
  ]
}

// Usage in code (internal Worker-to-DO communication)
const queueId = c.env.MATCHMAKING_QUEUE.idFromName(`queue-${tournamentType}`);
const queue = c.env.MATCHMAKING_QUEUE.get(queueId);

// This fetch stays internal - never hits external network
const response = await queue.fetch(request);
```

### Cross-Worker DO Access

To access these DOs from another Worker:

```jsonc
// In another Worker's wrangler.jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "GAME_ROOM",
        "class_name": "GameRoom",
        "script_name": "chess-blitz-backend"  // Reference external Worker
      }
    ]
  }
}
```

## WebSocket Message Types

### Queue Messages

```typescript
// Client -> Server
{ type: 'ping' }
{ type: 'cancel' }

// Server -> Client
{ type: 'queue_joined', position: number, estimatedWait: number }
{ type: 'queue_update', position: number, playersInQueue: number }
{ type: 'match_found', gameId: string, color: 'white' | 'black', opponent: {...} }
{ type: 'bot_match', gameId: string, color: 'white' | 'black', bot: {...} }
```

### Game Messages

```typescript
// Client -> Server
{ type: 'make_move', from: string, to: string, promotion?: string }
{ type: 'resign' }
{ type: 'offer_draw' }
{ type: 'accept_draw' }
{ type: 'decline_draw' }

// Server -> Client
{ type: 'game_state', fen: string, clocks: {...}, ... }
{ type: 'move_made', move: {...}, fen: string, clocks: {...} }
{ type: 'game_over', result: string, reason: string, eloChanges: {...} }
{ type: 'draw_offered', by: 'white' | 'black' }
{ type: 'opponent_disconnected' }
{ type: 'opponent_reconnected' }
```

## Time Controls

| Type | Time | Best For |
|------|------|----------|
| Bullet | 1 min | Quick games |
| Blitz | 3 min | Fast-paced play |
| Rapid | 5 min | Balanced games |
| Classical | 10 min | Thoughtful play |

## ELO System

- **Starting ELO**: 1200
- **K-Factor**: 32
- **Floor**: 100
- **Stored in**: JWT token (guest-only mode)

ELO is calculated after each game and returned in the `game_over` message. Use `/auth/update-elo` to persist the new ELO in your token.

## Bot Difficulties

| Difficulty | ELO Range | Think Time |
|------------|-----------|------------|
| Easy | 800-1000 | 500ms |
| Medium | 1200-1500 | 1000ms |
| Hard | 1800-2200 | 2000ms |

Bots are matched automatically after 30 seconds in queue with no human opponent found.

## Development

```bash
# Run locally
pnpm run dev

# Logs
wrangler tail

# Deploy
pnpm run deploy
```

## Project Structure

```
src/
├── index.ts              # Main entry, Hono router
├── env.d.ts              # Environment types
├── routes/
│   ├── auth.ts           # Guest auth endpoints
│   └── ws.ts             # WebSocket upgrade handlers
├── middleware/
│   └── auth.ts           # JWT middleware
├── durable-objects/
│   ├── MatchmakingQueue.ts  # Matchmaking logic
│   └── GameRoom.ts          # Game state & logic
└── types/
    ├── constants.ts      # Game constants
    ├── messages.ts       # WebSocket message types
    └── player.ts         # Player & auth types
```

## License

MIT
