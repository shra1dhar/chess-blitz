// ==============================================
// Chess Blitz - Multiplayer Store (Zustand)
// Manages player identity and session state
// ==============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, TournamentType, AuthResponse, PlayerInfo, Color } from '@/types/multiplayer';
import { DEFAULT_ELO } from '@/types/multiplayer';
import {
  initializeAuth,
  storeAuth,
  clearAuth,
  getStoredAuth,
  updateElo as updateEloApi,
} from '@/services/authService';

interface MultiplayerState {
  // Auth
  token: string | null;
  expiresAt: number | null;

  // Player identity
  playerId: string | null;
  displayName: string;
  isGuest: boolean;
  elo: Record<TournamentType, number>;

  // Session
  isAuthenticated: boolean;
  sessionError: string | null;
  isInitializing: boolean;
  lastTournamentType: TournamentType;

  // Current game (persisted for navigation/reconnection)
  currentGameId: string | null;
  currentPlayerColor: Color | null;
  currentOpponent: PlayerInfo | null;
  currentTournamentType: TournamentType | null;

  // Stats (local tracking only)
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;

  // Actions
  setPlayer: (player: Player) => void;
  setAuth: (auth: AuthResponse) => void;
  initializeSession: () => Promise<void>;
  setDisplayName: (name: string) => void;
  updateElo: (tournamentType: TournamentType, newElo: number) => Promise<void>;
  updateStats: (wins: number, losses: number, draws: number) => void;
  setLastTournamentType: (type: TournamentType) => void;
  setCurrentGame: (gameId: string, color: Color, opponent: PlayerInfo, tournamentType: TournamentType) => void;
  clearCurrentGame: () => void;
  clearSessionError: () => void;
  logout: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      expiresAt: null,
      playerId: null,
      displayName: '',
      isGuest: true,
      elo: {
        bullet: DEFAULT_ELO,
        blitz: DEFAULT_ELO,
        rapid: DEFAULT_ELO,
        classical: DEFAULT_ELO,
      },
      isAuthenticated: false,
      sessionError: null,
      isInitializing: false,
      lastTournamentType: 'blitz',
      currentGameId: null,
      currentPlayerColor: null,
      currentOpponent: null,
      currentTournamentType: null,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,

      // Set full player data (from server)
      setPlayer: (player: Player) => {
        set({
          playerId: player.id,
          displayName: player.displayName,
          isGuest: player.isGuest,
          elo: player.elo,
          isAuthenticated: true,
          gamesPlayed: player.gamesPlayed,
          wins: player.wins,
          losses: player.losses,
          draws: player.draws,
        });
      },

      // Set auth from JWT response
      setAuth: (auth: AuthResponse) => {
        storeAuth(auth);
        set({
          token: auth.token,
          expiresAt: auth.expiresAt,
          playerId: auth.playerId,
          displayName: auth.displayName,
          isGuest: true,
          elo: auth.elo,
          isAuthenticated: true,
        });
      },

      // Initialize session - get existing auth or create new guest
      initializeSession: async () => {
        // Prevent concurrent initializations
        if (get().isInitializing) return;

        set({ isInitializing: true, sessionError: null });

        // First check if we have stored auth
        const storedAuth = getStoredAuth();
        if (storedAuth) {
          // Set state from stored auth immediately - this allows the user to proceed
          set({
            token: storedAuth.token,
            expiresAt: storedAuth.expiresAt,
            playerId: storedAuth.playerId,
            displayName: storedAuth.displayName,
            isGuest: true,
            elo: storedAuth.elo,
            isAuthenticated: true,
          });
        }

        try {
          // Try to refresh/create session
          const auth = await initializeAuth();
          set({
            token: auth.token,
            expiresAt: auth.expiresAt,
            playerId: auth.playerId,
            displayName: auth.displayName,
            isGuest: true,
            elo: auth.elo,
            isAuthenticated: true,
            isInitializing: false,
            sessionError: null,
          });
        } catch (error) {
          console.error('Failed to initialize session:', error);

          // If we already have stored auth, keep using it - don't wipe valid auth on API failure
          if (storedAuth) {
            console.log('Using stored auth despite refresh failure');
            set({
              isInitializing: false,
              sessionError: null, // Don't show error since we have valid auth
            });
            return;
          }

          // Only reset to unauthenticated state if we had no stored auth
          const errorMessage =
            error instanceof Error && error.message.includes('fetch')
              ? 'Cannot connect to game server. Please ensure the backend is running.'
              : 'Failed to initialize session. Please try again.';

          set({
            token: null,
            expiresAt: null,
            playerId: null,
            displayName: '',
            isGuest: true,
            elo: {
              bullet: DEFAULT_ELO,
              blitz: DEFAULT_ELO,
              rapid: DEFAULT_ELO,
              classical: DEFAULT_ELO,
            },
            isAuthenticated: false,
            isInitializing: false,
            sessionError: errorMessage,
          });
        }
      },

