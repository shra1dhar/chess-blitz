# Multiplayer Tournament System

Technical reference for the Chess Blitz multiplayer implementation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ TournamentLobby│  │  GameClient   │  │   Leaderboard   │  │
│  └───────────────┘  └───────────────┘  └─────────────────┘  │
│          │                  │                    │           │
│          └──────────────────┼────────────────────┘           │
│                             │                                │
│                    useMultiplayer Hook                       │
│                             │                                │
│                    useWebSocket Hook                         │
└─────────────────────────────┼────────────────────────────────┘
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │           WebSocket API Routes                          ││
│  │  /api/ws/matchmaking    /api/ws/game                    ││
│  └─────────────────────────────────────────────────────────┘│
│          │                              │                    │
│          ▼                              ▼                    │
│  ┌─────────────────┐          ┌─────────────────┐           │
│  │MatchmakingQueue │          │    GameRoom     │           │
│  │ Durable Object  │─────────▶│ Durable Object  │           │
│  │(per tournament) │          │   (per game)    │           │
│  └─────────────────┘          └─────────────────┘           │
│                                       │                      │
│                                       ▼                      │
│                              ┌─────────────────┐            │
│                              │       D1        │            │
│                              │    Database     │            │
│                              └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

Location: `migrations/0001_init.sql`

### Tables

| Table | Purpose |
|-------|---------|
| `players` | Player identity, Elo ratings (per time control), stats |
| `active_games` | In-progress games for reconnection support |
| `game_history` | Completed games with PGN, Elo changes |
| `leaderboard` | Materialized rankings per tournament type |

### Key Fields

**players**
- `id` - MSN Player ID or guest UUID
- `elo_3min`, `elo_5min`, `elo_10min` - Separate ratings per time control
- `is_guest` - Boolean for guest vs authenticated

**active_games**
- `fen` - Current board position
- `white_time_ms`, `black_time_ms` - Remaining clock time
- `last_move_at` - Timestamp for clock calculation

---

## Durable Objects

### MatchmakingQueue

Location: `src/server/durable-objects/MatchmakingQueue.ts`

**Purpose**: Manages player queue for each tournament type (3min, 5min, 10min)

**Key Logic**:
1. Player connects via WebSocket
2. Added to queue with Elo rating
3. Tries to match with player within 200 Elo range
4. If no match in 5 seconds → bot fallback
5. On match → creates GameRoom DO, notifies both players

**State**:
- `queue: Map<playerId, QueuedPlayer>` - In-memory queue
- `tournamentType` - Which time control this queue handles

### GameRoom

Location: `src/server/durable-objects/GameRoom.ts`

**Purpose**: Manages individual game state and WebSocket connections

**Key Logic**:
1. Initialized with player info, time control
2. Validates moves server-side with chess.js
3. Manages clock countdown
4. Detects game end (checkmate, timeout, resign, draw)
5. Calculates Elo changes
6. Persists to D1 on game end

**State**:
- `game: MultiplayerGameState` - Full game state
- `chess: Chess` - chess.js instance for validation
- `connections: Map<playerId, WebSocket>` - Active player connections
- `clockInterval` - Timer for timeout detection

---

## API Routes

### WebSocket Endpoints

| Route | Durable Object | Purpose |
|-------|----------------|---------|
| `/api/ws/matchmaking` | MatchmakingQueue | Join queue, receive match |
| `/api/ws/game` | GameRoom | Play game, receive moves |

### REST Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/players` | GET | Get player by ID |
| `/api/players` | POST | Create/update player |
| `/api/leaderboard` | GET | Get rankings by tournament type |

---

## Frontend Hooks

### useWebSocket

Location: `src/hooks/useWebSocket.ts`

Generic WebSocket hook with:
- Auto-reconnection (configurable attempts)
- Connection status tracking
- JSON message parsing

```typescript
const { status, sendMessage, disconnect } = useWebSocket(url, {
  onMessage: (data) => {},
  onClose: () => {},
  reconnect: true,
  maxReconnectAttempts: 5,
});
```

### useMultiplayer

Location: `src/hooks/useMultiplayer.ts`

High-level hook orchestrating matchmaking and gameplay:

```typescript
const {
  matchState,        // 'idle' | 'queued' | 'matched' | 'playing' | 'ended'
  queuePosition,
  gameState,
  isMyTurn,
  opponent,
  result,
  eloChanges,
  joinQueue,         // (tournamentType) => void
  leaveQueue,
  makeMove,          // (from, to, promotion?) => void
  resign,
  offerDraw,
  acceptDraw,
} = useMultiplayer({ playerId, displayName, elo });
```

---

## Stores

### multiplayerStore

Location: `src/stores/multiplayerStore.ts`

Persisted Zustand store for player identity:

```typescript
{
  playerId: string | null,
  displayName: string,
  isGuest: boolean,
  elo: { '3min': 1200, '5min': 1200, '10min': 1200 },
  isAuthenticated: boolean,
  lastTournamentType: '5min',
  // Stats cached from server
  gamesPlayed, wins, losses, draws,
}
```

Key actions:
- `createGuestPlayer()` - Generate guest ID and name
- `setPlayer(player)` - Set from server response
- `updateElo(type, newElo)` - After game ends

---

## Components

### TournamentLobby

Location: `src/components/Tournament/TournamentLobby.tsx`

Tournament selection UI with:
- 3 tournament cards (Bullet 3min, Blitz 5min, Rapid 10min)
- Queue status with spinner
- Match found animation
- Player info display

