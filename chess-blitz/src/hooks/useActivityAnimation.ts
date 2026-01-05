// ==============================================
// Chess Blitz - Activity Animation Hook
// Manages Activity visibility with CSS exit animations
// ==============================================

import { useState, useEffect } from 'react';

interface UseActivityAnimationOptions {
  /** Whether the content should be visible */
  isVisible: boolean;
  /** Duration of exit animation in ms (default: 300) */
  animationDuration?: number;
}

interface UseActivityAnimationReturn {
  /** Mode to pass to Activity component ('visible' | 'hidden') */
  activityMode: 'visible' | 'hidden';
  /** Whether currently animating out (for CSS class) */
  isAnimatingOut: boolean;
  /** Whether content has ever been visible (for lazy initial render) */
  hasBeenVisible: boolean;
}

/**
 * Hook to manage Activity visibility with exit animations.
 *
 * React's Activity component uses `display: none` immediately when mode changes
 * to "hidden". This hook keeps Activity in "visible" mode during the CSS exit
 * animation, then switches to "hidden" after animation completes.
 *
 * @example
 * ```tsx
 * import { Activity } from 'react';
 * import { useActivityAnimation } from '@/hooks/useActivityAnimation';
 *
 * function MyOverlay({ isVisible }) {
 *   const { activityMode, isAnimatingOut } = useActivityAnimation({ isVisible });
 *
 *   return (
 *     <Activity mode={activityMode}>
 *       <div className={isAnimatingOut ? styles.animateOut : styles.animateIn}>
 *         Content here
 *       </div>
 *     </Activity>
 *   );
 * }
 * ```
 */
export function useActivityAnimation({
  isVisible,
  animationDuration = 300,
}: UseActivityAnimationOptions): UseActivityAnimationReturn {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const [wasVisible, setWasVisible] = useState(false);

  useEffect(() => {
    if (isVisible && !wasVisible) {
      // Becoming visible
      setIsAnimatingOut(false);
      setWasVisible(true);
      setHasBeenVisible(true);
    } else if (!isVisible && wasVisible) {
      // Starting exit animation
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setWasVisible(false);
        setIsAnimatingOut(false);
      }, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, wasVisible, animationDuration]);

  return {
    // Keep visible during exit animation so CSS animation can play
    activityMode: isVisible || isAnimatingOut ? 'visible' : 'hidden',
    isAnimatingOut,
    hasBeenVisible,
  };
}
