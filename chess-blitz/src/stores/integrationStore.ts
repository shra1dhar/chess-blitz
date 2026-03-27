// ==============================================
// Chess Blitz - Integration Store (Zustand)
// Stores current integration type (SDK loaded by server)
// ==============================================

import { create } from 'zustand';
import { IntegrationType } from '@/types/integration';

interface IntegrationStore {
  /** Current integration type (set from server via IntegrationProvider) */
  integrationType: IntegrationType;
  setIntegrationType: (type: IntegrationType) => void;

  // CrazyGames Multiplayer State
  /** True if user clicked "Play with Friends" in CrazyGames UI */
  isInstantMultiplayer: boolean;
  setInstantMultiplayer: (value: boolean) => void;

  /** Room ID from invite link parameter (if user came from friend's invite) */
  inviteRoomId: string | null;
  setInviteRoomId: (roomId: string | null) => void;

  /** True when private lobby overlay should be displayed */
  showPrivateLobby: boolean;
  setShowPrivateLobby: (value: boolean) => void;

  /** Clear all multiplayer state */
  clearMultiplayerState: () => void;
}

export const useIntegrationStore = create<IntegrationStore>((set) => ({
  integrationType: IntegrationType.None,
  setIntegrationType: (type) => set({ integrationType: type }),

  // CrazyGames Multiplayer State
  isInstantMultiplayer: false,
  setInstantMultiplayer: (value) => set({ isInstantMultiplayer: value }),
  inviteRoomId: null,
  setInviteRoomId: (roomId) => set({ inviteRoomId: roomId }),
  showPrivateLobby: false,
  setShowPrivateLobby: (value) => set({ showPrivateLobby: value }),
  // Only clears the trigger states (isInstantMultiplayer, inviteRoomId)
  // Does NOT clear showPrivateLobby - that's managed by the PrivateLobbyWrapper
  clearMultiplayerState: () => set({ isInstantMultiplayer: false, inviteRoomId: null }),
}));
