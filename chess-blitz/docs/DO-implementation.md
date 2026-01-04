# Chess Blitz Durable Objects Refactoring Plan

Based on Cloudflare DO best practices documentation and the edge cases specification.

---

## Files to Modify

- **GameRoom.ts** — Main game logic DO
- **MatchmakingQueue.ts** — Matchmaking DO
- **multiplayer.ts** — Types and constants
- **NEW: src/server/durable-objects/utils/index.ts** — Shared utilities

---

## Phase 1: Critical Fixes

### 1.1 Create Shared Utilities Module

Create `src/server/durable-objects/utils/index.ts` with:

- `safeSend(ws, message)` — Check readyState before sending
- `safeClose(ws, code, reason)` — Safe WebSocket close
- `checkRateLimit(state, config)` — Per-entity rate limiter
- `d1WithRetry(operation, maxRetries)` — D1 retry with exponential backoff
- Validation: `validatePlayerId`, `validateMoveFormat`, `validateTournamentType`, `validateMessageSize`

### 1.2 Fix Race Condition in MatchmakingQueue.tryMatch()

**Problem:** Player could get matched twice if `tryMatch` called concurrently.

**Solution:** Add `matchingInProgress: Set<string>` to track players being matched.

```typescript
private matchingInProgress: Set<string> = new Set();

private tryMatch(playerId: string): boolean {
  if (this.matchingInProgress.has(playerId)) return false;
  // ... find match ...
  if (bestMatch && !this.matchingInProgress.has(bestMatch.state.playerId)) {
    this.matchingInProgress.add(playerId);
    this.matchingInProgress.add(bestMatch.state.playerId);
    this.createMatch(player, bestMatch);
    return true;
  }
}
```

### 1.3 Remove setTimeout in MatchmakingQueue (Lines 311-318, 351-357)

**Problem:** `setTimeout` doesn't survive hibernation.

**Solution:** Close WebSockets immediately after sending match message.

### 1.4 Fix Time Check Order in GameRoom.handleMove()

**Problem:** Time checked AFTER move validation — should be BEFORE.

**Solution:** Reorder to check time first:

```typescript
const elapsed = now - this.game.lastMoveAt;
const currentPlayerTime = color === 'w' ? this.game.whiteTimeMs : this.game.blackTimeMs;
if (currentPlayerTime - elapsed <= 0) {
  await this.endGame(color === 'w' ? 'black' : 'white', 'timeout');
  return;
}
// THEN validate move
```

### 1.5 Add WebSocket readyState Checks

Replace all `ws.send()` calls with `safeSend(ws, message)` helper.

### 1.6 Delete Alarm Before Setting New One

```typescript
await this.ctx.storage.deleteAlarm();
await this.ctx.storage.setAlarm(nextAlarmTime);
```

### 1.7 Add Tournament Type Validation

Validate `tournament` param before using in `MatchmakingQueue.fetch()`.

---

## Phase 2: Important Robustness

### 2.1 Add Ping/Pong Auto-Response (Both DOs)

```typescript
constructor(ctx: DurableObjectState, env: Env) {
  super(ctx, env);
  this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
}
```

### 2.2 Add Queue Size Limit (MatchmakingQueue)

- Add `MAX_QUEUE_SIZE = 500` constant
- Return 503 if queue full

### 2.3 Add Join Rate Limiting (MatchmakingQueue)

- 5 joins per minute per playerId
- Return 429 if rate limited

### 2.4 Add Max Wait Timeout (MatchmakingQueue)

- 2 minutes max wait before auto-cancel
- Send error and close connection

### 2.5 Add No-Show Timeout (GameRoom)

- 30 seconds after match found for players to connect
- Forfeit absent player or cancel if neither connects

### 2.6 Add Draw Offer Rate Limiting (GameRoom)

- 30 second cooldown between offers per player

### 2.7 Add WebSocket Message Rate Limiting (Both DOs)

- 10 messages per second per connection
- Send error and ignore excess messages

### 2.8 Add Message Size Validation (Both DOs)

- 10KB max message size
- Reject oversized messages

### 2.9 Handle Both Players Disconnect (GameRoom)

- If both disconnect, wait 60 seconds
- If neither reconnects, end as draw

### 2.10 Add D1 Retry Logic (GameRoom)

- Retry transient D1 errors up to 3 times
- Use `DB.batch()` for atomic multi-statement operations

### 2.11 Coalesce Storage Writes

Remove `await` between related storage operations to enable write coalescing.

### 2.12 Add Storage Cleanup

Call `deleteAlarm()` then `deleteAll()` when game session ends.

### 2.13 Add Alarm Idempotency

Check if work was already done before processing in alarm handler.

---

## Phase 3: Enhancements

### 3.1 Input Validation

- PlayerId format: `/^[a-zA-Z0-9_-]{1,64}$/`
- Move format: `/^[a-h][1-8]$/`

