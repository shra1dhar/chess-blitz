// Minimal service worker for PWA installability
// This enables the app to be installed as a PWA without complex caching logic

self.addEventListener('install', (event) => {
	// Skip waiting to activate immediately
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	// Claim all clients immediately
	event.waitUntil(self.clients.claim());
});

// No-op fetch handler - browser handles all requests normally
self.addEventListener('fetch', () => {});
