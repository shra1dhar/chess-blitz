# Chess Blitz

A real-time multiplayer chess platform with AI opponent support, built with modern edge-first architecture.

## Overview

Chess Blitz is a full-featured chess game platform that supports both single-player games against Stockfish AI and real-time multiplayer matches with ELO-based matchmaking. The platform supports 34 languages with RTL support and is optimized for low-latency competitive play.

## Project Structure

```
chess/
├── chess-blitz/           # Frontend application (Next.js 15)
└── chess-blitz-backend/   # Backend service (Cloudflare Workers)
```

### Frontend (`chess-blitz/`)

```
src/
├── app/                   # Next.js App Router
│   ├── [lang]/           # Localized routes (34 languages)
│   │   ├── play/[gameId] # Multiplayer game view
│   │   └── tournament/   # Tournament selection
│   └── api/              # API routes
├── components/           # React components
│   ├── Board/           # Chess board rendering
│   ├── GameControls/    # Game action buttons
│   ├── GameInfo/        # Game state display
│   ├── GameOver/        # Game over modal
│   ├── home/            # Homepage (Lobby, Mode selector)
│   ├── Multiplayer/     # Clock, disconnect overlay
│   ├── Tournament/      # Tournament lobby & matchmaking
│   ├── Settings/        # User preferences
│   └── UI/              # Reusable UI primitives
├── hooks/               # React hooks
│   ├── useChessGame.ts  # Single-player game logic
│   ├── useMultiplayer.ts# Multiplayer orchestration
│   ├── useWebSocket.ts  # WebSocket management
│   ├── useStockfish.ts  # AI integration
│   └── useSound.ts      # Sound effects
├── i18n/                # Internationalization
│   ├── config.ts        # 34 locales, RTL config
│   └── dictionaries/    # Translation JSON files
├── services/            # Utility services
│   ├── authService.ts   # JWT authentication
│   └── soundManager.ts  # Sound effects
├── stores/              # Zustand state management
│   ├── gameStore.ts     # Single-player state
│   ├── multiplayerStore.ts # Multiplayer session
│   └── settingsStore.ts # User settings
├── types/               # TypeScript definitions
└── styles/              # Global SCSS
```

### Backend (`chess-blitz-backend/`)

```
src/
├── index.ts             # Main Hono router entry point
├── routes/
│   ├── auth.ts         # /auth/guest, /auth/refresh, /auth/update-elo
│   └── ws.ts           # /ws/queue/:type, /ws/game/:gameId
├── middleware/
│   └── auth.ts         # JWT middleware
├── durable-objects/
│   ├── MatchmakingQueue.ts # ELO-based matchmaking
│   └── GameRoom.ts         # Game state & move validation
├── services/
│   └── elo.ts          # ELO calculation
├── types/              # TypeScript definitions
│   ├── messages.ts     # WebSocket message types
│   ├── player.ts       # Player/auth types
│   └── game.ts         # Game state types
└── utils/
    ├── chess.ts        # Chess logic utilities
    └── websocket.ts    # WebSocket helpers
```

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 15 | React framework with App Router |
| React 19 | UI library |
| Zustand 5 | State management with persistence |
| chess.js | Move validation & game logic |
| Stockfish | AI opponent (Web Worker) |
| react-chessboard | Board rendering |
| SCSS Modules | Styling |

### Backend
| Technology | Purpose |
|------------|---------|
| Cloudflare Workers | Edge runtime |
| Durable Objects | Stateful game rooms & matchmaking |
| Hono | Lightweight web framework |
| Zod | Request validation |
| chess.js | Server-side move validation |

### Deployment
| Component | Platform |
|-----------|----------|
| Frontend | Cloudflare Workers (via OpenNext.js) |
| Backend | Cloudflare Workers + Durable Objects |
| Database | D1 (Cloudflare SQLite) |

## Features

### Game Modes
- **Single-player** - Play against Stockfish AI (4 difficulty levels)
- **Multiplayer** - Real-time PvP with ELO matchmaking
- **Practice** - Free play mode

### Tournament Types
| Type | Time Control |
|------|--------------|
| Bullet | 1 minute |
| Blitz | 3 minutes |
| Rapid | 5 minutes |
| Classical | 10 minutes |

### Multiplayer Features
- ELO-based matchmaking with expanding search window
- Bot fallback after 30 seconds of waiting
- Real-time move synchronization
- Clock management with time increments
- Draw offers & claims (50-move, threefold repetition)
- Rematch functionality
- 30-second reconnection window

### Board & UI
- 4 board themes (Classic Wood, Tournament Green, Blue Ocean, Midnight)
- Legal move highlighting
- Move animations with speed control
- Captured pieces display
- Sound effects
- Mobile-responsive design
- Dark mode support

### Internationalization
- **34 languages** supported
- RTL support for Arabic and Hebrew
- Automatic language detection

## Architecture

```
┌─────────────┐      ┌────────────────────────────────────────┐
│   Client    │─────▶│         Cloudflare Workers             │
│  (Next.js)  │      │  ┌────────────────────────────────┐   │
└─────────────┘      │  │         Hono Router            │   │
                     │  │   /auth/*  /ws/*  /health      │   │
                     │  └───────────────┬────────────────┘   │
                     │                  │                     │
                     │     ┌────────────┴────────────┐       │
                     │     ▼                         ▼       │
                     │  ┌──────────────┐    ┌─────────────┐  │
                     │  │ Matchmaking  │    │  GameRoom   │  │
                     │  │    Queue     │    │    DO       │  │
                     │  │     DO       │    │             │  │
                     │  └──────────────┘    └─────────────┘  │
                     └────────────────────────────────────────┘
```

### Data Flow

1. **Authentication** - Guest JWT tokens with embedded ELO rating
2. **Matchmaking** - WebSocket to MatchmakingQueue Durable Object
3. **Game** - WebSocket to GameRoom Durable Object
4. **Moves** - Server validates, broadcasts state to both players
5. **Game End** - ELO recalculation, rematch option

## API Endpoints

### REST
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/guest` | Create guest session |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/update-elo` | Update ELO rating |
| GET | `/health` | Health check |

### WebSocket
| Endpoint | Description |
|----------|-------------|
| `/ws/queue/:tournamentType` | Matchmaking queue |
| `/ws/game/:gameId` | Game room |

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm or npm
- Wrangler CLI (for Cloudflare Workers)

### Frontend Setup

```bash
cd chess-blitz
pnpm install
pnpm dev
```

### Backend Setup

```bash
cd chess-blitz-backend
pnpm install
pnpm dev
```

### Deployment

**Frontend:**
```bash
cd chess-blitz
pnpm build
pnpm deploy
```

**Backend:**
```bash
cd chess-blitz-backend
pnpm deploy
```

## Configuration

### Environment Variables

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_WS_URL=wss://your-backend.workers.dev
NEXT_PUBLIC_API_URL=https://your-backend.workers.dev
```

**Backend** (`wrangler.jsonc`):
- Configure D1 database bindings
- Configure Durable Object bindings
- Set JWT secrets

## Key Files

| File | Description |
|------|-------------|
| `chess-blitz/src/hooks/useMultiplayer.ts` | Multiplayer game orchestration |
| `chess-blitz/src/stores/multiplayerStore.ts` | Player session & game state |
| `chess-blitz-backend/src/durable-objects/GameRoom.ts` | Server-side game logic |
| `chess-blitz-backend/src/durable-objects/MatchmakingQueue.ts` | ELO-based matchmaking |

## License

See LICENSE file for details.
