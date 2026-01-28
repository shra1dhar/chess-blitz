# CrazyGames HTML5 Full Implementation Guide

A comprehensive guide for integrating HTML5 games with the CrazyGames platform for Full Implementation.

## Table of Contents

- [Overview & Requirements Summary](#overview--requirements-summary)
- [SDK Setup & Initialization](#sdk-setup--initialization)
- [Game Module](#game-module)
- [Advertisement Integration](#advertisement-integration)
- [Banner Ads](#banner-ads)
- [User Module & Account Integration](#user-module--account-integration)
- [Data Module (Progress Saving)](#data-module-progress-saving)
- [Multiplayer Features](#multiplayer-features)
- [In-Game Purchases (Xsolla)](#in-game-purchases-xsolla)
- [Technical Requirements](#technical-requirements)
- [Gameplay Requirements](#gameplay-requirements)
- [Game Covers & Media](#game-covers--media)
- [Quality Guidelines & Best Practices](#quality-guidelines--best-practices)
- [Sitelock & Security](#sitelock--security)
- [Testing & Development](#testing--development)
- [Common Fixes & Code Snippets](#common-fixes--code-snippets)

---

## Overview & Requirements Summary

### Full Implementation Requirements

| Category | Requirement |
|----------|-------------|
| Technical | Initial download ≤ 50MB, Total ≤ 250MB, File count ≤ 1500 |
| SDK & Gameplay | Gameplay start event required |
| Gameplay | Full visual QA check, Land directly in gameplay |
| Advertisement | Ads through SDK following guidelines, Works with AdBlock |
| Account Integration | No external login, Progress linked to CG account, Use CG username & avatar, Automatic login |
| Multiplayer | Invite button, Invite link, Instant multiplayer flow, DisableChat preference |
| In-Game Purchases | Invite only - Use CrazyGames Xsolla account and userId |

---

## SDK Setup & Initialization

### Installation

Add the SDK script to your game's `index.html`:

```html
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

### Manual Initialization

The SDK v3 requires manual initialization before use:

```javascript
// Initialize the SDK (required before any SDK calls)
await window.CrazyGames.SDK.init();
```

> **Best Practice:** Initialize during the loading screen since the SDK preloads user data.

### Accessing SDK Modules

```javascript
// Ad module
window.CrazyGames.SDK.ad;

// Banner module
window.CrazyGames.SDK.banner;

// Game module
window.CrazyGames.SDK.game;

// User module
window.CrazyGames.SDK.user;

// Data module
window.CrazyGames.SDK.data;
```

### Promise Handling

The SDK uses promises. You can use async/await or `.then()`/`.catch()`:

```javascript
// Using async/await
try {
  const user = await window.CrazyGames.SDK.user.getUser();
  console.log(user);
} catch (e) {
  console.log("Error:", e);
}

// Using .then/.catch
window.CrazyGames.SDK.user
  .getUser()
  .then((user) => console.log(user))
  .catch((e) => console.log("Error:", e));
```

### Environment Detection

```javascript
// Check current environment
const environment = window.CrazyGames.SDK.environment;
// Values: "crazygames" | "local" | "disabled"
```

> **Important:** On domains other than CrazyGames or localhost, the SDK is disabled. All method calls will throw errors.

---

## Game Module

Access the game module:

```javascript
window.CrazyGames.SDK.game;
```

### Game Settings

```javascript
const settings = window.CrazyGames.SDK.game.settings;
// settings.disableChat - if true, disable in-game chat
// settings.muteAudio - if true, mute game audio

// Listen for settings changes
function listener(newSettings) {
  console.log("Settings updated", newSettings);
}
window.CrazyGames.SDK.game.addSettingsChangeListener(listener);
window.CrazyGames.SDK.game.removeSettingsChangeListener(listener);
```

### Gameplay Start/Stop Events (REQUIRED)

These events are **mandatory** for full implementation:

```javascript
// Call when player starts/resumes playing
window.CrazyGames.SDK.game.gameplayStart();

// Call on every game break (menu, level end, pause)
window.CrazyGames.SDK.game.gameplayStop();
```

> **Important:** The first `gameplayStart()` event determines your game's initial loading size measurement.

### Loading Start/Stop Events

```javascript
// Call when loading begins
window.CrazyGames.SDK.game.loadingStart();

// Call when loading completes
window.CrazyGames.SDK.game.loadingStop();
```

### Happy Time

Trigger celebrations for player achievements:

```javascript
// Use sparingly for special moments (beating a boss, highscore)
window.CrazyGames.SDK.game.happytime();
```

---

## Advertisement Integration

### Requirements Summary

- Ads only through CrazyGames SDK
- Must not interrupt gameplay
- Game must be paused and muted during ads
- Handle unfilled ad calls gracefully
- Players with AdBlocker must still be able to play

### Video Ad Types

- **Midgame Ads** - Between levels, on death, map changes
- **Rewarded Ads** - User-requested for bonuses (extra life, coins, etc.)

### Requesting Video Ads

```javascript
const callbacks = {
  adStarted: () => {
    console.log("Ad started");
    // MUTE audio and PAUSE game here
  },
  adError: (error) => {
    console.log("Ad error", error);
    // UNMUTE audio and RESUME game here
  },
  adFinished: () => {
    console.log("Ad finished");
    // UNMUTE audio and RESUME game here
    // For rewarded ads: give reward here
  },
};

// Midgame ad
window.CrazyGames.SDK.ad.requestAd("midgame", callbacks);

// Rewarded ad
window.CrazyGames.SDK.ad.requestAd("rewarded", callbacks);
```

### Error Codes

```javascript
{
  "code": "unfilled",  // No ad available
  "message": "No ad available"
}
```

Possible codes: `adsDisabledBasicLaunch`, `unfilled`, `adblock`, `adCooldown`, `other`

### Midgame Ad Guidelines

- Show at logical points (level transition, death, map change)
- Never during active gameplay
- Never on navigation buttons (menu, settings, shop)
- Don't worry about frequency - SDK handles timing (max 1 per 3 minutes)
- Request at opportune moments; early requests are ignored

### Rewarded Ad Guidelines

- Must be special opportunities, not expectations
- Button must be clearly visible and accessible
- Skip/close button must be same size/style as watch button
- Show video icon to indicate ad watching is required
- Provide alternatives (use coins instead)
- Don't offer too frequently - use timers
- Never chain multiple ads for single reward
- Cannot appear during active gameplay

### AdBlock Detection

```javascript
const hasAdblock = await window.CrazyGames.SDK.ad.hasAdblock();
console.log("Adblock detected:", hasAdblock);
```

**Rules for AdBlock users:**

- Must be able to play normally
- Can block extra features (cosmetics, levels) with notice
- Never block players entirely
- Don't use popups (interferes with fullscreen)
- Don't show duplicate AdBlock notices

---

## Banner Ads

### Banner Sizes

| Name | Dimensions |
|------|------------|
| Leaderboard | 728x90 |
| Medium | 300x250 |
| Mobile | 320x50 |
| Main | 468x60 |
| Large Mobile | 320x100 |

### Requesting Static Banners

```html
<div id="banner-container" style="width: 300px; height: 250px"></div>
```

```javascript
try {
  await window.CrazyGames.SDK.banner.requestBanner({
    id: "banner-container",
    width: 300,
    height: 250,
  });
} catch (e) {
  console.log("Banner error", e);
}
```

### Responsive Banners

```html
<div id="responsive-banner-container" style="width: 500px; height: 500px"></div>
```

```javascript
try {
  await window.CrazyGames.SDK.banner.requestResponsiveBanner("responsive-banner-container");
} catch (e) {
  console.log("Error", e);
}
```

### Clearing Banners

```javascript
window.CrazyGames.SDK.banner.clearBanner("banner-container");
// or
window.CrazyGames.SDK.banner.clearAllBanners();
```

> **Best Practice:** Clear banners when hiding them to prevent flicker on next display.

### Banner Rules

- Only on useful screens open for 5+ seconds average
- Must not block game UI on any screen size
- Never during gameplay
- Must be distinguishable from game content
- Max 2 banners of same size simultaneously
- 30-second minimum between refreshes
- Max 120 refreshes per session per size

---

## User Module & Account Integration

### Check Availability

```javascript
const available = window.CrazyGames.SDK.user.isUserAccountAvailable;
```

### Get Current User

```javascript
const user = await window.CrazyGames.SDK.user.getUser();
// Returns null if not logged in

// User object structure:
{
  "username": "SingingCheese.TLNU",  // 6-20 chars, alphanumeric + period + underscore
  "profilePictureUrl": "https://images.crazygames.com/userportal/avatars/4.png"
}
```

### Get User Token (For Backend Authentication)

```javascript
try {
  const token = await window.CrazyGames.SDK.user.getUserToken();
  // Send token to your server for verification
} catch (e) {
  // Handle error
}
```

**Token verification:** Verify on server using public key at `https://sdk.crazygames.com/publicKey.json`

**Token payload:**

```javascript
{
  "userId": "UOuZBKgjwpY9k4TSBB2NPugbsHD3",
  "gameId": "20267",
  "username": "RustyCake.ZU9H",
  "profilePictureUrl": "https://images.crazygames.com/userportal/avatars/16.png",
  "iat": 1670328680,
  "exp": 1670332280  // 1 hour lifetime
}
```

### Show Auth Prompt

```javascript
try {
  const user = await window.CrazyGames.SDK.user.showAuthPrompt();
  console.log("User logged in", user);
} catch (e) {
  // Errors: showAuthPromptInProgress, userAlreadySignedIn, userCancelled
}
```

### Auth Listener

```javascript
const listener = (user) => console.log("User changed", user);
window.CrazyGames.SDK.user.addAuthListener(listener);
window.CrazyGames.SDK.user.removeAuthListener(listener);
```

### Account Link Prompt

```javascript
try {
  const response = await window.CrazyGames.SDK.user.showAccountLinkPrompt();
  // response: { "response": "yes" } or { "response": "no" }
} catch (e) {
  // Handle error
}
```

### System Info

```javascript
const systemInfo = window.CrazyGames.SDK.user.systemInfo;

// Structure:
{
  "countryCode": "US",
  "locale": "en-US",  // Use this for language detection
  "device": { "type": "desktop" },  // desktop, tablet, mobile
  "os": { "name": "Windows", "version": "10" },
  "browser": { "name": "Chrome", "version": "107.0.0.0" },
  "applicationType": "web"  // google_play_store, apple_store, pwa, web
}
```

### Full Account Integration Logic

**At Game Launch:**

```javascript
async function initializeUser() {
  try {
    const token = await window.CrazyGames.SDK.user.getUserToken();
    // User is logged in - verify token on server, get userId
    // Check if userId exists in your backend
    // If exists: fetch user data
    // If new: create account automatically
  } catch (e) {
    if (e.code === 'userNotAuthenticated') {
      // User not logged in - allow guest play
      // DON'T auto-trigger auth prompt
    }
  }
}
```

**Key Requirements:**

- No external login options (Facebook, Google, email)
- CrazyGames guests can play as guests
- Logged-in users auto-register/login
- Show CrazyGames username and avatar in-game
- Login button placement: top right corner, not main CTA

---

## Data Module (Progress Saving)

The Data module saves progress to the cloud for logged-in users and localStorage for guests.

### API (Same as localStorage)

```javascript
// Set data
window.CrazyGames.SDK.data.setItem("gold", "100");

// Get data
const gold = window.CrazyGames.SDK.data.getItem("gold");

// Remove data
window.CrazyGames.SDK.data.removeItem("gold");

// Clear all data
window.CrazyGames.SDK.data.clear();
```

### Important Notes

- Enable Data Module toggle when submitting game
- Max 1MB data limit
- SDK debounces saves (1-30 seconds)
- Guest data automatically syncs when user logs in
- Always retrieve data before setting to avoid overwrites

### Migrating Existing Games

```javascript
// Copy existing localStorage to Data module
const existingData = localStorage.getItem("myGameData");
if (existingData && !window.CrazyGames.SDK.data.getItem("myGameData")) {
  window.CrazyGames.SDK.data.setItem("myGameData", existingData);
}
```

---

## Multiplayer Features

### Instant Multiplayer Flag

```javascript
const isInstantMultiplayer = window.CrazyGames.SDK.game.isInstantMultiplayer;

if (isInstantMultiplayer) {
  // Instantly create a new private room/lobby
  // Invite button must be active immediately
}
```

### Invite Link

```javascript
const link = window.CrazyGames.SDK.game.inviteLink({
  roomId: 12345,
  region: "eu",
});

// Retrieve parameters from invite link
const roomId = window.CrazyGames.SDK.game.getInviteParam("roomId");
```

### Invite Button

```javascript
// Show invite button (triggers friend notifications)
const link = window.CrazyGames.SDK.game.showInviteButton({
  roomId: 12345,
});

// Hide when user can't be joined (room full, game started)
window.CrazyGames.SDK.game.hideInviteButton();
```

### Multiplayer Requirements

- Integrate Invite Button from SDK
- Display CrazyGames usernames in-game
- First player in party goes directly to private lobby
- Round-based games: allow continuing with same group
- Submit lobby sizes when uploading build

### Chat Moderation

If implementing chat:

- Disable chat when `game.settings.disableChat` is true
- Add profanity filter
- Consider AI moderation (Lasso Moderation partner)

---

## In-Game Purchases (Xsolla)

> **Note:** Invite-only feature. Contact CrazyGames to apply.

### Get Xsolla Token

```javascript
try {
  const token = await window.CrazyGames.SDK.user.getXsollaUserToken();
  // Use token with Xsolla SDK
} catch (e) {
  console.log("Error:", e);
}
```

> **Best Practice:** Retrieve token fresh each time (tokens expire in ~1 hour).

### Using the Token

```javascript
const xsollaProjectId = "YOUR_PROJECT_ID"; // Provided by CrazyGames

const resp = await fetch(
  `https://store.xsolla.com/api/v2/project/${xsollaProjectId}/user/inventory/items`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);
```

### Order Tracking

```javascript
// Track completed orders
window.CrazyGames.SDK.analytics.trackOrder("xsolla", orderObject);
```

### Requirements

- Only available to logged-in users
- Use CrazyGames account ID for purchases
- Working close button on PayStation
- Handle payment statuses correctly
- Use Webhooks or Inventory API for validation

### Lootbox Restrictions

If game has lootboxes (paid random items):

- **Restricted territories:** Belgium, China, Netherlands, Serbia, Slovakia
- **Additional restrictions:** Taiwan, South Korea (if probabilities not disclosed), Japan (if item value < purchase price)

---

## Technical Requirements

### File Size Limits

| Limit | Value |
|-------|-------|
| Initial download | ≤ 50MB |
| Mobile homepage eligible | ≤ 20MB |
| Total file size | ≤ 250MB |
| File count | ≤ 1500 |

### Browser Compatibility

- Must work on Chrome and Edge
- Safari issues = disabled on Safari
- Chromebook: must work on 4GB RAM devices
- Support mouse, keyboard, touch (if mobile)
- Landscape mode required on desktop

### Mobile Requirements

- Initial download ≤ 20MB for mobile homepage
- Add CSS to prevent selection issues:

```css
body {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
```

### Important Technical Notes

- Use only relative paths for files
- Unity games disabled on iOS by default (memory issues)
- CrazyGames manages Unity DPR for performance

---

## Gameplay Requirements

### Iframe Sizes to Support

```
Desktop non-fullscreen: 907x510, 1216x684, 1077x606, 821x462
Desktop fullscreen: 1366x768, 1920x1080, 1536x864, 1280x720
Mobile: 800x450
Tablet: 1080x607
```

### Content Requirements

- Readable at devicePixelRatio: 1
- Consistent physics across refresh rates (144Hz, 165Hz)
- English language support required
- Translations must be accurate
- Default to user's language (use `systemInfo.locale`)
- PEGI 12 compliant (suitable for ages 13+)

### UI Requirements

- Intuitive controls
- Smooth performance, no crashes
- Original game names and assets
- No custom fullscreen buttons (CrazyGames provides)
- New users must land in gameplay immediately (max 1 click)

### Prohibited Content

- Cross-promotions for external games/platforms
- App Store links in-game
- External login methods

### Allowed Links (Non-CTA, Menu Only)

- Community links (Discord, itch, dev website)
- Game Store links (Steam, Epic) - desktop only, main menu or end of demo
- Links to same game series
- Backlinks to CrazyGames

---

## Game Covers & Media

### Required Images

| Type | Ratio | Size |
|------|-------|------|
| Landscape | 16:9 | 1920x1080px |
| Portrait | 2:3 | 800x1200px |
| Square | 1:1 | 800x800px |

### Image Guidelines

- Consistent visuals across all three sizes
- No borders
- Only game title text (no "Play", "New", etc.)
- No store logos or icons
- No copyrighted visuals you don't own
- No blurry/pixelated images
- Don't just use screenshots - be creative
- Use stylized fonts fitting game aesthetic

### Preview Video Requirements

| Requirement | Value |
|-------------|-------|
| Length | 15-20 seconds (max) |
| Size | 50MB max |
| Resolution | 1080p, 16:9 landscape (mandatory) |
| Portrait | 1080p, 2:3 (optional) |

**Avoid:** Opening transitions, black screens, logo transitions, black bars, default cursor, "Play Now" text, app icons, fast-forwarding, sound

---

## Quality Guidelines & Best Practices

### Onboarding

- Get users to gameplay quickly
- Implement onboarding in gameplay, not separate screens
- Focus on core functionality
- Make onboarding skippable
- Prioritize visuals over text
- Show keyboard/mouse control overlays
- Clear, labeled buttons

### Game Design

- Clear, achievable goals
- Easy to learn
- Intuitive, consistent controls
- Responsive to player actions
- Balanced challenge and pacing
- Comfortable display layout
- Appropriate audio
- No overly repetitive tasks
- Smooth performance

### Restricted Keys

Avoid browser conflicts:

- **Escape** - exits fullscreen
- **Ctrl/Cmd + W** - closes tab (can disable in fullscreen)

Consider AZERTY keyboards (French): WASD → ZQSD

---

## Sitelock & Security

### Protecting Your Game

Check if running on CrazyGames:

```javascript
if (window.location.origin.endsWith("crazygames.com")) {
  // Running on CrazyGames
} else {
  // Show "Available only on CrazyGames" or blank screen
}
```

> **Best Practice:** Use an obfuscator (e.g., obfuscator.io) to protect sitelock code.

### Whitelist Domains (For iframe games using CSP)

```
# General patterns
*.crazygames.com
crazygames.*

# Regional domains (partial list)
www.crazygames.com
de.crazygames.com
www.crazygames.fr
www.crazygames.nl
www.crazygames.pl
www.crazygames.com.br
www.crazygames.ru
www.crazygames.jp
# ... and more regional variations

# Video ads domain
games.crazygames.com
```

---

## Testing & Development

### Local Development

localhost and 127.0.0.1 are treated as local environments:
- Demo ads/banners displayed
- Simulated SDK behavior
- Console logging enabled

Force local mode on other domains:

```
?useLocalSdk=true
```

### Test Parameters (Local)

```
?user_account_available=false
?show_auth_prompt_response=user1|user2|user_cancelled
?link_account_response=yes|no|logged_out
?user_response=user1|user2|logged_out
?token_response=user1|user2|expired_token|logged_out
?disableChat=true
?muteAudio=true
```

### Preview Tool

Use Developer Portal preview for most realistic testing:

- Real CrazyGames environment
- Xsolla token functionality
- SDK feature testing with feedback

---

## Common Fixes & Code Snippets

### Prevent Unwanted Browser Behavior

```javascript
// Disable unwanted page scroll
window.addEventListener("wheel", (event) => event.preventDefault(), { passive: false });

// Disable unwanted key events and spacebar scrolling
window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
    event.preventDefault();
  }
});

// Handle visibility change (Samsung App fix)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    // Pause game
  } else if (document.visibilityState === "visible") {
    // Resume game
  }
});

// Disable context menu outside canvas
document.addEventListener("contextmenu", (event) => event.preventDefault());
```

### Complete SDK Initialization Example

```javascript
async function initCrazyGamesSDK() {
  // Initialize SDK
  await window.CrazyGames.SDK.init();

  // Check environment
  const env = window.CrazyGames.SDK.environment;
  if (env === 'disabled') {
    console.log('SDK disabled on this domain');
    return;
  }

  // Get system info for localization
  const systemInfo = window.CrazyGames.SDK.user.systemInfo;
  setGameLanguage(systemInfo.locale);

  // Check for invite parameters (multiplayer)
  const roomId = window.CrazyGames.SDK.game.getInviteParam("roomId");
  if (roomId) {
    joinRoom(roomId);
    return;
  }

  // Check instant multiplayer flag
  if (window.CrazyGames.SDK.game.isInstantMultiplayer) {
    createPrivateLobby();
    return;
  }

  // Handle user authentication
  try {
    const user = await window.CrazyGames.SDK.user.getUser();
    if (user) {
      // Logged in user
      displayUserProfile(user.username, user.profilePictureUrl);
      loadUserProgress();
    } else {
      // Guest user
      loadLocalProgress();
    }
  } catch (e) {
    console.error('User check failed', e);
  }

  // Report loading complete
  window.CrazyGames.SDK.game.loadingStop();

  // Start gameplay
  startGame();
  window.CrazyGames.SDK.game.gameplayStart();
}
```

### Ad Request with Proper Handling

```javascript
function requestMidgameAd() {
  window.CrazyGames.SDK.ad.requestAd("midgame", {
    adStarted: () => {
      pauseGame();
      muteAudio();
    },
    adError: (error) => {
      console.log("Ad error:", error.code);
      resumeGame();
      unmuteAudio();
    },
    adFinished: () => {
      resumeGame();
      unmuteAudio();
    }
  });
}

function requestRewardedAd(rewardCallback) {
  window.CrazyGames.SDK.ad.requestAd("rewarded", {
    adStarted: () => {
      pauseGame();
      muteAudio();
    },
    adError: (error) => {
      console.log("Rewarded ad error:", error.code);
      resumeGame();
      unmuteAudio();
      // Don't give reward on error
    },
    adFinished: () => {
      resumeGame();
      unmuteAudio();
      rewardCallback(); // Give reward only on successful completion
    }
  });
}
```

---

## Checklist for Full Implementation

- [ ] SDK installed and initialized
- [ ] `gameplayStart()` called when entering gameplay
- [ ] `gameplayStop()` called on breaks/menus
- [ ] `loadingStart()`/`loadingStop()` implemented
- [ ] Video ads integrated (midgame + rewarded)
- [ ] Game paused and muted during ads
- [ ] AdBlock users can still play
- [ ] User module integrated (username, avatar display)
- [ ] Data module for progress saving
- [ ] CrazyGames account auto-login implemented
- [ ] No external login options
- [ ] Initial download ≤ 50MB
- [ ] Game lands directly in gameplay
- [ ] English language supported
- [ ] PEGI 12 compliant content
- [ ] All three cover image sizes provided
- [ ] Preview video meets requirements
- [ ] Multiplayer features (if applicable): Invite button, instant multiplayer
- [ ] Chat moderation (if applicable)
- [ ] Sitelock protection implemented
- [ ] Tested in Developer Portal preview
