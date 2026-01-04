# Part 2: UI Changes to Complement DO Refactoring

---

## Current State Analysis

### Existing UI Components

| Component | Description |
|-----------|-------------|
| **ChessBoard** | Board rendering with move animation |
| **GameClock** | Dual timers with low/critical states |
| **GameOverModal** | Result display + rematch flow |
| **MatchmakingOverlay** | Queue/match found animation |
| **GameControls** | Undo/Resign buttons |
| **Toast System** | react-hot-toast for notifications |

### Missing UI Elements (Gaps Identified)

| Feature | Server Support | UI Support | Status |
|---------|----------------|------------|--------|
| Draw Offer button | ✅ | ❌ | **MISSING** |
| Accept/Decline Draw buttons | ✅ | ❌ | **MISSING** |
| Abort Game button | ✅ | ❌ | **MISSING** |
| Claim Draw (50-move) | ✅ | ❌ | **MISSING** |
| Claim Draw (threefold) | ✅ | ❌ | **MISSING** |
| Opponent Disconnected overlay | ✅ | ❌ | **MISSING** |
| Reconnect countdown timer | ✅ | ❌ | **MISSING** |
| Error message toasts | ✅ | ⚠️ Logs only | **MISSING** |
| Mobile game controls | ✅ | ⚠️ Partial | **NEEDS WORK** |

---

## UI Requirements Specification

### 1. In-Game Controls Panel (During Play)

**Required Buttons:**

- **Offer Draw** — Sends `{ type: 'offerDraw' }`
  - Disabled if you already offered (waiting for response)
  - 30s cooldown indicator
- **Resign** — Sends `{ type: 'resign' }` (exists, needs confirmation)
- **Abort** — Sends `{ type: 'abort' }`
  - Only visible before any moves made
  - No confirmation needed

**Mobile Layout:**

- Controls must be in a fixed bottom bar
- All 3 buttons visible at mobile widths
- Touch-friendly sizes (min 44px tap targets)

### 2. Draw Offer Notification

When opponent offers draw:

- Banner/modal appears with: "Your opponent offers a draw"
- Two buttons: **Accept** | **Decline**
- Should not block the board (can still view position)
- Auto-dismiss after decline

### 3. Draw Claim Notifications

**When 50-move rule is reached:**

- Toast/banner: "50-move rule - You can claim a draw"
- Button: **Claim Draw**
- Persists until claimed or new capture/pawn move

**When threefold repetition occurs:**

- Toast/banner: "Threefold repetition - You can claim a draw"
- Button: **Claim Draw**
- Persists until claimed or position changes

### 4. Opponent Disconnection UI

**When opponent disconnects:**

- Overlay on opponent's side: "Opponent disconnected"
- Countdown timer: "Reconnecting... 30s"
- Timer counts down visually
- Auto-forfeit message if timeout

**When opponent reconnects:**

- Brief toast: "Opponent reconnected"
- Remove overlay

### 5. Both Disconnect Warning

**When you disconnect:**

- Full-screen reconnecting overlay
- "Connection lost - Reconnecting..."
- Progress indicator
- If 60s passes: show "Game ended as draw"

### 6. Game End Reasons UI

`GameOverModal` needs messages for new reasons:

| Reason | Display Message |
|--------|-----------------|
| `abort` | "Game aborted" |
| `timeout_vs_insufficient` | "Draw - Timeout with insufficient material" |
| `seventyfive_move` | "Draw - 75-move rule" |
| `fivefold_repetition` | "Draw - Fivefold repetition" |

### 7. Error Message Toasts

Show toast for error messages:

| Error Code | Toast Message |
|------------|---------------|
| `NOT_YOUR_TURN` | "It's not your turn" |
| `INVALID_MOVE` | "Invalid move" |
| `RATE_LIMITED` | "Slow down! Too many requests" |
| `DRAW_OFFER_COOLDOWN` | "Please wait before offering draw again" |
| `ABORT_NOT_ALLOWED` | "Cannot abort after moves have been made" |

### 8. Mobile-First Game Controls

**Fixed Bottom Bar (mobile only):**

```
┌─────────────────────────────────────┐
│  [Abort/Draw]  [Controls]  [Resign] │
└─────────────────────────────────────┘
```

**Tablet/Desktop Sidebar:**

- Controls in sidebar panel
- Larger buttons with labels
- Game info above controls

---

## Files to Create/Modify

### New Components

| File | Purpose |
|------|---------|
| `src/components/Multiplayer/DrawOfferBanner.tsx` | Draw offer notification |
| `src/components/Multiplayer/DrawClaimBanner.tsx` | 50-move/threefold claim |
| `src/components/Multiplayer/DisconnectOverlay.tsx` | Opponent disconnect UI |
| `src/components/Multiplayer/GameControlsMobile.tsx` | Mobile bottom bar |
| `src/components/Multiplayer/ReconnectingOverlay.tsx` | Self-disconnect UI |

### Modify

| File | Changes |
|------|---------|
| `src/hooks/useMultiplayer.ts` | Add handlers for new messages |
| `src/components/GameOver/GameOverModal.tsx` | New result reasons |
| `src/app/[lang]/tournament/page.tsx` | Add new UI components |
| `src/styles/` | SCSS for new components |

### Hook Changes (useMultiplayer.ts)

```typescript
// Add new state
drawClaimAvailable: 'none' | 'fifty_move' | 'threefold_repetition'
disconnectCountdown: number | null

// Add new handlers
case 'fiftyMoveRule':
  setDrawClaimAvailable('fifty_move');
  break;
case 'threefoldRepetition':
  setDrawClaimAvailable('threefold_repetition');
  break;
case 'error':
  toast.error(getErrorMessage(data.code));
  break;

// Add new actions
abortGame: () => sendMessage({ type: 'abort' })
claimDraw: (reason) => sendMessage({ type: 'claimDraw', reason })
```

---

## Implementation Priority

### Phase 1: Critical Controls (Mobile-First)

- [ ] Mobile game controls bar with Abort/Draw/Resign
- [ ] Draw offer accept/decline UI
- [ ] Opponent disconnect overlay

### Phase 2: Draw Rules

- [ ] 50-move rule claim UI
- [ ] Threefold repetition claim UI
- [ ] New result reason messages

### Phase 3: Polish

- [ ] Error message toasts
- [ ] Reconnecting overlay
- [ ] Animation refinements

---

## Todo List

- [ ] Read existing useMultiplayer hook and tournament page
- [ ] Update useMultiplayer hook with new state and handlers
- [ ] Create DrawOfferBanner component
- [ ] Create DrawClaimBanner component
- [ ] Create DisconnectOverlay component
- [ ] Create GameControlsMobile component
- [ ] Create ReconnectingOverlay component
- [ ] Update GameOverModal with new result reasons
- [ ] Update tournament page with new components
- [ ] Add error message toasts
- [ ] Test build and verify