### 3.2 Add Game Abort Handling

- Allow abort before any moves made
- No Elo changes, don't save to history

### 3.3 Add 50-Move / 75-Move Rule

- **75-move:** Automatic draw
- **50-move:** Notify players (can claim)

### 3.4 Add Threefold/Fivefold Repetition

- **Fivefold:** Automatic draw
- **Threefold:** Notify players

### 3.5 Timeout vs Insufficient Material

If player times out but opponent can't mate (K vs K, K+B vs K, K+N vs K), result is draw, not loss.

### 3.6 Prevent Repeated Opponent Matching

- Track last 3 opponents per player
- Skip recent opponents when matching

---

## Type Updates (multiplayer.ts)

### New Constants

```typescript
export const MAX_QUEUE_SIZE = 500;
export const MAX_WAIT_MS = 120_000;
export const NO_SHOW_TIMEOUT_MS = 30_000;
export const DRAW_OFFER_COOLDOWN_MS = 30_000;
export const BOTH_DISCONNECT_DRAW_MS = 60_000;
export const MESSAGE_RATE_LIMIT_PER_SEC = 10;
export const MAX_MESSAGE_SIZE_BYTES = 10 * 1024;
export const JOIN_RATE_LIMIT_PER_MIN = 5;
```

### Extended GameResultReason

```typescript
export type GameResultReason =
  | 'checkmate'
  | 'timeout'
  | 'resign'
  | 'stalemate'
  | 'draw'
  | 'disconnect'
  | 'abort'
  | 'timeout_vs_insufficient'
  | 'seventyfive_move'
  | 'fivefold_repetition';
```

### New Message Types

```typescript
// ServerMessage additions:
| { type: 'fiftyMoveRule' }
| { type: 'threefoldRepetition' }

// ClientMessage additions:
| { type: 'abort' }
```

---

## Implementation Order

| Priority | Task | File |
|----------|------|------|
| 1 | Create utils module | NEW: utils/index.ts |
| 2 | Fix tryMatch race condition | MatchmakingQueue.ts |
| 3 | Remove setTimeout | MatchmakingQueue.ts |
| 4 | Fix time check order | GameRoom.ts |
| 5 | Add safeSend/safeClose | Both DOs |
| 6 | Add deleteAlarm before setAlarm | Both DOs |
| 7 | Add tournament validation | MatchmakingQueue.ts |
| 8 | Add ping/pong auto-response | Both DOs |
| 9 | Add queue size limit | MatchmakingQueue.ts |
| 10 | Add rate limiting (joins, messages, draws) | Both DOs |
| 11 | Add no-show timeout | GameRoom.ts |
| 12 | Add both-disconnect handling | GameRoom.ts |
| 13 | Add D1 retry logic | GameRoom.ts |
| 14 | Coalesce storage writes | Both DOs |
| 15 | Add storage cleanup | GameRoom.ts |
| 16 | Add input validation | Both DOs |
| 17 | Add abort handling | GameRoom.ts |
| 18 | Add draw rules (50/75-move, repetition) | GameRoom.ts |
| 19 | Add timeout vs insufficient material | GameRoom.ts |
| 20 | Add repeated opponent prevention | MatchmakingQueue.ts |
| 21 | Update types | multiplayer.ts |

---

## Summary

| Category | Items |
|----------|-------|
| **Critical (must fix)** | Race condition, setTimeout hibernation issue, time check order, WebSocket readyState |
| **Important (robustness)** | Rate limiting, timeouts, D1 retry, storage cleanup |
| **Enhancement (nice-to-have)** | Draw rules, abort, insufficient material detection |

---

## Todo List

- [ ] Create shared utilities module (utils/index.ts)
- [ ] Fix tryMatch race condition in MatchmakingQueue
- [ ] Remove setTimeout in MatchmakingQueue (hibernation incompatible)
- [ ] Fix time check order in GameRoom.handleMove()
- [ ] Add safeSend/safeClose WebSocket helpers to both DOs
- [ ] Add deleteAlarm before setAlarm in both DOs
- [ ] Add tournament type validation in MatchmakingQueue
- [ ] Add ping/pong auto-response to both DOs
- [ ] Add queue size limit to MatchmakingQueue
- [ ] Add rate limiting (joins, messages, draws)
- [ ] Add no-show timeout to GameRoom
- [ ] Add both-disconnect handling to GameRoom
- [ ] Add D1 retry logic to GameRoom
- [ ] Coalesce storage writes in both DOs
- [ ] Add storage cleanup to GameRoom
- [ ] Add input validation (playerId, move format)
- [ ] Add game abort handling to GameRoom
- [ ] Add 50/75-move and repetition draw rules
- [ ] Add timeout vs insufficient material handling
- [ ] Add repeated opponent prevention to MatchmakingQueue
- [ ] Update types in multiplayer.ts