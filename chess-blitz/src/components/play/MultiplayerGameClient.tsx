'use client';

// ==============================================
// Chess Blitz - Multiplayer Game Client
// Handles multiplayer game after matchmaking navigation
// ==============================================

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMSNAudioSync } from '@/hooks/useSound';
import ChessBoard from '@/components/Board/ChessBoard';
import GameInfo from '@/components/GameInfo/GameInfo';
import GameOverModal from '@/components/GameOver/GameOverModal';
import { DrawOfferBanner } from '@/components/Multiplayer/DrawOfferBanner';
import { DisconnectOverlay } from '@/components/Multiplayer/DisconnectOverlay';
import styles from '@/styles/play.module.scss';

interface MultiplayerGameClientProps {
  gameId: string;
  dictPromise: Promise<Dictionary>;
  locale: Locale;
}

export function MultiplayerGameClient({ gameId, dictPromise, locale }: MultiplayerGameClientProps) {
  // Use React 19's use() hook to unwrap the promise - enables streaming
  const dict = use(dictPromise);
  const router = useRouter();
  const [showGameOver, setShowGameOver] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chess] = useState(() => new Chess());

  const { theme, showLegalMoves, animationSpeed } = useSettingsStore();

  // Clock state - use refs to avoid re-triggering animation loop on server updates
  const serverTimesRef = useRef({ white: 0, black: 0, lastMoveAt: 0, turn: 'w' as 'w' | 'b' });
  const [displayTimes, setDisplayTimes] = useState({ white: 0, black: 0 });
  const animationRef = useRef<number | null>(null);

  // Sync with MSN audio state
  useMSNAudioSync();

  // Multiplayer state from hook
  const {
    connectionStatus,
    matchState,
    gameState,
    playerColor,
    opponent,
    isMyTurn,
    result,
    resultReason,
    drawOffered,
    drawOfferedByMe,
    opponentDisconnected,
    disconnectCountdown,
    rematchState,
    joinGame,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    requestRematch,
    acceptRematch,
    declineRematch,
    reset,
  } = useMultiplayer();

  // Initialize game connection on mount
  useEffect(() => {
    if (!isInitialized) {
      joinGame(gameId);
      setIsInitialized(true);
    }
  }, [isInitialized, gameId, joinGame]);

  // Update chess instance when FEN changes
  useEffect(() => {
    if (gameState?.fen) {
      try {
        chess.load(gameState.fen);
      } catch {
        console.error('Invalid FEN:', gameState.fen);
      }
    }
  }, [gameState?.fen, chess]);

  // Show game over modal when game ends
  useEffect(() => {
    if (matchState === 'ended' && result) {
      const timer = setTimeout(() => {
        setShowGameOver(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [matchState, result]);

  // Update refs when server sends new times (doesn't trigger animation restart)
  useEffect(() => {
    if (!gameState) return;
    serverTimesRef.current = {
      white: gameState.whiteTimeMs,
      black: gameState.blackTimeMs,
      lastMoveAt: gameState.lastMoveAt,
      turn: gameState.turn,
    };
    // Also update display times for initial render
    setDisplayTimes({ white: gameState.whiteTimeMs, black: gameState.blackTimeMs });
  }, [gameState?.whiteTimeMs, gameState?.blackTimeMs, gameState?.lastMoveAt, gameState?.turn]);

  // Real-time clock countdown - only depends on matchState (doesn't re-run on clock updates)
  useEffect(() => {
    const isPlaying = matchState === 'playing';
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const updateClock = () => {
      const { white, black, lastMoveAt, turn } = serverTimesRef.current;
      const elapsed = Date.now() - lastMoveAt;

      if (turn === 'w') {
        setDisplayTimes({ white: Math.max(0, white - elapsed), black });
      } else {
        setDisplayTimes({ white, black: Math.max(0, black - elapsed) });
      }
      animationRef.current = requestAnimationFrame(updateClock);
    };

    animationRef.current = requestAnimationFrame(updateClock);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [matchState]); // Only re-run when game starts/stops

  // Format time for display
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (totalSeconds < 10) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${seconds}.${tenths}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get legal moves for a square
  const getLegalMoves = useCallback(
    (square: Square): Square[] => {
      try {
        const moves = chess.moves({ square, verbose: true });
        return moves.map((m) => m.to as Square);
      } catch {
        return [];
      }
    },
    [chess]
  );

  // Handle move
  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: string): boolean => {
      // Check if promotion is needed
      const piece = chess.get(from);
      const isPromotion =
        piece?.type === 'p' && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPromotion) {
        // Default to queen promotion
        makeMove(from, to, (promotion || 'q') as 'q' | 'r' | 'b' | 'n');
      } else {
        makeMove(from, to);
      }
      return true;
    },
    [chess, makeMove]
  );

  // Handle resign
  const handleResign = useCallback(() => {
    if (window.confirm(dict.play.resignConfirm)) {
      resign();
    }
  }, [resign, dict.play.resignConfirm]);

  // Handle back to lobby
  const handleBackToLobby = useCallback(() => {
    reset();
    router.push(`/${locale}`);
  }, [reset, router, locale]);

  // Handle new game (back to tournament lobby)
  const handleNewGame = useCallback(() => {
    reset();
    router.push(`/${locale}/tournament`);
  }, [reset, router, locale]);

  // Loading state
  if (!gameState || connectionStatus === 'connecting') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>
            {connectionStatus === 'connecting' ? 'Connecting to game...' : dict.play.loading}
          </p>
        </div>
      </div>
    );
  }

  // Error state - no game data
  if (connectionStatus === 'disconnected' && !gameState) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <p className={styles.loadingText}>Game not found or session expired</p>
          <button onClick={handleBackToLobby} className={styles.backButton}>
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const isPlaying = matchState === 'playing';
  const isCheck = chess.isCheck();

  // Parse moves for GameInfo - needs { san, from, to } format
  const parsedMoves = (() => {
    if (!gameState.pgn) return [];
    const moveStrings = gameState.pgn.split(/\d+\./).filter(Boolean).flatMap((m) => m.trim().split(/\s+/).filter(Boolean));
    // Return simplified format - we don't have from/to from PGN, use empty strings
    return moveStrings.map(san => ({ san, from: '', to: '' }));
  })();

  // Determine game result for modal (convert multiplayer format to chess.ts format)
  const getGameResult = (): 'win' | 'loss' | 'draw' | null => {
    if (!result) return null;
    if (result === '1/2-1/2') return 'draw';
    // Determine if player won based on result and player color
    const whiteWon = result === '1-0';
    const playerIsWhite = playerColor === 'w';
    if ((whiteWon && playerIsWhite) || (!whiteWon && !playerIsWhite)) {
      return 'win';
    }
    return 'loss';
  };

  // Determine game status for modal (convert to chess.ts GameStatus)
  const getGameStatus = (): 'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' => {
    if (!result) return 'playing';
    if (resultReason === 'checkmate') return 'checkmate';
    if (resultReason === 'stalemate') return 'stalemate';
    if (resultReason === 'resignation') return 'resigned';
    if (resultReason === 'timeout') return 'resigned'; // timeout treated as resigned for UI
    if (result === '1/2-1/2') return 'draw';
    return 'playing';
  };

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
            {/* Opponent info */}
            <div className={styles.playerInfo}>
              <div className={styles.playerAvatar}>
                {opponent?.isBot ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
              <div className={styles.playerDetails}>
                <span className={styles.playerName}>{opponent?.displayName || 'Opponent'}</span>
                <span className={styles.playerLevel}>{opponent?.elo || '—'} ELO</span>
              </div>
              {/* Opponent clock */}
              {gameState && playerColor && (
                <div
                  className={`${styles.clock} ${gameState.turn !== playerColor ? styles.clockActive : ''} ${(playerColor === 'w' ? displayTimes.black : displayTimes.white) < 30000 ? styles.clockLow : ''}`}
                >
                  {formatTime(playerColor === 'w' ? displayTimes.black : displayTimes.white)}
                </div>
              )}
            </div>

            {/* Chess Board */}
            <ChessBoard
              fen={gameState.fen}
              playerColor={playerColor || 'w'}
              onMove={handleMove}
              getLegalMoves={getLegalMoves}
              lastMove={gameState.lastMove || null}
              isPlayerTurn={isMyTurn}
              isCheck={isCheck}
              showLegalMoves={showLegalMoves}
              animationSpeed={animationSpeed}
            />

            {/* Player info */}
            <div className={styles.playerInfo}>
              <div className={`${styles.playerAvatar} ${styles.playerAvatarHuman}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className={styles.playerDetails}>
                <span className={styles.playerName}>{dict.play.you}</span>
                <span className={styles.playerLevel}>
                  {playerColor === 'w' ? dict.gameOptions.white : dict.gameOptions.black}
                </span>
              </div>
              {/* Player clock */}
              {gameState && playerColor && (
                <div
                  className={`${styles.clock} ${gameState.turn === playerColor ? styles.clockActive : ''} ${(playerColor === 'w' ? displayTimes.white : displayTimes.black) < 30000 ? styles.clockLow : ''}`}
                >
                  {formatTime(playerColor === 'w' ? displayTimes.white : displayTimes.black)}
                </div>
              )}
            </div>

            {/* Mobile Controls */}
            <div className={styles.mobileControls}>
              <div className={styles.gameControlsRow}>
                {isPlaying && (
                  <>
                    <button
                      className={styles.controlButton}
                      onClick={() => offerDraw()}
                      disabled={drawOfferedByMe}
                      title="Offer Draw"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 8c2-2 4-3 7-3v7c0 2-1 3-2 4l-5 4" />
                      </svg>
                    </button>
                    <button className={styles.controlButton} onClick={handleResign} title="Resign">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l16 16M4 20L20 4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            <GameInfo
              moves={parsedMoves}
              turn={gameState.turn}
              status={getGameStatus()}
              isCheck={isCheck}
              dict={dict}
            />
            {isPlaying && (
              <div className={styles.sidebarControls}>
                <button
                  className={styles.sidebarButton}
                  onClick={() => offerDraw()}
                  disabled={drawOfferedByMe}
                >
                  {drawOfferedByMe ? 'Draw Offered' : 'Offer Draw'}
                </button>
                <button className={styles.sidebarButton} onClick={handleResign}>
                  Resign
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* Draw Offer Banner */}
      <DrawOfferBanner
        isVisible={drawOffered && !drawOfferedByMe}
        onAccept={acceptDraw}
        onDecline={declineDraw}
      />

      {/* Disconnect Overlay */}
      <DisconnectOverlay
        isVisible={opponentDisconnected}
        countdown={disconnectCountdown}
        opponentName={opponent?.displayName}
      />

      {/* Game Over Modal */}
      {showGameOver && result && (
        <GameOverModal
          result={getGameResult()}
          status={getGameStatus()}
          playerColor={playerColor || 'w'}
          onPlayAgain={handleNewGame}
          onBackToLobby={handleBackToLobby}
          dict={dict}
          isMultiplayer={true}
          multiplayerReason={resultReason || undefined}
          rematchState={rematchState}
          onRequestRematch={requestRematch}
          onAcceptRematch={acceptRematch}
          onDeclineRematch={declineRematch}
        />
      )}
    </div>
  );
}

export default MultiplayerGameClient;
