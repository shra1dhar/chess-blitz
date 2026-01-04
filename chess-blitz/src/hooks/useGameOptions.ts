import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Color } from 'chess.js';
import type { Difficulty } from '@/types/chess';
import { soundManager } from '@/services/soundManager';

type PieceColor = 'random' | 'w' | 'b';

interface UseGameOptionsReturn {
  selectedColor: PieceColor;
  selectedDifficulty: Difficulty;
  handleColorChange: (color: PieceColor) => void;
  handleDifficultyChange: (difficulty: Difficulty) => void;
  startGame: () => void;
}

/**
 * Hook for managing game options state (color and difficulty selection)
 * with sound effects and navigation
 */
export function useGameOptions(): UseGameOptionsReturn {
  const router = useRouter();
  const params = useParams();
  const locale = (params.lang as string) || 'en';

  const [selectedColor, setSelectedColor] = useState<PieceColor>('random');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  const handleColorChange = useCallback((color: PieceColor) => {
    soundManager.playSync('move');
    setSelectedColor(color);
  }, []);

  const handleDifficultyChange = useCallback((difficulty: Difficulty) => {
    soundManager.playSync('move');
    setSelectedDifficulty(difficulty);
  }, []);

  const startGame = useCallback(() => {
    soundManager.playSync('move');
    // Resolve random color
    const actualColor: Color = selectedColor === 'random'
      ? (Math.random() < 0.5 ? 'w' : 'b')
      : selectedColor;

    router.push(`/${locale}/play?color=${actualColor}&difficulty=${selectedDifficulty}`);
  }, [router, locale, selectedColor, selectedDifficulty]);

  return {
    selectedColor,
    selectedDifficulty,
    handleColorChange,
    handleDifficultyChange,
    startGame,
  };
}
