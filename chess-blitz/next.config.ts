import type { NextConfig } from "next";

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
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
