/**
 * Client-side instrumentation for Chess Blitz
 * Runs before React hydration - ideal for browser fixes and early setup
 *
 * Browser fixes based on: https://docs.crazygames.com/resources/html5-resources/
 */

// ==============================================
// Browser Bug Fixes for Gaming Portals
// ==============================================

// 1. Disable unwanted page scroll via wheel on the chessboard only
// Prevents scroll gestures from affecting the page when interacting with the board
// but allows scrolling in other areas (e.g., move history)
document.addEventListener(
	'wheel',
	(event) => {
		const target = event.target as HTMLElement;
		// Only prevent wheel scroll if over the chessboard
		if (target.closest('[data-board]')) {
			event.preventDefault();
		}
	},
	{ passive: false }
);

// 2. Disable unwanted key events (arrow keys, spacebar scrolling)
// Arrow keys and spacebar should control the game, not scroll the page
window.addEventListener('keydown', (event) => {
	if (['ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
		event.preventDefault();
	}
});

// 3. Disable context menu (right-click menu)
// Prevents accidental context menu popup during gameplay
document.addEventListener('contextmenu', (event) => event.preventDefault());

// ==============================================
// PWA Service Worker Registration
// ==============================================

// Register service worker early for PWA installability detection
// This runs before React hydration, making it detectable by PWABuilder
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/sw.js').catch((error) => {
		console.error('SW registration failed:', error);
	});
}
