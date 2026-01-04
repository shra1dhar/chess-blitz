## 🎯 Project Overview

**Chess Blitz** is a web-based chess game built for the **MSN Start Games** platform.

  - Classic Staunton pieces
   - Multiple board themes (4 switchable options)
   - Classic Chess UI style - functional and understated
   - Brand to be designed from scratch
   - NO Tailwind CSS - use SCSS only
   - NO modern CSS (gap, grid) - browser compatibility for older browsers


| Attribute | Value |
|-----------|-------|
| **Name** | Chess Blitz |
| **Platform** | MSN Start Games (https://www.msn.com/en-in/play) |
| **Type** | Casual/Competitive Chess Game |
| **Monetization** | Ads (Display, Interstitial, Rewarded) |

### Target Keywords (for MSN Discovery)
`chess`, `chess game`, `chess blitz`, `online chess`, `free chess`, `strategy`, `board game`, `brain game`, `multiplayer chess`, `play against computer`, `chess tactics`, `blitz chess`, `rapid chess`

---

## 🏗️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Nextjs** | Framework |
| **Cloudflare** | Deployment |
| **chess.js** | Move validation & game logic |
| **react-chessboard** | Interactive chessboard UI |
| **Stockfish.js lite** | AI engine (~7MB WASM) |
| **Zustand** | State management |
| **SCSS** | Styling |

> Note, you MUST NOT use tailwind and MUST not use new css properties like gap, grid etc. This project has to be made for browser compatibility in mind and lot of users would be using Older browsers.

### Backend (Cloudflare)
| Technology | Purpose |
|------------|---------|
| **Workers** | API routing, static assets, WebSocket upgrade |
| **Durable Objects** | Game rooms, matchmaking, real-time state |
| **D1 Database** | User profiles, game history, leaderboards |
| **WebSocket Hibernation** | Cost optimization for idle connections |

### External SDKs
| SDK | Purpose |
|-----|---------|
| **MSN Start Games SDK** | Platform integration, ads, leaderboards, cloud saves |

---

## 📁 Project Structure

```
chess-blitz/
├── frontend/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Board/            # Chessboard components
│   │   │   ├── GameOver/         # Game over modal
│   │   │   ├── Lobby/            # Game mode selection
│   │   │   ├── Timer/            # Chess clock
│   │   │   └── UI/               # Shared UI components
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── useChessGame.ts   # Core game logic hook
│   │   │   ├── useStockfish.ts   # AI engine hook
│   │   │   ├── useWebSocket.ts   # WebSocket connection hook
│   │   │   └── useTimer.ts       # Chess clock hook
│   │   ├── services/             # External services
│   │   │   ├── msStartSDK.ts     # MSN Start SDK wrapper
│   │   │   ├── api.ts            # REST API client
│   │   │   ├── websocket.ts      # WebSocket client
│   │   │   └── storage.ts        # Cloud save / local storage
│   │   ├── stores/               # Zustand stores
│   │   │   ├── gameStore.ts      # Game state
│   │   │   ├── userStore.ts      # User profile & settings
│   │   │   └── uiStore.ts        # UI state (modals, themes)
│   │   ├── utils/                # Helper functions
│   │   │   ├── chess.ts          # Chess utilities
│   │   │   ├── elo.ts            # ELO calculation
│   │   │   └── time.ts           # Time formatting
│   │   ├── workers/              # Web Workers
│   │   │   └── stockfish.worker.ts
│   │   ├── types/                # TypeScript types
│   │   ├── App.tsx               # Main app component
│   │   └── main.tsx              # Entry point
│   ├── public/
│   │   ├── stockfish/            # Stockfish WASM files
│   │   ├── pieces/               # Chess piece SVGs
│   │   └── sounds/               # Game sounds
│   ├── index.html
│   └── package.json
│
├── src/                          # Cloudflare Workers backend
│   ├── index.ts                  # Main Worker entry point
│   ├── router.ts                 # API routing
│   ├── durable-objects/
│   │   ├── GameRoom.ts           # Game session management
│   │   └── Matchmaking.ts        # Player pairing queue
│   ├── handlers/
│   │   ├── user.ts               # User API handlers
│   │   ├── game.ts               # Game API handlers
│   │   └── leaderboard.ts        # Leaderboard handlers
│   ├── db/
│   │   ├── schema.sql            # D1 database schema
│   │   └── queries.ts            # Database queries
│   ├── utils/
│   │   ├── elo.ts                # ELO calculation
│   │   └── validation.ts         # Input validation
│   └── types.ts                  # Shared types
│
├── wrangler.toml                 # Cloudflare config
├── package.json
├── tsconfig.json
```

---

## 🎮 Game Modes

### 1. Play vs Bot (AI)
Single-player mode against Stockfish AI with 4 difficulty levels.

| Difficulty | Stockfish Skill | ELO Range | Description |
|------------|-----------------|-----------|-------------|
| **Easy** | 3 | 600-900 | Makes obvious mistakes |
| **Medium** | 10 | 1000-1400 | Balanced play |
| **Hard** | 15 | 1400-1800 | Strong tactical play |
| **Expert** | 20 | 1800-2200 | Near-perfect play |

**Features:**
- Undo moves (via rewarded ad or limited free)
- Get hints (via rewarded ad)
- Optional time controls
- No ELO impact

### 2. Play vs Human (Online Multiplayer)
Real-time matchmaking with ELO-based pairing.

**Sub-modes:**
- **Quick Match** - Fast casual matchmaking
- **Ranked Match** - Affects ELO rating
- **Play a Friend** - Private game via link/code
- **Rematch** - Challenge previous opponent

**Matchmaking Rules:**
- Pair within ±200 ELO
- Same time control only
- Expand range after 30s wait
- Region preference for lower latency

### 3. Pass & Play (Local)
Two players on the same device, taking turns.

**Features:**
- No login required
- Board flip option between turns
- Optional timer

### 4. Daily Puzzle
New chess puzzle every day.

**Features:**
- Streak tracking
- Difficulty ratings (1-5 stars)
- Hint system (rewarded ads)
- Puzzle types: Mate in X, Tactics, Endgame, Defense

---

## ⏱️ Time Controls

| Category | Options | Format |
|----------|---------|--------|
| **Bullet** | 1+0, 1+1, 2+1 | Base minutes + increment seconds |
| **Blitz** | 3+0, 3+2, 5+0, 5+3 | Most popular |
| **Rapid** | 10+0, 10+5, 15+10, 15+15 | Balanced |
| **Classical** | 30+0, 30+20, 60+30 | Deep thinking |
| **Unlimited** | ∞ | Bot games only |

---

## 🔌 MSN Start Games SDK Integration

### SDK Setup
```html
<script src="https://assets.msn.com/staticsb/statics/latest/msstart-games-sdk/msstart-v1.0.0-rc.13.min.js"></script>
```

### Critical APIs

#### Game Operations
```typescript
$msstart.isInMsStartGame()        // Check if in MSN iframe
$msstart.getLocale()              // Get user locale
$msstart.getEntryPoint()          // Get launch context
$msstart.ping()                   // Test connection
$msstart.share(options)           // Share to social media
```

#### User Identity
```typescript
$msstart.getPlayerId()            // Get unique player ID (CRITICAL)
$msstart.getConsentString()       // GDPR consent (EU)
```

#### Leaderboards
```typescript
$msstart.submitScore(score, metadata)  // Submit score
$msstart.getLeaderboard(options)       // Get leaderboard
$msstart.getPlayerRank()               // Get player rank
```

#### Cloud Saves
```typescript
$msstart.saveGameState(key, data)      // Save to cloud
$msstart.loadGameState(key)            // Load from cloud
$msstart.deleteGameState(key)          // Delete saved state
```

#### Audio Sync (CRITICAL)
```typescript
$msstart.getAudioMuted()               // Check mute state
$msstart.onAudioMuteChange(callback)   // Listen for changes
```

#### Ads
```typescript
// Display Ads
$msstart.loadDisplayAd(slot)
$msstart.showDisplayAd(slot)
$msstart.hideDisplayAd(slot)

// Interstitial Ads
$msstart.loadInterstitialAd()
$msstart.showInterstitialAd()

// Rewarded Ads
$msstart.loadRewardedAd()
$msstart.showRewardedAd()
$msstart.isRewardedAdReady()
$msstart.onRewardedAdCompleted(callback)
```

### Platform Constraints
- ⚠️ Runs in **sandboxed iframe** - no navigation, no popups
- ⚠️ **No localStorage/sessionStorage** - use Cloud Saves
- ⚠️ **Must sync audio** with platform mute state
- ✅ Must be accessible via public URL

### Ad Placement Strategy
| Trigger | Ad Type | Frequency |
|---------|---------|-----------|
| After game ends | Interstitial | Every 3rd game |
| Undo move (vs bot) | Rewarded | Per use |
| Get hint | Rewarded | Per use |
| In lobby/menu | Display Banner | Always |
| Skip daily puzzle | Rewarded | Per use |

---

## 🗄️ Database Schema (D1)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  ms_player_id TEXT UNIQUE,
  username TEXT NOT NULL,
  elo_rating INTEGER DEFAULT 1200,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  white_player_id TEXT,
  black_player_id TEXT,
  result TEXT,                    -- 'white' | 'black' | 'draw'
  result_reason TEXT,             -- 'checkmate' | 'resignation' | 'timeout' | 'stalemate' | 'agreement' | 'repetition' | 'insufficient' | '50move'
  time_control TEXT,
  pgn TEXT,
  fen_final TEXT,
  moves_count INTEGER,
  white_elo_before INTEGER,
  black_elo_before INTEGER,
  white_elo_after INTEGER,
  black_elo_after INTEGER,
  started_at DATETIME,
  ended_at DATETIME,
  FOREIGN KEY (white_player_id) REFERENCES users(id),
  FOREIGN KEY (black_player_id) REFERENCES users(id)
);