### GameClock

Location: `src/components/Multiplayer/GameClock.tsx`

Real-time countdown timer:
- Updates via requestAnimationFrame
- Visual states: normal, low (<30s), critical (<10s)
- Shows tenths of seconds when under 10s

---

## WebSocket Protocol

### Client → Server

```typescript
{ type: 'joinQueue', tournamentType: '3min' | '5min' | '10min' }
{ type: 'leaveQueue' }
{ type: 'move', from: string, to: string, promotion?: string }
{ type: 'resign' }
{ type: 'offerDraw' }
{ type: 'acceptDraw' }
{ type: 'declineDraw' }
```

### Server → Client

```typescript
{ type: 'queued', position: number, tournamentType: string }
{ type: 'queueUpdate', position: number }
{ type: 'matched', gameId: string, color: 'w' | 'b', opponent: PlayerInfo }
{ type: 'gameState', game: MultiplayerGameState }
{ type: 'move', from, to, san, game: MultiplayerGameState }
{ type: 'gameEnd', result: 'white' | 'black' | 'draw', reason: string, eloChanges }
{ type: 'drawOffer', from: 'opponent' }
{ type: 'opponentDisconnected', reconnectTimeoutMs: 30000 }
{ type: 'opponentReconnected' }
{ type: 'error', message: string, code: string }
```

---

## Type Definitions

Location: `src/types/multiplayer.ts`

Key types:
- `TournamentType` - '3min' | '5min' | '10min'
- `MatchState` - 'idle' | 'queued' | 'matched' | 'playing' | 'ended'
- `MultiplayerGameState` - Full game state object
- `ServerMessage` / `ClientMessage` - WebSocket message unions
- `EloChanges` - Elo delta after game

Constants:
- `TOURNAMENT_TIME_MS` - Initial time per tournament type
- `MATCHMAKING_TIMEOUT_MS` - 5000 (5 seconds before bot)
- `RECONNECT_TIMEOUT_MS` - 30000 (30 seconds to reconnect)
- `ELO_K_FACTOR` - 32
- `DEFAULT_ELO` - 1200

---

## Elo Rating System

- K-factor: 32
- Starting Elo: 1200
- Separate ratings per time control (3min, 5min, 10min)

Formula:
```
expectedScore = 1 / (1 + 10^((opponentElo - playerElo) / 400))
eloChange = K * (actualScore - expectedScore)
```

Where actualScore is: 1 (win), 0 (loss), 0.5 (draw)

---

## Bot Fallback

When no human opponent found within 5 seconds:

1. MatchmakingQueue sends `matched` with `opponent.isBot: true`
2. Frontend loads Stockfish.js via existing `useStockfish` hook
3. Bot difficulty based on player Elo:
   - < 1000: depth 5
   - 1000-1400: depth 10
   - 1400-1800: depth 15
   - > 1800: depth 20
4. Game processed locally (no WebSocket needed)
5. Result still saved to D1 for history

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ws/
│   │   │   ├── matchmaking/route.ts   # WebSocket → MatchmakingQueue DO
│   │   │   └── game/route.ts          # WebSocket → GameRoom DO
│   │   ├── players/route.ts           # Player CRUD
│   │   └── leaderboard/route.ts       # Rankings query
│   └── tournament/page.tsx            # Tournament lobby page
├── components/
│   ├── Tournament/
│   │   ├── TournamentLobby.tsx
│   │   └── TournamentLobby.module.scss
│   └── Multiplayer/
│       ├── GameClock.tsx
│       └── GameClock.module.scss
├── hooks/
│   ├── useWebSocket.ts
│   └── useMultiplayer.ts
├── stores/
│   └── multiplayerStore.ts
├── server/
│   └── durable-objects/
│       ├── MatchmakingQueue.ts
│       ├── GameRoom.ts
│       └── index.ts
└── types/
    └── multiplayer.ts

migrations/
└── 0001_init.sql
```

---

## Deployment

1. Create D1 database:
   ```bash
   wrangler d1 create chess-blitz-db
   ```

2. Update `wrangler.jsonc` with real database ID

3. Run migrations:
   ```bash
   wrangler d1 execute chess-blitz-db --file=migrations/0001_init.sql
   ```

4. Deploy:
   ```bash
   pnpm build && pnpm deploy
   ```

---

## Configuration

In `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "chess-blitz-db",
    "database_id": "<your-database-id>"
  }],
  "durable_objects": {
    "bindings": [
      { "name": "MATCHMAKING_QUEUE", "class_name": "MatchmakingQueue" },
      { "name": "GAME_ROOM", "class_name": "GameRoom" }
    ]
  },
  "migrations": [{
    "tag": "v1",
    "new_classes": ["MatchmakingQueue", "GameRoom"]
  }]
}
```

---

## Testing Checklist

- [ ] Player joins queue, matched with bot after 5s
- [ ] Two players in same tournament matched together
- [ ] Clock counts down correctly, syncs between players
- [ ] Timeout triggers game end with correct winner
- [ ] Moves validated server-side, sync to opponent
- [ ] Resign works for both players
- [ ] Draw offer/accept/decline flow
- [ ] Elo updates correctly in database
- [ ] Leaderboard shows rankings
- [ ] Reconnection works within 30s window
- [ ] Bot plays at appropriate difficulty
- [ ] Guest players can play (no auth required)
- [ ] Mobile responsive UI
