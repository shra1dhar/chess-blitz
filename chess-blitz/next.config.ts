import type { NextConfig } from "next";

// Content Security Policy
// - 'unsafe-inline' used because nonces require dynamic rendering (incompatible with static generation)
// - 'wasm-unsafe-eval' needed for Stockfish WASM engine
// - frame-ancestors allows gaming portals (MSN, CrazyGames, etc.) to embed the game
// - CrazyGames domains: https://docs.crazygames.com/resources/html5-resources/
// const cspHeader = `
// 	default-src 'self';
// 	script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://sdk.crazygames.com;
// 	style-src 'self' 'unsafe-inline';
// 	img-src 'self' blob: data: https://www.google-analytics.com https://www.googletagmanager.com https://sdk.crazygames.com https://*.crazygames.com;
// 	font-src 'self';
// 	connect-src 'self' wss: https://www.google-analytics.com https://www.googletagmanager.com https://*.analytics.google.com https://sdk.crazygames.com https://*.crazygames.com;
// 	worker-src 'self' blob:;
// 	frame-src 'self' https://sdk.crazygames.com https://*.crazygames.com;
// 	object-src 'none';
// 	base-uri 'self';
// 	form-action 'self';
// 	frame-ancestors 'self' https://*.msn.com https://*.microsoft.com https://*.crazygames.com https://*.1001juegos.com https://*.gioco.it;
// 	upgrade-insecure-requests;
// `.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
	// Cache Components (PPR) is NOT compatible with Cloudflare Workers
	// Causes "Cannot perform I/O on behalf of a different request" errors
	// cacheComponents: true,
	// Disable trailing slashes to prevent double redirects
	trailingSlash: false,
	// Required for OpenNext/Cloudflare deployment
	output: 'standalone',
	// Sass configuration
	sassOptions: {
		silenceDeprecations: ['legacy-js-api'],
	},
	// Rewrites: Map root English paths to /en/* internally
	// This allows all routes to be under [lang] while keeping / as the canonical English URL
	async rewrites() {
		return [
			{ source: '/', destination: '/en' },
			{ source: '/play', destination: '/en/play' },
			{ source: '/privacy', destination: '/en/privacy' },
			{ source: '/manifest.webmanifest', destination: '/en/manifest.webmanifest' },
		];
	},
	// Security headers
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					// HSTS - Force HTTPS for 2 years
					{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
					// Note: X-Frame-Options removed - using CSP frame-ancestors instead to allow multiple gaming portals
					// Prevent MIME sniffing attacks
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					// Control referrer information
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					// Disable unused browser APIs
					{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
					// Enable DNS prefetching for performance
					{ key: 'X-DNS-Prefetch-Control', value: 'on' },
					// Content Security Policy
					// { key: 'Content-Security-Policy', value: cspHeader },
				],
			},
		];
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
