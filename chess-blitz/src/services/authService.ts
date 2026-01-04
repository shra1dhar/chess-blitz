// ==============================================
// Chess Blitz - Authentication Service
// ==============================================

import type { AuthResponse, TournamentType } from '@/types/multiplayer';

const AUTH_STORAGE_KEY = 'chess-blitz-auth';

// Get backend URL from environment
function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';
  }
  // Server-side fallback
  return process.env.BACKEND_URL || 'http://localhost:8787';
}

// ==============================================
// Auth Storage
// ==============================================

interface StoredAuth {
  token: string;
  playerId: string;
  displayName: string;
  elo: Record<TournamentType, number>;
  expiresAt: number;
}

/**
 * Get stored auth from localStorage
 */
export function getStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;

    const auth = JSON.parse(stored) as StoredAuth;

    // Check if expired (with 5 minute buffer)
    if (auth.expiresAt && Date.now() > auth.expiresAt - 5 * 60 * 1000) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return auth;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

/**
 * Store auth in localStorage
 */
export function storeAuth(auth: AuthResponse): void {
  if (typeof window === 'undefined') return;

  const stored: StoredAuth = {
    token: auth.token,
    playerId: auth.playerId,
    displayName: auth.displayName,
    elo: auth.elo,
    expiresAt: auth.expiresAt,
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
}

/**
 * Clear auth from localStorage
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

// ==============================================
// Auth API
// ==============================================

/**
 * Create a new guest session
 */
export async function createGuestSession(): Promise<AuthResponse> {
  const backendUrl = getBackendUrl();

  const response = await fetch(`${backendUrl}/auth/guest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create guest session' })) as { message?: string };
    throw new Error(error.message || 'Failed to create guest session');
  }

  const auth: AuthResponse = await response.json();
  storeAuth(auth);
  return auth;
}

/**
 * Refresh an existing token
 */
export async function refreshToken(token: string): Promise<AuthResponse> {
  const backendUrl = getBackendUrl();

  const response = await fetch(`${backendUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // If refresh fails, clear stored auth
    clearAuth();
    throw new Error('Failed to refresh token');
  }

  const auth: AuthResponse = await response.json();
  storeAuth(auth);
  return auth;
}

/**
 * Update ELO after a game
 */
export async function updateElo(
  token: string,
  tournamentType: TournamentType,
  newElo: number
): Promise<AuthResponse> {
  const backendUrl = getBackendUrl();

  const response = await fetch(`${backendUrl}/auth/update-elo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      tournamentType,
      newElo,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update ELO' })) as { message?: string };
    throw new Error(error.message || 'Failed to update ELO');
  }

  const data = await response.json() as { token: string; elo: Record<TournamentType, number> };

  // Update stored auth with new token and ELO
  const storedAuth = getStoredAuth();
  if (storedAuth) {
    const updatedAuth: AuthResponse = {
      token: data.token,
      playerId: storedAuth.playerId,
      displayName: storedAuth.displayName,
      elo: data.elo,
      expiresAt: storedAuth.expiresAt,
    };
    storeAuth(updatedAuth);
    return updatedAuth;
  }

  throw new Error('No stored auth found');
}

/**
 * Initialize auth - get existing or create new guest session
 */
export async function initializeAuth(): Promise<AuthResponse> {
  // Try to get existing auth
  const storedAuth = getStoredAuth();

  if (storedAuth) {
    try {
      // Try to refresh the token to extend expiry
      return await refreshToken(storedAuth.token);
    } catch {
      // If refresh fails, create new session
      return await createGuestSession();
    }
  }

  // No stored auth, create new guest session
  return await createGuestSession();
}

/**
 * Get the current token (or null if not authenticated)
 */
export function getCurrentToken(): string | null {
  const auth = getStoredAuth();
  return auth?.token || null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getStoredAuth() !== null;
}
