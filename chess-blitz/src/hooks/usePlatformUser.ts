'use client';

// ==============================================
// Chess Blitz - usePlatformUser Hook
// Provides platform user info (username, avatar) when available
// Subscribes to auth state changes for reactive updates
// ==============================================

import { useState, useEffect } from 'react';
import { useIntegration } from './useIntegration';
import { getIntegrationService } from '@/services/integration';

interface PlatformUser {
  username: string;
  avatarUrl?: string;
}

interface UsePlatformUserReturn {
  /** Platform user info, or null if not available */
  user: PlatformUser | null;
  /** Whether the user data is still loading */
  isLoading: boolean;
  /** Whether user account features are available on this platform */
  isUserAccountAvailable: boolean;
}

/**
 * Hook to fetch platform user info (username, avatar)
 *
 * Returns the logged-in user's info on platforms that support it (e.g., CrazyGames).
 * For platforms without user modules or when user is not logged in, returns null.
 *
 * Automatically updates when user logs in or out (via auth state listener).
 *
 * @example
 * const { user, isLoading, isUserAccountAvailable } = usePlatformUser();
 * const displayName = user?.username || 'Guest';
 * const avatarUrl = user?.avatarUrl;
 */
export function usePlatformUser(): UsePlatformUserReturn {
  const { integrationType } = useIntegration();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserAccountAvailable, setIsUserAccountAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const service = getIntegrationService(integrationType);

    // Check if user features are available on this platform
    setIsUserAccountAvailable(service.isUserAccountAvailable());

    // Initial fetch
    async function fetchUser() {
      setIsLoading(true);
      try {
        const userData = await service.getUser();
        if (!cancelled) {
          setUser(userData);
        }
      } catch (error) {
        console.warn('[usePlatformUser] Failed to fetch user:', error);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchUser();

    // Subscribe to auth state changes (login/logout)
    // This allows the UI to update without a page refresh
    const unsubscribe = service.onAuthStateChange((newUser) => {
      if (!cancelled) {
        console.log('[usePlatformUser] Auth state changed:', newUser?.username ?? 'logged out');
        setUser(newUser);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [integrationType]);

  return { user, isLoading, isUserAccountAvailable };
}
