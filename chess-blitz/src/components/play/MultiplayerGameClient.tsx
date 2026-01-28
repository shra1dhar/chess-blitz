'use client';

// ==============================================
// Chess Blitz - Multiplayer Game Client
// Handles multiplayer game after matchmaking navigation
// ==============================================

import { useEffect, useState, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { useMultiplayer, MatchState } from '@/hooks/useMultiplayer';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useGameClock } from '@/hooks/useGameClock';
import { useGameOverModal, useGameOverEscapeKey } from '@/hooks/useGameOverModal';
import { useGameLifecycle } from '@/hooks/useGameLifecycle';
import { usePlatformUser } from '@/hooks/usePlatformUser';
import { parseMovesFromPgn, getPlayerResult, getGameStatusFromReason } from '@/utils/moves';
import { LoadingScreen, GameHeader, PlayerInfoCard, GameLayout } from '@/components/game';
import GameInfo from '@/components/GameInfo/GameInfo';
import ChessBoard from '@/components/Board/ChessBoard';
import GameOverModal from '@/components/GameOver/GameOverModal';
import { DrawOfferBanner } from '@/components/Multiplayer/DrawOfferBanner';
import { DrawClaimBanner } from '@/components/Multiplayer/DrawClaimBanner';
import { ReconnectingOverlay } from '@/components/Multiplayer/ReconnectingOverlay';
import { SidebarControls } from '@/components/Multiplayer/SidebarControls';
import { MobileGameControls } from '@/components/Multiplayer/MobileGameControls';
import { MatchmakingOverlay } from '@/components/Tournament/MatchmakingOverlay';

// Delay before showing reconnecting overlay (allows quick reconnects without flashing)
const RECONNECT_OVERLAY_DELAY_MS = 2000;

interface MultiplayerGameClientProps {
  gameId: string;
  dictPromise: Promise<Dictionary>;
  locale: Locale;
}

