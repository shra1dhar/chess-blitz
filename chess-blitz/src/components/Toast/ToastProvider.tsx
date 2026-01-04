// ==============================================
// Chess Blitz - Toast Provider
// Wrapper for react-hot-toast notifications
// ==============================================

'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  // Only render Toaster after mount to avoid hydration issues with portals
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--color-surface, #1a1a2e)',
          color: 'var(--color-text, #ffffff)',
          border: '1px solid var(--color-border, #2a2a4a)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: 500,
        },
        success: {
          iconTheme: {
            primary: 'var(--color-success, #4ade80)',
            secondary: 'var(--color-surface, #1a1a2e)',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--color-error, #f87171)',
            secondary: 'var(--color-surface, #1a1a2e)',
          },
        },
      }}
    />
  );
}

export default ToastProvider;
