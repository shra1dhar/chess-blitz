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
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
