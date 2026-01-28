// ==============================================
// Chess Blitz - Cloud Sync Service
// Syncs settings and ELO to platform cloud storage
// ==============================================

import { IntegrationType } from '@/types/integration';
import { getIntegrationService } from './index';
import type { UserSettings } from '@/types/chess';
import type { TournamentType } from '@chess-blitz/shared';

// Cloud storage keys
const SETTINGS_KEY = 'settings';
const ELO_KEY = 'elo';

// Debounce timeout handle
let settingsSyncTimeout: ReturnType<typeof setTimeout> | null = null;
let eloSyncTimeout: ReturnType<typeof setTimeout> | null = null;

// Settings type for cloud storage
type CloudSettings = Pick<
  UserSettings,
  'theme' | 'pieceSet' | 'soundEnabled' | 'showLegalMoves' | 'autoQueen' | 'confirmMoves' | 'animationSpeed'
>;

// ELO type for cloud storage
type CloudElo = Record<TournamentType, number>;

/**
 * Load settings from cloud storage
 */
export async function loadSettingsFromCloud(
  integrationType: IntegrationType
): Promise<CloudSettings | null> {
  const service = getIntegrationService(integrationType);

  if (!service.capabilities.hasCloudSaves) {
    return null;
  }

  try {
    const settings = await service.loadGameState<CloudSettings>(SETTINGS_KEY);
    if (settings) {
      console.log('[CloudSync] Loaded settings from cloud');
    }
    return settings;
  } catch (error) {
    console.warn('[CloudSync] Failed to load settings from cloud:', error);
    return null;
  }
}

/**
 * Sync settings to cloud storage (debounced)
 */
export function syncSettingsToCloud(
  integrationType: IntegrationType,
  settings: CloudSettings,
  debounceMs = 2000
): void {
  const service = getIntegrationService(integrationType);

  if (!service.capabilities.hasCloudSaves) {
    return;
  }

  // Clear existing timeout
  if (settingsSyncTimeout) {
    clearTimeout(settingsSyncTimeout);
  }

  // Debounce the sync
  settingsSyncTimeout = setTimeout(async () => {
    try {
      const success = await service.saveGameState(SETTINGS_KEY, settings);
      if (success) {
        console.log('[CloudSync] Settings synced to cloud');
      }
    } catch (error) {
      console.warn('[CloudSync] Failed to sync settings to cloud:', error);
    }
  }, debounceMs);
}

/**
 * Load ELO from cloud storage
 */
export async function loadEloFromCloud(
  integrationType: IntegrationType
): Promise<CloudElo | null> {
  const service = getIntegrationService(integrationType);

  if (!service.capabilities.hasCloudSaves) {
    return null;
  }

  try {
    const elo = await service.loadGameState<CloudElo>(ELO_KEY);
    if (elo) {
      console.log('[CloudSync] Loaded ELO from cloud');
    }
    return elo;
  } catch (error) {
    console.warn('[CloudSync] Failed to load ELO from cloud:', error);
    return null;
  }
}

/**
 * Sync ELO to cloud storage (debounced)
 */
export function syncEloToCloud(
  integrationType: IntegrationType,
  elo: CloudElo,
  debounceMs = 2000
): void {
  const service = getIntegrationService(integrationType);

  if (!service.capabilities.hasCloudSaves) {
    return;
  }

  // Clear existing timeout
  if (eloSyncTimeout) {
    clearTimeout(eloSyncTimeout);
  }

  // Debounce the sync
  eloSyncTimeout = setTimeout(async () => {
    try {
      const success = await service.saveGameState(ELO_KEY, elo);
      if (success) {
        console.log('[CloudSync] ELO synced to cloud');
      }
    } catch (error) {
      console.warn('[CloudSync] Failed to sync ELO to cloud:', error);
    }
  }, debounceMs);
}

/**
 * Sync ELO immediately (no debounce) - use after game ends
 */
export async function syncEloToCloudImmediate(
  integrationType: IntegrationType,
  elo: CloudElo
): Promise<boolean> {
  const service = getIntegrationService(integrationType);

  if (!service.capabilities.hasCloudSaves) {
    return false;
  }

  // Clear any pending debounced sync
  if (eloSyncTimeout) {
    clearTimeout(eloSyncTimeout);
    eloSyncTimeout = null;
  }

  try {
    const success = await service.saveGameState(ELO_KEY, elo);
    if (success) {
      console.log('[CloudSync] ELO synced to cloud (immediate)');
    }
    return success;
  } catch (error) {
    console.warn('[CloudSync] Failed to sync ELO to cloud:', error);
    return false;
  }
}

/**
 * Cancel any pending syncs (e.g., on unmount)
 */
export function cancelPendingSyncs(): void {
  if (settingsSyncTimeout) {
    clearTimeout(settingsSyncTimeout);
    settingsSyncTimeout = null;
  }
  if (eloSyncTimeout) {
    clearTimeout(eloSyncTimeout);
    eloSyncTimeout = null;
  }
}
