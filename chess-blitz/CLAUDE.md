# Chess Blitz - AI Development Notes

## Project Overview
Next.js 16 chess game with Stockfish AI, deployed to Cloudflare Workers using OpenNext.js. Uses **React 19.2** with modern hooks. Supports 34 languages with RTL support. Multiplayer functionality is handled by a separate backend service (`chess-blitz-backend`).

## Monorepo Context

This project is part of a **pnpm workspace monorepo**:

```
chess/                          # Monorepo root
├── pnpm-workspace.yaml
├── packages/
│   └── shared/                 # @chess-blitz/shared
├── chess-blitz/                # THIS PROJECT (frontend)
└── chess-blitz-backend/        # Backend service
```

### Shared Package Dependency

This project depends on `@chess-blitz/shared` for types, enums, and constants:

```typescript
// Enums (used in WebSocket messages)
import { ClientMessageType, ServerMessageType, DrawClaimReason } from '@chess-blitz/shared';

// Types
import type { TournamentType, Color, GameResult, ErrorCode } from '@chess-blitz/shared';

// Constants
import { TIME_CONTROLS, ELO, MATCHMAKING, RATE_LIMITS } from '@chess-blitz/shared';
```

### Before Running/Building

**Build the shared package first** (from monorepo root or packages/shared):

```bash
cd ../packages/shared && pnpm build
```

Or from monorepo root:
```bash
pnpm --filter @chess-blitz/shared build
```

## Critical Rules

### OpenNext.js / Cloudflare Workers

1. **DO NOT use `export const runtime = 'edge'` in API routes**
   - OpenNext handles runtime automatically
   - Adding edge runtime declaration breaks the build with: `app/api/... cannot use the edge runtime`

