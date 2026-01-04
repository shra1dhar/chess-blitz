import { useState, useRef, useEffect, useCallback, type RefObject } from 'react';

interface UseDropdownReturn {
  isOpen: boolean;
  isVisible: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
  handleAnimationEnd: () => void;
}

/**
 * Hook for managing dropdown/panel open/close state with:
 * - Click outside detection
 * - Animation visibility management (isVisible stays true during close animation)
 */
export function useDropdown(): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Add listener on next frame to avoid catching the opening click
      requestAnimationFrame(() => {
        document.addEventListener('mousedown', handleClickOutside);
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  // Handle animation end to hide panel after fade out
  const handleAnimationEnd = useCallback(() => {
    if (!isOpen) {
      setIsVisible(false);
    }
  }, [isOpen]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    isVisible,
    containerRef,
    toggle,
    close,
    handleAnimationEnd,
  };
}
