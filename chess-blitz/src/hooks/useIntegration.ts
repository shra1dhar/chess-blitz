'use client';

// ==============================================
// Chess Blitz - useIntegration Hook
// Provides access to current integration type
// ==============================================

import { useIntegrationStore } from '@/stores/integrationStore';
import { IntegrationType } from '@/types/integration';

interface UseIntegrationReturn {
  /** Current integration type */
  integrationType: IntegrationType;
}

/**
 * Hook to access the current integration type
 *
 * The IntegrationProvider sets the type on mount based on URL query param.
 * Components can use this hook to check which platform SDK is loaded.
 *
 * @example
 * const { integrationType } = useIntegration();
 * if (integrationType === IntegrationType.Msn) {
 *   // MSN-specific logic
 * }
 */
export function useIntegration(): UseIntegrationReturn {
  const integrationType = useIntegrationStore((s) => s.integrationType);
  return { integrationType };
}
