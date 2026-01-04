'use client';

// ==============================================
// Chess Blitz - Game Client Component
// Client-side game logic with i18n support
// ==============================================

import { useEffect, useState, use } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Color } from 'chess.js';
import type { Difficulty } from '@/types/chess';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { useChessGame } from '@/hooks/useChessGame';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMSNAudioSync } from '@/hooks/useSound';
import ChessBoard from '@/components/Board/ChessBoard';
import GameControls from '@/components/GameControls/GameControls';
import GameInfo from '@/components/GameInfo/GameInfo';
import GameOverModal from '@/components/GameOver/GameOverModal';
import styles from '@/styles/play.module.scss';

interface GameClientProps {
  dictPromise: Promise<Dictionary>;
  locale: Locale;
}

export function GameClient({ dictPromise, locale }: GameClientProps) {
  // Use React 19's use() hook to unwrap the promise - enables streaming
  const dict = use(dictPromise);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  const colorParam = searchParams.get('color') as Color | null;
  const difficultyParam = searchParams.get('difficulty') as Difficulty | null;

  const playerColor = colorParam || 'w';
  const difficulty = difficultyParam || 'medium';

  const {
    fen,
    turn,
    isPlayerTurn,
    isGameOver,
    isCheck,
    isThinking,
    isEngineReady,
    lastMove,
    status,
    result,
    moves,
    startGame,
    makeMove,
    undoMove,
    resign,
    getLegalMoves,
  } = useChessGame();

  const { theme, showLegalMoves, animationSpeed } = useSettingsStore();

  // Sync with MSN audio state
  useMSNAudioSync();

  // Initialize game on mount
  useEffect(() => {
    if (!isInitialized && isEngineReady) {
      startGame(playerColor, difficulty);
      setIsInitialized(true);
    }
  }, [isInitialized, isEngineReady, startGame, playerColor, difficulty]);

  // Show game over modal when game ends
  useEffect(() => {
    if (isGameOver && isInitialized) {
      // Small delay for the final move animation
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGameOver, isInitialized]);

  const handleNewGame = () => {
    setShowGameOver(false);
    startGame(playerColor, difficulty);
  };

  const handleBackToLobby = () => {
    router.push(`/${locale}`);
  };

  const handleResign = () => {
    if (window.confirm(dict.play.resignConfirm)) {
      resign();
    }
  };

  // Loading state
  if (!isEngineReady) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>{dict.play.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.game} data-theme={theme}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backButton} onClick={handleBackToLobby}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>{dict.play.back}</span>
        </button>
        <h1 className={styles.title}>{dict.home.title}</h1>
        <div className={styles.spacer} />
      </header>

      {/* Main game area */}
      <main className={styles.main}>
        <div className={styles.gameLayout}>
          {/* Board section */}
          <div className={styles.boardSection}>
            {/* Opponent info (Bot) */}
            <div className={styles.playerInfo}>
              <div className={styles.playerAvatar}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"/>
                </svg>
              </div>
              <div className={styles.playerDetails}>
                <span className={styles.playerName}>{dict.play.stockfish}</span>
                <span className={styles.playerLevel}>
                  {dict.difficulty[difficulty as keyof typeof dict.difficulty]}
                </span>
              </div>
              {isThinking && (
                <div className={styles.thinkingIndicator}>
                  <span className={styles.thinkingDot} />
                  <span className={styles.thinkingDot} />
                  <span className={styles.thinkingDot} />
                </div>
              )}
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={fen}
              playerColor={playerColor}
              onMove={makeMove}
              getLegalMoves={getLegalMoves}
              lastMove={lastMove}
              isPlayerTurn={isPlayerTurn}
              isCheck={isCheck}
              showLegalMoves={showLegalMoves}
              animationSpeed={animationSpeed}
            />

            {/* Player info */}
            <div className={styles.playerInfo}>
              <div className={`${styles.playerAvatar} ${styles.playerAvatarHuman}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <div className={styles.playerDetails}>
                <span className={styles.playerName}>{dict.play.you}</span>
                <span className={styles.playerLevel}>
                  {playerColor === 'w' ? dict.gameOptions.white : dict.gameOptions.black}
                </span>
              </div>
              {isPlayerTurn && !isGameOver && (
                <div className={styles.turnIndicator}>{dict.play.yourTurn}</div>
              )}
            </div>

            {/* Mobile Controls - shown below board on mobile */}
            <div className={styles.mobileControls}>
              <GameControls
                onUndo={undoMove}
                onResign={handleResign}
                onNewGame={handleNewGame}
                canUndo={moves.length >= 2 && !isGameOver}
                isGameOver={isGameOver}
                dict={dict}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <GameInfo
              moves={moves}
              turn={turn}
              status={status}
              isCheck={isCheck}
              dict={dict}
            />
            <GameControls
              onUndo={undoMove}
              onResign={handleResign}
              onNewGame={handleNewGame}
              canUndo={moves.length >= 2 && !isGameOver}
              isGameOver={isGameOver}
              dict={dict}
            />
          </aside>
        </div>
      </main>

      {/* Game Over Modal */}
      {showGameOver && (
        <GameOverModal
          result={result}
          status={status}
          playerColor={playerColor}
          onPlayAgain={handleNewGame}
          onBackToLobby={handleBackToLobby}
          dict={dict}
        />
      )}
    </div>
  );
}
