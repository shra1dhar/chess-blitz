// ==============================================
// Chess Blitz - Clock Utility Functions
// ==============================================

/**
 * Format milliseconds to MM:SS format
 * Shows tenths of seconds when under 10 seconds
 */
export function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Show tenths when under 10 seconds
  if (totalSeconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format milliseconds to MM:SS.t format (always shows tenths)
 */
export function formatTimeWithTenths(ms: number): string {
  if (ms <= 0) return '0:00.0';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}

/**
 * Check if time is considered "low" (default: under 30 seconds)
 */
export function isLowTime(ms: number, threshold: number = 30000): boolean {
  return ms > 0 && ms < threshold;
}

/**
 * Check if time is critically low (default: under 10 seconds)
 */
export function isCriticalTime(ms: number, threshold: number = 10000): boolean {
  return ms > 0 && ms < threshold;
}
