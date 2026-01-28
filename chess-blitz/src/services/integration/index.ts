// ==============================================
// Chess Blitz - Integration Service
// Public API for platform integrations
// ==============================================

import { IntegrationType } from '@/types/integration';
import type { IIntegrationService, IntegrationCapabilities } from './types';
import { NullIntegrationService } from './NullIntegrationService';
import { MsnIntegrationService } from './MsnIntegrationService';
import { CrazyGamesIntegrationService } from './CrazyGamesIntegrationService';

// Re-export types
export type { IIntegrationService, IntegrationCapabilities };
export { IntegrationType };

// Singleton instances (one per integration type)
let nullService: NullIntegrationService | null = null;
let msnService: MsnIntegrationService | null = null;
let crazyGamesService: CrazyGamesIntegrationService | null = null;

/**
 * Get the integration service for the specified type
 * Services are singletons - same instance is returned for same type
 */
export function getIntegrationService(type: IntegrationType): IIntegrationService {
  switch (type) {
    case IntegrationType.Msn:
      if (!msnService) {
        msnService = new MsnIntegrationService();
      }
      return msnService;

    case IntegrationType.CrazyGames:
      if (!crazyGamesService) {
        crazyGamesService = new CrazyGamesIntegrationService();
      }
      return crazyGamesService;

    case IntegrationType.None:
    default:
      if (!nullService) {
        nullService = new NullIntegrationService();
      }
      return nullService;
  }
}

/**
 * Reset all service instances (useful for testing)
 */
export function resetIntegrationServices(): void {
  nullService = null;
  msnService = null;
  crazyGamesService = null;
}
