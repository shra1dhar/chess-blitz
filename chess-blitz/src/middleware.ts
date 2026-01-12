// ==============================================
// Chess Blitz - Internationalization Middleware
// Handles locale detection and routing
// ==============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { locales, defaultLocale, type Locale } from './i18n/config';

/**
 * Get the preferred locale from the request.
 * Priority: 1) Cookie (NEXT_LOCALE), 2) Accept-Language header, 3) Default
 */
function getLocale(request: NextRequest): string {
  // 1. Check for saved preference cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale;
  }

  // 2. Fall back to Accept-Language header negotiation
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    negotiatorHeaders[key] = value;
  });

  // Get languages from Accept-Language header
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  // Match against supported locales
  try {
    return match(languages, locales as unknown as string[], defaultLocale);
  } catch {
    // If no match found, return default
    return defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and asset paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sounds') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return;
  }

  // Only redirect /en to / (homepage only)
  // Keep /en/tournament, /en/play etc. as-is for localized routing
  if (pathname === '/en') {
    const newUrl = new URL(request.url);
    newUrl.pathname = '/';
    return NextResponse.redirect(newUrl);
  }

  // Check if pathname already has a locale prefix
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // If locale is already in path, continue without redirect
  if (pathnameHasLocale) {
    return;
  }

  // For paths without locale prefix (/, /tournament, etc.)
  const locale = getLocale(request);

  // Homepage (/) stays at root for English users
  if (pathname === '/' && locale === 'en') {
    return;
  }

  // Privacy policy is English-only, no locale redirect
  if (pathname === '/privacy') {
    return;
  }

  // Redirect all users to their locale-prefixed path for non-homepage routes
  const newUrl = new URL(request.url);
  newUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(newUrl);
}

export const config = {
  // Match all paths except static files and API
  matcher: ['/((?!_next|api|sounds|favicon|.*\\..*).*)'],
};