-- Daily stats for leaderboards
CREATE TABLE daily_stats (
  user_id TEXT,
  date DATE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  elo_change INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Achievements
CREATE TABLE achievements (
  user_id TEXT,
  achievement_id TEXT,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_users_elo ON users(elo_rating DESC);
CREATE INDEX idx_users_ms_player ON users(ms_player_id);
CREATE INDEX idx_games_white ON games(white_player_id);
CREATE INDEX idx_games_black ON games(black_player_id);
CREATE INDEX idx_games_ended ON games(ended_at DESC);
```

---

## 🔄 Durable Objects

### GameRoom
Manages a single chess game session.

```typescript
interface GameRoomState {
  gameId: string;
  players: {
    white: { id: string; ws: WebSocket; connected: boolean };
    black: { id: string; ws: WebSocket; connected: boolean };
  };
  gameState: {
    fen: string;
    pgn: string;
    turn: 'w' | 'b';
    status: 'waiting' | 'playing' | 'finished';
    result?: 'white' | 'black' | 'draw';
    resultReason?: string;
  };
  timeControl: {
    initial: number;      // ms
    increment: number;    // ms
    whiteTime: number;    // ms remaining
    blackTime: number;    // ms remaining
    lastMoveAt: number;   // timestamp
  };
  moveHistory: string[];
}
```

**WebSocket Messages:**
```typescript
// Client → Server
{ type: 'JOIN', playerId: string }
{ type: 'MOVE', from: string, to: string, promotion?: string }
{ type: 'RESIGN' }
{ type: 'DRAW_OFFER' }
{ type: 'DRAW_ACCEPT' }
{ type: 'DRAW_DECLINE' }

// Server → Client
{ type: 'GAME_STATE', state: GameState }
{ type: 'MOVE_MADE', move: Move, fen: string, time: TimeState }
{ type: 'GAME_OVER', result: string, reason: string }
{ type: 'OPPONENT_DISCONNECTED' }
{ type: 'OPPONENT_RECONNECTED' }
{ type: 'DRAW_OFFERED' }
{ type: 'DRAW_DECLINED' }
{ type: 'ERROR', message: string }
```

### Matchmaking
Manages the player queue and pairing.

```typescript
interface MatchmakingState {
  queue: Map<WebSocket, {
    playerId: string;
    elo: number;
    timeControl: string;
    joinedAt: number;
  }>;
}
```

**Pairing Algorithm:**
1. Group by time control
2. Sort by ELO
3. Pair within ±200 ELO (expands over time)
4. Create GameRoom, notify both players

---

## 🧮 ELO Calculation

```typescript
function calculateNewElo(
  playerElo: number,
  opponentElo: number,
  result: 0 | 0.5 | 1,  // 0 = loss, 0.5 = draw, 1 = win
  kFactor: number = 32
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const newElo = playerElo + kFactor * (result - expectedScore);
  return Math.round(newElo);
}
```

**K-Factor Rules:**
- New players (< 30 games): K = 40
- Regular players: K = 32
- High-rated (> 2000): K = 24

---

## 🧪 Testing Checklist

### Functional Tests
- [ ] All chess rules work (castling, en passant, promotion, etc.)
- [ ] Check/checkmate/stalemate detection
- [ ] Draw conditions (50-move, threefold repetition, insufficient material)
- [ ] Timer works correctly with increment
- [ ] Bot responds at all difficulty levels
- [ ] WebSocket reconnection works
- [ ] ELO updates correctly after games

### MSN Start Integration Tests
- [ ] `isInMsStartGame()` returns true in iframe
- [ ] `getPlayerId()` returns valid ID for signed-in users
- [ ] Cloud saves persist across sessions
- [ ] Audio syncs with platform mute state
- [ ] All ad types load and display
- [ ] Leaderboard submission works
- [ ] Share functionality works

### Platform Tests
- [ ] Works in MSN Start dev playground
- [ ] Works in sandboxed iframe
- [ ] No localStorage errors
- [ ] Mobile responsive
- [ ] Touch interactions work
- [ ] Cross-browser compatibility

---

## 📋 Implementation Phases

### Phase 1: Core Game (Week 1-2) ✅ MVP
- [ ] Project setup (Vite + React + Cloudflare)
- [ ] Chessboard UI with react-chessboard
- [ ] chess.js integration for move validation
- [ ] Pass & Play mode
- [ ] Basic game flow (start, play, end)

### Phase 2: Bot Integration (Week 3)
- [ ] Stockfish.js lite integration
- [ ] Web Worker for non-blocking AI
- [ ] 4 difficulty levels
- [ ] Undo/redo functionality
- [ ] Thinking indicator

### Phase 3: Multiplayer (Week 4-5)
- [ ] Durable Objects setup
- [ ] WebSocket communication
- [ ] GameRoom implementation
- [ ] Matchmaking implementation
- [ ] Time controls & timers
- [ ] Disconnection handling

### Phase 4: Database & Users (Week 6)
- [ ] D1 database setup
- [ ] User profiles
- [ ] Game history storage
- [ ] ELO calculation
- [ ] Basic leaderboards

### Phase 5: MSN Integration (Week 7)
- [ ] SDK wrapper implementation
- [ ] Player ID integration
- [ ] Cloud saves
- [ ] Audio sync
- [ ] Ad integration
- [ ] Leaderboard submission

### Phase 6: Polish & Launch (Week 8)
- [ ] UI/UX polish
- [ ] Sound effects
- [ ] Multiple themes
- [ ] Performance optimization
- [ ] Testing & bug fixes
- [ ] MSN Store submission

---

## ⚠️ Important Considerations

### Performance
- Stockfish.js is ~7MB - lazy load only when needed
- Use Web Worker for AI to avoid blocking UI
- WebSocket Hibernation to reduce Durable Object costs
- Compress and cache static assets

### Security
- Validate all moves server-side in multiplayer
- Rate limit API endpoints
- Sanitize user inputs
- Don't trust client-side game state

### MSN Platform
- Always check `isInMsStartGame()` before using SDK
- Handle cases where user is not signed in
- Test in actual MSN iframe, not just standalone
- Follow Microsoft's content guidelines

### Accessibility
- Keyboard navigation support
- Screen reader friendly
- Color contrast for themes
- Touch-friendly on mobile

---

## 📚 Resources

### Documentation
- [MSN Start Games SDK](https://msstart-games-sdk-doc.azurewebsites.net/docs/introduction/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [chess.js](https://github.com/jhlywa/chess.js)
- [react-chessboard](https://github.com/Clariity/react-chessboard)
- [Stockfish.js](https://github.com/official-stockfish/Stockfish)

### MSN Start Submission
1. Microsoft Store: Submit as "Game" (not MSIX/PWA)
2. Add `"ms_start_compatible": true` to PWA manifest
3. Get API KEY from onboarding portal
4. Test in dev playground before submission

---

## 🤖 AI Assistant Guidelines

When working on this project:

1. **Always validate chess logic** - Use chess.js for move validation, never trust manual checks
2. **Consider MSN constraints** - No localStorage, sandboxed iframe, audio sync required
3. **Server-side authority** - In multiplayer, server (Durable Object) is the source of truth
4. **Mobile-first** - Many MSN users are on mobile devices
5. **Ad timing matters** - Never show ads during active gameplay, only between games
6. **Error handling** - Always handle WebSocket disconnections gracefully
7. **Type safety** - Use TypeScript strictly, define interfaces for all data structures

---