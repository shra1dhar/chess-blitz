// ==============================================
// Chess Blitz - Integration Provider (Server Component)
// Resolves integration type from searchParams and loads SDK
// ==============================================

import Script from 'next/script';
import { headers } from 'next/headers';
import {
  IntegrationType,
  INTEGRATION_SDK_URLS,
  parseIntegrationType,
} from '@/types/integration';
import { IntegrationProviderClient } from './IntegrationProviderClient';

interface IntegrationProviderProps {
  searchParamsPromise?: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Extract integration type from request headers
 * Falls back to None if not found
 */
async function getIntegrationTypeFromHeaders(): Promise<IntegrationType> {
  const headersList = await headers();

  // Try x-url header (set by some platforms/middleware)
  const xUrl = headersList.get('x-url');
  if (xUrl) {
    try {
      const url = new URL(xUrl);
      const integration = url.searchParams.get('integration');
      if (integration) {
        return parseIntegrationType(integration);
      }
    } catch {
      // Invalid URL, continue
    }
  }

  // Try referer header
  const referer = headersList.get('referer');
  if (referer) {
    try {
      const url = new URL(referer);
      const integration = url.searchParams.get('integration');
      if (integration) {
        return parseIntegrationType(integration);
      }
    } catch {
      // Invalid URL, continue
    }
  }

  return IntegrationType.None;
}

/**
 * Server component that:
 * 1. Gets integration type from searchParams or headers
 * 2. Loads the appropriate SDK script (beforeInteractive)
 * 3. Passes resolved type to client component
 */
export async function IntegrationProvider({
  searchParamsPromise,
}: IntegrationProviderProps) {
  let integrationType: IntegrationType;

  if (searchParamsPromise) {
    // Use searchParams if provided (from page.tsx)
    const searchParams = await searchParamsPromise;
    const integrationParam = searchParams.integration;
    const value = Array.isArray(integrationParam)
      ? integrationParam[0]
      : integrationParam;
    integrationType = parseIntegrationType(value);
  } else {
    // Fall back to reading from headers (from layout.tsx)
    integrationType = await getIntegrationTypeFromHeaders();
  }

  // Get SDK URL for this integration type
  const sdkUrl = INTEGRATION_SDK_URLS[integrationType];

  return (
    <>
      {/* Load SDK script server-side with beforeInteractive for early availability */}
      {sdkUrl && (
        <Script
          src={sdkUrl}
          strategy="beforeInteractive"
          id={`integration-sdk-${integrationType}`}
        />
      )}
      {/* Pass resolved integration type to client component */}
      <IntegrationProviderClient integrationType={integrationType} />
    </>
  );
}
