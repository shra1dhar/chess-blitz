# Integration System

This document describes the platform integration system for Chess Blitz, enabling the app to run on multiple gaming platforms (MSN, CrazyGames) via SDK loading.

## Quick Reference

| URL Parameter | SDK Loaded |
|---------------|------------|
| `?integration=msn` | MSN Start Games SDK |
| `?integration=crazygames` | CrazyGames SDK v3 |
| (none) | No SDK |

## Current Status

**Fully implemented.** SDK loading, platform services (ads, cloud saves, audio sync), and game lifecycle events are all active.

## Architecture

```
Middleware
    │
    ├── Sets x-url header with current URL
    ▼
Layout (Server Component)
    │
    └── <IntegrationProvider />
            │
            ▼
IntegrationProvider (Server Component)
    │
    ├── Reads x-url from headers() to get integration param
    ├── Renders <Script> with SDK URL (beforeInteractive)
    │
    ▼
IntegrationProviderClient (Client Component)
    │
    ├── Receives integrationType as prop
    ├── Stores type in Zustand
    └── Handles app init (theme, sound, auth, Stockfish)
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    integrationStore (Zustand)                    │
│  • integrationType: IntegrationType                              │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 useIntegration() Hook                            │
│  const { integrationType } = useIntegration();                   │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── types/
│   ├── integration.ts          # IntegrationType enum, SDK URLs
│   └── global.d.ts             # MSNStartSDK & CrazyGamesSDK type declarations
├── stores/
│   └── integrationStore.ts     # Zustand store (type, multiplayer flags)
├── hooks/
│   ├── useIntegration.ts       # Hook to access integrationType
│   ├── useGameLifecycle.ts     # Game lifecycle signals (loadingStart, gameplayStart, etc.)
│   ├── usePlatformUser.ts      # Platform user data (username, avatar)
│   └── usePrivateLobby.ts      # Private lobby management
├── components/IntegrationProvider/
│   ├── index.ts                # Re-exports
│   ├── IntegrationProvider.tsx      # Server component (loads SDK)
│   └── IntegrationProviderClient.tsx # Client component (SDK init, lifecycle)
├── services/integration/       # Platform service implementations
└── middleware.ts               # Sets x-url header for server components
```

### Platform Services (Active)

```
src/services/integration/        # ACTIVE - Platform integrations
├── index.ts                     # Factory: getIntegrationService()
├── types.ts                     # IIntegrationService interface
├── NullIntegrationService.ts    # Dev/standalone fallback
├── MsnIntegrationService.ts     # MSN platform (audio sync, ads)
├── CrazyGamesIntegrationService.ts  # CrazyGames (lifecycle, ads, cloud saves, multiplayer)
└── cloudSync.ts                 # Settings/ELO cloud synchronization
```

**Key service methods:**
- `initialize()` - Initialize SDK (required before other calls)
- `loadingStart()` / `loadingStop()` - Game loading signals
- `gameplayStart()` / `gameplayStop()` - Gameplay signals
- `happyTime()` - Achievement celebration
- `showInterstitialAd()` / `showRewardedAd()` - Ad display
- `getUser()` - Platform user data (username, avatar)
- `saveGameState()` / `loadGameState()` - Cloud saves

## How It Works

1. **Middleware** intercepts requests and sets `x-url` header with the full URL
2. **IntegrationProvider** (server component) reads the header via `headers()` and extracts `?integration=` param
3. **SDK script** is loaded via `next/script` with `beforeInteractive` strategy
4. **IntegrationProviderClient** receives the integration type as a prop and stores it in Zustand
5. **No `typeof window === 'undefined'`** checks needed - integration type is resolved server-side

## Usage

### Check Integration Type

```typescript
import { useIntegration } from '@/hooks/useIntegration';
import { IntegrationType } from '@/types/integration';

function MyComponent() {
  const { integrationType } = useIntegration();

  if (integrationType === IntegrationType.CrazyGames) {
    // CrazyGames-specific logic
  }
}
```

### Access SDK Directly (Advanced)

Since the SDK is loaded via `next/script`, you can access it directly on `window`:

```typescript
// MSN SDK
if (window.$msstart) {
  const isMuted = window.$msstart.getAudioMuted();
}

// CrazyGames SDK
if (window.CrazyGames?.SDK) {
  window.CrazyGames.SDK.game.gameplayStart();
}
```

## IntegrationType Enum

Defined in `src/types/integration.ts`:

```typescript
export enum IntegrationType {
  Msn = 'msn',
  CrazyGames = 'crazygames',
  None = 'none',
}

export const INTEGRATION_SDK_URLS: Record<IntegrationType, string | null> = {
  [IntegrationType.Msn]: 'https://assets.msn.com/staticsb/statics/latest/msstart-games-sdk/msstart-v1.0.0-rc.22.min.js',
  [IntegrationType.CrazyGames]: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
  [IntegrationType.None]: null,
};
```

## Adding a New Integration

1. Add to `IntegrationType` enum in `src/types/integration.ts`
2. Add SDK URL to `INTEGRATION_SDK_URLS`
3. Add SDK types to `src/types/global.d.ts` inside `declare global`
4. Update `parseIntegrationType()` in `src/types/integration.ts`

## Key Implementation Notes

- **No `typeof window === 'undefined'`**: Integration type is resolved server-side via headers
- **Server/client split**: Server component loads SDK, client component handles app init
- **Middleware sets x-url**: Required for server components to read query params in layouts
- **Script loading**: Uses `next/script` with `beforeInteractive` strategy for early availability
