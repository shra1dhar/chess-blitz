import { useState, useCallback } from 'react';

export function useResignConfirm(onConfirm: () => void) {
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  const handleResign = useCallback(() => {
    setShowResignConfirm(true);
  }, []);

  const handleResignConfirm = useCallback(() => {
    setShowResignConfirm(false);
    onConfirm();
  }, [onConfirm]);

  const handleResignCancel = useCallback(() => {
    setShowResignConfirm(false);
  }, []);

  return { showResignConfirm, handleResign, handleResignConfirm, handleResignCancel };
}