2. **Keep using `middleware.ts` - DO NOT rename to `proxy.ts`**
   - Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts`
   - However, `proxy.ts` only runs on Node.js runtime (edge runtime dropped)
   - OpenNext.js for Cloudflare requires edge middleware
   - The deprecation warning is expected and safe to ignore for Cloudflare deployments
   - See: [OpenNext.js Issue #962](https://github.com/opennextjs/opennextjs-cloudflare/issues/962)

3. **pnpm patch for Next.js 16.1.1 (setImmediate fix)**
   - Next.js 16.1.1 has a bug where `fast-set-immediate.external.js` tries to assign to read-only ESM exports
   - This causes `TypeError: Cannot assign to read only property 'setImmediate'` on Cloudflare Workers
   - A pnpm patch is applied to wrap the assignment in try-catch blocks
   - Patch location: `patches/next@16.1.1.patch`
   - If upgrading Next.js, check if the patch is still needed or needs updating

4. **DO NOT enable `cacheComponents: true` (PPR/Cache Components)**
   - Cache Components is NOT compatible with Cloudflare Workers
   - Causes "Cannot perform I/O on behalf of a different request" errors
   - The feature caches promises across requests, but Workers isolates I/O per request
   - Next.js also warns: "cannot guarantee that Cache Components will run as expected due to `setTimeout()` implementation"
   - Keep this setting disabled (commented out) in `next.config.ts`

5. **Backend Service Integration**
   - Multiplayer (matchmaking, game rooms) is handled by `chess-blitz-backend` service
   - Frontend connects directly to backend WebSocket URLs
   - Auth uses JWT tokens stored in localStorage
   - Service binding available for internal API calls if needed

### Sass/SCSS

1. **Use modern color functions**
   - `darken()` and `lighten()` are deprecated in Dart Sass 3.0.0
   - Add `@use 'sass:color';` at the top of SCSS files
   - Replace `darken($color, 10%)` with `color.adjust($color, $lightness: -10%)`
   - Replace `lighten($color, 5%)` with `color.adjust($color, $lightness: 5%)`

2. **Avoid CSS Grid and `gap` property for older browser support**
   - Do NOT use `display: grid` or `gap` property
   - Use flexbox with margin for spacing instead:
   ```scss
   // BAD - not supported in older browsers
   .container {
     display: grid;
     gap: 16px;
   }

   // GOOD - flexbox with margin
   .container {
     display: flex;
     flex-wrap: wrap;
   }
   .item {
     margin: 8px;
   }
   ```

### RTL Language Support

1. **Route groups handle `lang` and `dir` attributes**
   - `(en)` route group → `<html lang="en" dir="ltr">`
   - `(localized)/[lang]` route group → `<html lang={lang} dir={isRtl ? 'rtl' : 'ltr'}>`
   - RTL locales: `ar` (Arabic), `he` (Hebrew)
   - Attributes are set server-side at build time via `generateStaticParams` - no client-side JS needed
   - This eliminates layout shift for RTL languages

2. **Use CSS logical properties**
   - Replace `margin-right` with `margin-inline-end`
   - Replace `margin-left` with `margin-inline-start`
   - Replace `padding-right` with `padding-inline-end`

3. **Flip directional icons for RTL**
   ```scss
   svg {
     [dir="rtl"] & {
       transform: scaleX(-1);
     }
   }

   &:hover svg {
     transform: translateX(4px);
     [dir="rtl"] & {
       transform: scaleX(-1) translateX(4px);
     }
   }
   ```

### i18n / Localization

1. **All 34 language files must have matching keys**
   - Dictionary files are in `src/i18n/dictionaries/`
   - When adding new UI sections, add translations to ALL language files
   - Don't just copy English values - provide actual translations

2. **Dictionary type safety**
   - The `Dictionary` type is inferred from `en.json`
   - Adding new sections requires updating all language files or TypeScript will error

### Tournament Types

1. **Current tournament types:** `'bullet' | 'blitz' | 'rapid' | 'classical'`
   - bullet: 1 minute
   - blitz: 3 minutes
   - rapid: 5 minutes
   - classical: 10 minutes

2. **Adding new tournament types requires updates in:**
   - `src/types/multiplayer.ts` - Add to `TournamentType` union and `TOURNAMENT_TIME_MS`
   - `src/stores/multiplayerStore.ts` - Add default elo in initial state
   - `src/components/Tournament/TournamentLobby.tsx` - Add to TOURNAMENTS array
   - `src/i18n/dictionaries/*.json` - Add translations for all 34 languages
   - Backend service - Update tournament types there too

### Backend Configuration

1. **Environment Variables**
   - `NEXT_PUBLIC_BACKEND_URL` - Backend service URL for WebSocket connections
   - Set in `.env.local` for development, `.env.production` for production

2. **Authentication**
   - JWT-based guest sessions
   - Token stored in localStorage via `authService.ts`
   - ELO ratings stored in JWT payload (no database required on frontend)

3. **WebSocket Messages**
   - All messages use snake_case (e.g., `join_queue`, `match_found`, `game_over`)
   - See `src/types/multiplayer.ts` for full message type definitions

### React 19.2 Patterns

1. **Use `useEffectEvent` for event callbacks in Effects**
   - Stable in React 19.2 (released October 2025)
   - Use when a callback needs latest props/state but shouldn't trigger Effect re-runs
   - Already implemented in: `useWebSocket.ts`, `useStockfish.ts`, `useMultiplayer.ts`
   ```typescript
   // GOOD - useEffectEvent for callbacks
   const onMessageEvent = useEffectEvent((data: unknown) => {
     onMessage?.(data);  // Always sees latest onMessage without causing reconnection
   });

   useEffect(() => {
     ws.onmessage = (e) => onMessageEvent(JSON.parse(e.data));
   }, [url]);  // Only url causes Effect to re-run

   // BAD - Old ref pattern (no longer needed)
   const onMessageRef = useRef(onMessage);
   useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
   ```

2. **When to use `useEffectEvent`**
   - WebSocket message handlers that access changing state (sound settings, player color)
   - Worker callbacks (Stockfish onBestMove, onError)
   - Any callback passed to Effect that shouldn't trigger re-subscription

3. **`use()` hook is NOT used in this project**
   - The codebase uses Zustand for state management (not React Context)
   - No Promise-based data fetching in components
   - If adding Context-based features, consider `use()` for reading context

### macOS Development

1. **`timeout` command doesn't exist on macOS**
   - Use `& sleep N` pattern or run processes in background
   - Alternative: `gtimeout` from coreutils (`brew install coreutils`)

## Multiplayer Game Flow

### Navigation Flow
```
Tournament Lobby → Join Queue → Match Found → Navigate to /${locale}/play/${gameId}
                                                              ↓
Game Page → Read game data from store → Connect WebSocket → Play
```

### Key Files
- `src/app/[lang]/play/[gameId]/page.tsx` - Dynamic route for multiplayer games
- `src/components/play/MultiplayerGameClient.tsx` - Multiplayer game UI
- `src/hooks/useMultiplayer.ts` - Matchmaking and game WebSocket logic
- `src/stores/multiplayerStore.ts` - Persists game data across navigation

### Game State Persistence
When a match is found, game data is stored in `multiplayerStore`:
- `currentGameId` - The game room ID
- `currentPlayerColor` - Player's color ('w' or 'b')
- `currentOpponent` - Opponent info
- `currentTournamentType` - Tournament type for time control

The `MultiplayerGameClient` reads this data and calls `joinGame(gameId)` to reconnect.

---

## Project Structure

```
src/
├── app/
│   ├── (en)/              # English routes (lang="en" dir="ltr")
│   │   ├── layout.tsx     # Root layout for English
│   │   ├── page.tsx       # Homepage
│   │   ├── play/          # Single-player game
│   │   └── tournament/    # Tournament lobby
│   ├── (localized)/       # Localized routes (dynamic lang/dir)
│   │   └── [lang]/
│   │       ├── layout.tsx # Root layout with lang/dir from params
│   │       ├── page.tsx   # Localized homepage
│   │       ├── play/      # Single-player + multiplayer games
│   │       │   └── [gameId]/ # Multiplayer game page
│   │       └── tournament/
│   ├── api/               # API routes (no edge runtime!)
├── components/
│   ├── Board/             # ChessBoard
│   ├── GameControls/      # Game control buttons
│   ├── GameInfo/          # Game state display
│   ├── GameOver/          # Game over modal
│   ├── home/              # Homepage (GameLobby, ModeSelector, etc.)
│   ├── Multiplayer/       # GameClock, DisconnectOverlay, DrawOfferBanner, etc.
│   ├── play/              # GameClient, MultiplayerGameClient
│   ├── Tournament/        # TournamentLobby, MatchmakingOverlay
│   └── Toast/             # ToastProvider
├── hooks/                 # useChessGame, useMultiplayer, useWebSocket, etc.
├── i18n/
│   └── dictionaries/      # 34 language JSON files
├── services/              # authService.ts, msStartSDK.ts, soundManager.ts
├── stores/                # gameStore, multiplayerStore, settingsStore
├── styles/                # Global SCSS variables and mixins
└── types/                 # chess.ts, multiplayer.ts
```

## Commands

```bash
pnpm dev          # Start dev server (Turbopack)
pnpm build        # Build for production
pnpm deploy       # Build and deploy to Cloudflare
pnpm typecheck    # Run TypeScript type checking (via tsc --noEmit)
```

## Deployment

This project deploys **independently** from the backend:

```bash
# Deploy frontend only
pnpm deploy

# Or from monorepo root
pnpm --filter chess-blitz deploy
```

**Note:** The deploy script handles a monorepo quirk where Next.js creates a nested standalone structure. It automatically creates a symlink to fix this before running OpenNext.

### Backend Integration
The frontend connects to the backend service via:
- WebSocket: `wss://<backend-url>/ws/queue/:tournamentType` (matchmaking)
- WebSocket: `wss://<backend-url>/ws/game/:gameId` (game room)
- HTTP: `POST /auth/guest`, `POST /auth/refresh`, `POST /auth/update-elo`

Set `NEXT_PUBLIC_BACKEND_URL` environment variable to configure the backend URL.

### Related Project
- **Backend**: `chess-blitz-backend` at `../chess-blitz-backend`
- **Shared types**: `@chess-blitz/shared` at `../packages/shared`