export function MultiplayerGameClient({ gameId, dictPromise, locale }: MultiplayerGameClientProps) {
  const dict = use(dictPromise);
  const router = useRouter();
  const [showGameOver, setShowGameOver] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chess] = useState(() => new Chess());
  const [showReconnectOverlay, setShowReconnectOverlay] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { theme, pieceSet, showLegalMoves, animationSpeed } = useSettingsStore();

  // Get auth state from store - needed for reconnection after page refresh
  const token = useMultiplayerStore((s) => s.token);
  const currentGameId = useMultiplayerStore((s) => s.currentGameId);
  const initializeSession = useMultiplayerStore((s) => s.initializeSession);
  const isPrivateLobbyGame = useMultiplayerStore((s) => s.isPrivateLobbyGame);
  const privateLobbyId = useMultiplayerStore((s) => s.privateLobbyId);
  const clearPrivateLobbyGame = useMultiplayerStore((s) => s.clearPrivateLobbyGame);

  // Multiplayer state from hook
  const multiplayer = useMultiplayer({
    dict: {
      offerDeclined: dict.draw.offerDeclined,
      opponentReconnected: dict.multiplayer.opponentReconnected,
      rematchSent: dict.tournament.rematchSent,
      rematchReceived: dict.tournament.rematchReceived,
      rematchAccepted: dict.tournament.rematchAccepted,
      rematchDeclined: dict.tournament.rematchDeclined,
    },
  });

  // Real-time clock countdown
  const displayTimes = useGameClock({
    whiteTimeMs: multiplayer.gameState?.whiteTimeMs ?? 0,
    blackTimeMs: multiplayer.gameState?.blackTimeMs ?? 0,
    turn: multiplayer.gameState?.turn ?? 'w',
    lastMoveAt: multiplayer.gameState?.lastMoveAt ?? 0,
    isPlaying: multiplayer.matchState === MatchState.Playing,
  });

  // Platform game lifecycle
  const lifecycle = useGameLifecycle();

  // Platform user info (username, avatar)
  const { user: platformUser } = usePlatformUser();

  // Initialize session on mount - restores token from localStorage for reconnection
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Initialize game connection after session is ready
  // Wait for token AND matching game data (restored from localStorage after page refresh)
  useEffect(() => {
    if (!isInitialized && token && currentGameId === gameId) {
      multiplayer.joinGame(gameId);
      setIsInitialized(true);
    }
  }, [isInitialized, token, currentGameId, gameId, multiplayer.joinGame]);

  // Update chess instance when FEN changes
  useEffect(() => {
    if (multiplayer.gameState?.fen) {
      try {
        chess.load(multiplayer.gameState.fen);
      } catch {
        console.error('Invalid FEN:', multiplayer.gameState.fen);
      }
    }
  }, [multiplayer.gameState?.fen, chess]);

  // Show game over modal when game ends
  useGameOverModal(
    multiplayer.matchState === MatchState.Ended && !!multiplayer.result,
    true,
    setShowGameOver
  );

  // Handle Escape key to dismiss game over modal
  useGameOverEscapeKey(showGameOver, setShowGameOver);

  // Navigate to new game when matched (during re-queue from game page)
  useEffect(() => {
    if (
      multiplayer.matchState === MatchState.Matched &&
      multiplayer.gameId &&
      multiplayer.gameId !== gameId
    ) {
      // Short delay to allow MatchFound animation to show
      const timer = setTimeout(() => {
        router.push(`/${locale}/play/${multiplayer.gameId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [multiplayer.matchState, multiplayer.gameId, gameId, router, locale]);

  // Platform lifecycle: loading events
  useEffect(() => {
    if (!multiplayer.gameState) {
      lifecycle.signalLoadingStart();
    } else {
      lifecycle.signalLoadingStop();
    }
  }, [multiplayer.gameState, lifecycle]);

  // Platform lifecycle: gameplay start when playing
  useEffect(() => {
    if (multiplayer.matchState === MatchState.Playing) {
      lifecycle.signalGameplayStart();
    }
  }, [multiplayer.matchState, lifecycle]);

  // Platform lifecycle: gameplay stop on game end
  useEffect(() => {
    if (multiplayer.matchState === MatchState.Ended) {
      lifecycle.signalGameplayStop();
      // Celebrate on win (result is in PGN format: '1-0' = white wins, '0-1' = black wins)
      if (multiplayer.result) {
        const playerWon =
          (multiplayer.playerColor === 'w' && multiplayer.result === '1-0') ||
          (multiplayer.playerColor === 'b' && multiplayer.result === '0-1');
        if (playerWon) {
          lifecycle.signalHappyTime();
        }
      }
    }
  }, [multiplayer.matchState, multiplayer.result, multiplayer.playerColor, lifecycle]);

  // Platform lifecycle: cleanup on unmount
  useEffect(() => {
    return () => {
      lifecycle.signalGameplayStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if this is a bot game
  const isBotGame = gameId.startsWith('bot-');
  const isPlaying = multiplayer.matchState === MatchState.Playing;

  // Delayed reconnecting overlay - only show after connection lost for a bit
  // This prevents flashing during quick reconnections
  useEffect(() => {
    const shouldShowReconnect = !isBotGame && multiplayer.connectionStatus === 'disconnected' && isPlaying && !!multiplayer.gameState;

    if (shouldShowReconnect) {
      // Start timer to show overlay after delay
      reconnectTimerRef.current = setTimeout(() => {
        setShowReconnectOverlay(true);
      }, RECONNECT_OVERLAY_DELAY_MS);
    } else {
      // Connection restored or not playing - hide overlay immediately
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setShowReconnectOverlay(false);
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isBotGame, multiplayer.connectionStatus, isPlaying, multiplayer.gameState]);

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
      const piece = chess.get(from);
      const isPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPromotion) {
        multiplayer.makeMove(from, to, (promotion || 'q') as 'q' | 'r' | 'b' | 'n');
      } else {
        multiplayer.makeMove(from, to);
      }
      return true;
    },
    [chess, multiplayer.makeMove]
  );

  // Handle resign
  const handleResign = useCallback(() => {
    if (window.confirm(dict.play.resignConfirm)) {
      multiplayer.resign();
    }
  }, [multiplayer.resign, dict.play.resignConfirm]);

  // Handle back to lobby
  const handleBackToLobby = useCallback(() => {
    multiplayer.reset();
    router.push(`/${locale}`);
  }, [multiplayer.reset, router, locale]);

  // Handle new game (back to tournament lobby)
  const handleNewGame = useCallback(() => {
    multiplayer.reset();
    router.push(`/${locale}/tournament`);
  }, [multiplayer.reset, router, locale]);

  // Handle return to lobby with friend (for private lobby games)
  const handleReturnToLobby = useCallback(() => {
    multiplayer.reset();
    // Navigate back to tournament page with lobbyId param to reopen private lobby
    router.push(`/${locale}/tournament?returnToLobby=${privateLobbyId}`);
  }, [multiplayer.reset, router, locale, privateLobbyId]);

  // Loading state
  if (!multiplayer.gameState) {
    // For bot games, we might still be initializing
    if (isBotGame) {
      return <LoadingScreen message={dict.play.loading} />;
    }
    // For real games, show appropriate message based on connection status
    if (multiplayer.connectionStatus === 'connecting') {
      return <LoadingScreen message={dict.play.connectingToGame} />;
    }
    return <LoadingScreen message={dict.play.loading} />;
  }

  // Error state - no game data (only for real games, bot games don't need WebSocket)
  if (!isBotGame && multiplayer.connectionStatus === 'disconnected' && !multiplayer.gameState) {
    return (
      <LoadingScreen
        message="Game not found or session expired"
        showBackButton
        backLabel="Back to Lobby"
        onBack={handleBackToLobby}
      />
    );
  }

  const isCheck = chess.isCheck();
  const parsedMoves = parseMovesFromPgn(multiplayer.gameState.pgn);
  const gameResult = getPlayerResult(multiplayer.result, multiplayer.playerColor || 'w');
  const gameStatus = getGameStatusFromReason(multiplayer.result, multiplayer.resultReason);

  // Get opponent subtitle (ELO, first move warning, or disconnect warning)
  const getOpponentSubtitle = () => {
    // Disconnect warning takes priority
    if (multiplayer.opponentDisconnected) {
      const countdown = multiplayer.disconnectCountdown;
      const seconds = countdown !== null ? `0:${String(countdown).padStart(2, '0')}` : '';
      // Hardcoded for now - can add i18n later
      const label = seconds ? `Disconnected. Auto-win in ${seconds}` : 'Disconnected';
      return { subtitle: label, isWarning: true, isDisconnected: true };
    }
    // First move warning
    if (
      multiplayer.firstMoveWarning.active &&
      multiplayer.firstMoveWarning.player === (multiplayer.playerColor === 'w' ? 'black' : 'white')
    ) {
      const label = `${dict.firstMoveWarning?.opponentMove || 'Waiting for move...'} ${dict.firstMoveWarning?.autoAbort?.replace('{seconds}', String(multiplayer.firstMoveWarning.countdown)) ||
        `0:${String(multiplayer.firstMoveWarning.countdown).padStart(2, '0')}`
        }`;
      return { subtitle: label, isWarning: true, isDisconnected: false };
    }
    return { subtitle: `${multiplayer.opponent?.elo || '—'} ELO`, isWarning: false, isDisconnected: false };
  };

  // Get player subtitle (color or first move warning)
  const getPlayerSubtitle = () => {
    if (
      multiplayer.firstMoveWarning.active &&
      multiplayer.firstMoveWarning.player === (multiplayer.playerColor === 'w' ? 'white' : 'black')
    ) {
      const label = `${dict.firstMoveWarning?.yourMove || 'Your move.'} ${dict.firstMoveWarning?.autoAbort?.replace('{seconds}', String(multiplayer.firstMoveWarning.countdown)) ||
        `0:${String(multiplayer.firstMoveWarning.countdown).padStart(2, '0')}`
        }`;
      return { subtitle: label, isWarning: true, isDisconnected: false };
    }
    return {
      subtitle: multiplayer.playerColor === 'w' ? dict.gameOptions.white : dict.gameOptions.black,
      isWarning: false,
      isDisconnected: false,
    };
  };

  const opponentSubtitle = getOpponentSubtitle();
  const playerSubtitle = getPlayerSubtitle();

  // Get opponent clock time
  const opponentTimeMs = multiplayer.playerColor === 'w' ? displayTimes.black : displayTimes.white;
  const playerTimeMs = multiplayer.playerColor === 'w' ? displayTimes.white : displayTimes.black;

  return (
    <GameLayout
      theme={theme}
      header={
        <GameHeader title={dict.home.title} backLabel={dict.play.back} onBack={handleBackToLobby} />
      }
      opponentInfo={
        <PlayerInfoCard
          avatarType={multiplayer.opponent?.isBot ? 'bot' : 'human'}
          avatarUrl={multiplayer.opponent?.platformAvatarUrl}
          name={multiplayer.opponent?.platformUsername || multiplayer.opponent?.displayName || 'Opponent'}
          subtitle={opponentSubtitle.subtitle}
          statusIndicator={
            opponentSubtitle.isDisconnected
              ? { type: 'opponentDisconnected', countdown: multiplayer.disconnectCountdown, label: opponentSubtitle.subtitle }
              : opponentSubtitle.isWarning
                ? { type: 'firstMoveWarning', countdown: multiplayer.firstMoveWarning.countdown, label: opponentSubtitle.subtitle }
                : {
                  type: 'clock',
                  timeMs: opponentTimeMs,
                  isActive: multiplayer.gameState.turn !== multiplayer.playerColor,
                }
          }
        />
      }
      board={
        <ChessBoard
          fen={multiplayer.gameState.fen}
          playerColor={multiplayer.playerColor || 'w'}
          onMove={handleMove}
          getLegalMoves={getLegalMoves}
          lastMove={multiplayer.gameState.lastMove || null}
          isPlayerTurn={multiplayer.isMyTurn}
          isCheck={isCheck}
          showLegalMoves={showLegalMoves}
          animationSpeed={animationSpeed}
          pieceSet={pieceSet}
        />
      }
      playerInfo={
        <PlayerInfoCard
          avatarType="human"
          avatarUrl={platformUser?.avatarUrl}
          name={platformUser?.username || dict.play.you}
          subtitle={playerSubtitle.subtitle}
          isPlayer
          statusIndicator={
            playerSubtitle.isWarning
              ? { type: 'firstMoveWarning', countdown: multiplayer.firstMoveWarning.countdown, label: playerSubtitle.subtitle }
              : {
                type: 'clock',
                timeMs: playerTimeMs,
                isActive: multiplayer.gameState.turn === multiplayer.playerColor,
              }
          }
        />
      }
      mobileControls={
        isPlaying && (
          <MobileGameControls
            onOfferDraw={multiplayer.offerDraw}
            onResign={handleResign}
            drawOfferedByMe={multiplayer.drawOfferedByMe}
            dict={dict}
          />
        )
      }
      sidebar={
        <>
          <GameInfo moves={parsedMoves} turn={multiplayer.gameState.turn} status={gameStatus} isCheck={isCheck} dict={dict} />
          {isPlaying && (
            <SidebarControls
              onOfferDraw={multiplayer.offerDraw}
              onResign={handleResign}
              drawOfferedByMe={multiplayer.drawOfferedByMe}
              dict={dict}
            />
          )}
        </>
      }
      overlays={
        <>
          <DrawOfferBanner
            isVisible={multiplayer.drawOffered && !multiplayer.drawOfferedByMe}
            onAccept={multiplayer.acceptDraw}
            onDecline={multiplayer.declineDraw}
            dict={dict.draw}
          />
          <DrawClaimBanner
            claimType={multiplayer.drawClaimAvailable}
            onClaim={multiplayer.claimDraw}
            dict={dict}
          />
          <ReconnectingOverlay
            isVisible={showReconnectOverlay}
            dict={dict}
          />
          <MatchmakingOverlay
            matchState={multiplayer.matchState}
            queuePosition={multiplayer.queuePosition}
            opponent={multiplayer.opponent}
            playerColor={multiplayer.playerColor}
            onCancel={multiplayer.leaveQueue}
            dict={dict}
          />
          {showGameOver && multiplayer.result && (
            <GameOverModal
              result={gameResult}
              status={gameStatus}
              playerColor={multiplayer.playerColor || 'w'}
              eloChanges={
                multiplayer.eloChanges
                  ? {
                    white: multiplayer.eloChanges.whiteEloChange,
                    black: multiplayer.eloChanges.blackEloChange,
                    whiteNew: multiplayer.eloChanges.whiteEloNew,
                    blackNew: multiplayer.eloChanges.blackEloNew,
                  }
                  : undefined
              }
              tournamentType={multiplayer.tournamentType || undefined}
              onPlayAgain={() => {
                // Re-queue instantly for the same tournament type
                const tournamentType = multiplayer.tournamentType;
                if (tournamentType) {
                  multiplayer.reset(); // Clear all state first
                  setShowGameOver(false);
                  multiplayer.joinQueue(tournamentType); // Re-queue with clean state
                } else {
                  handleNewGame(); // Fallback to lobby if type lost (already calls reset)
                }
              }}
              onBackToLobby={handleBackToLobby}
              onDismiss={() => setShowGameOver(false)}
              dict={dict}
              isMultiplayer={true}
              multiplayerReason={multiplayer.resultReason || undefined}
              opponent={multiplayer.opponent || undefined}
              rematchState={multiplayer.rematchState}
              onRequestRematch={multiplayer.requestRematch}
              onAcceptRematch={multiplayer.acceptRematch}
              onDeclineRematch={multiplayer.declineRematch}
              isPrivateLobbyGame={isPrivateLobbyGame}
              onReturnToLobby={handleReturnToLobby}
            />
          )}
        </>
      }
    />
  );
}

export default MultiplayerGameClient;
