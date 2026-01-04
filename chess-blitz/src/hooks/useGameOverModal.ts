// ==============================================
// Chess Blitz - Game Over Modal Hook
// Handles delayed modal display after game ends
// ==============================================

import { useEffect } from 'react';

/**
 * Hook that handles the delayed display of the game over modal.
 * Shows the modal after a short delay to allow the final move animation to complete.
 */
export function useGameOverModal(
  isGameOver: boolean,
  isInitialized: boolean,
  setShowGameOver: (show: boolean) => void
): void {
  useEffect(() => {
    if (isGameOver && isInitialized) {
      // Small delay for the final move animation
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, isInitialized, setShowGameOver]);
}

/**
 * Hook that handles escape key to dismiss game over modal
 */
export function useGameOverEscapeKey(
  showGameOver: boolean,
  setShowGameOver: (show: boolean) => void
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showGameOver) {
        setShowGameOver(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showGameOver, setShowGameOver]);
}