      // Update display name
      setDisplayName: (name: string) => {
        set({ displayName: name });
      },

      // Update Elo for a specific tournament type
      updateElo: async (tournamentType: TournamentType, newElo: number) => {
        const { token } = get();

        // Update local state immediately
        set((state) => ({
          elo: {
            ...state.elo,
            [tournamentType]: newElo,
          },
        }));

        // Update on server if we have a token
        if (token) {
          try {
            const auth = await updateEloApi(token, tournamentType, newElo);
            set({
              token: auth.token,
              elo: auth.elo,
            });
          } catch (error) {
            console.error('Failed to update ELO on server:', error);
          }
        }
      },

      // Update win/loss/draw stats
      updateStats: (wins: number, losses: number, draws: number) => {
        set((state) => ({
          gamesPlayed: state.gamesPlayed + 1,
          wins: state.wins + wins,
          losses: state.losses + losses,
          draws: state.draws + draws,
        }));
      },

      // Remember last played tournament type
      setLastTournamentType: (type: TournamentType) => {
        set({ lastTournamentType: type });
      },

      // Set current game data (for navigation/reconnection)
      setCurrentGame: (gameId: string, color: Color, opponent: PlayerInfo, tournamentType: TournamentType) => {
        set({
          currentGameId: gameId,
          currentPlayerColor: color,
          currentOpponent: opponent,
          currentTournamentType: tournamentType,
        });
      },

      // Clear current game data
      clearCurrentGame: () => {
        set({
          currentGameId: null,
          currentPlayerColor: null,
          currentOpponent: null,
          currentTournamentType: null,
        });
      },

      // Clear session error
      clearSessionError: () => {
        set({ sessionError: null });
      },

      // Logout / clear session
      logout: () => {
        clearAuth();
        set({
          token: null,
          expiresAt: null,
          playerId: null,
          displayName: '',
          isGuest: true,
          elo: {
            bullet: DEFAULT_ELO,
            blitz: DEFAULT_ELO,
            rapid: DEFAULT_ELO,
            classical: DEFAULT_ELO,
          },
          isAuthenticated: false,
          currentGameId: null,
          currentPlayerColor: null,
          currentOpponent: null,
          currentTournamentType: null,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        });
      },
    }),
    {
      name: 'chess-blitz-multiplayer',
      partialize: (state) => ({
        // Only persist minimal data - auth is stored separately via authService
        lastTournamentType: state.lastTournamentType,
        gamesPlayed: state.gamesPlayed,
        wins: state.wins,
        losses: state.losses,
        draws: state.draws,
      }),
      // Skip hydration to prevent SSR mismatch - rehydrate manually on client
      skipHydration: true,
    }
  )
);

// Note: Rehydration is handled by AppInitializer after React hydration completes
// to avoid React error #185 (Root.render called during hydration)

// Selectors
export const selectPlayerInfo = (state: MultiplayerState) => ({
  id: state.playerId,
  displayName: state.displayName,
  elo: state.elo,
  isGuest: state.isGuest,
});

export const selectCurrentElo = (tournamentType: TournamentType) => (state: MultiplayerState) =>
  state.elo[tournamentType];

export const selectWinRate = (state: MultiplayerState) =>
  state.gamesPlayed > 0 ? (state.wins / state.gamesPlayed) * 100 : 0;

export const selectToken = (state: MultiplayerState) => state.token;

export const selectCurrentGame = (state: MultiplayerState) => ({
  gameId: state.currentGameId,
  playerColor: state.currentPlayerColor,
  opponent: state.currentOpponent,
  tournamentType: state.currentTournamentType,
});
