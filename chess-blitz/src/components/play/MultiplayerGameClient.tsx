'use client';

// ==============================================
// Chess Blitz - Multiplayer Game Client
// Handles multiplayer game after matchmaking navigation
// ==============================================

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { Dictionary } from '@/i18n/dictionaries';
import type { Locale } from '@/i18n/config';
import { useMultiplayer } from '@/hooks/useMultiplayer';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useMSNAudioSync } from '@/hooks/useSound';
import { useGameClock } from '@/hooks/useGameClock';
import { useGameOverModal, useGameOverEscapeKey } from '@/hooks/useGameOverModal';
import { parseMovesFromPgn, getPlayerResult, getGameStatusFromReason } from '@/utils/moves';
import { LoadingScreen, GameHeader, PlayerInfoCard, GameLayout } from '@/components/game';
import ChessBoard from '@/components/Board/ChessBoard';
import GameInfo from '@/components/GameInfo/GameInfo';
import GameOverModal from '@/components/GameOver/GameOverModal';
import { DrawOfferBanner } from '@/components/Multiplayer/DrawOfferBanner';
import { DisconnectOverlay } from '@/components/Multiplayer/DisconnectOverlay';
import { SidebarControls } from '@/components/Multiplayer/SidebarControls';
import { MobileGameControls } from '@/components/Multiplayer/MobileGameControls';

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

  const { theme, showLegalMoves, animationSpeed } = useSettingsStore();

  // Get auth state from store - needed for reconnection after page refresh
  const token = useMultiplayerStore((s) => s.token);
  const currentGameId = useMultiplayerStore((s) => s.currentGameId);
  const initializeSession = useMultiplayerStore((s) => s.initializeSession);

  // Sync with MSN audio state
  useMSNAudioSync();

  // Multiplayer state from hook
  const multiplayer = useMultiplayer({ dict: dict.draw });

  // Real-time clock countdown
  const displayTimes = useGameClock({
    whiteTimeMs: multiplayer.gameState?.whiteTimeMs ?? 0,
    blackTimeMs: multiplayer.gameState?.blackTimeMs ?? 0,
    turn: multiplayer.gameState?.turn ?? 'w',
    lastMoveAt: multiplayer.gameState?.lastMoveAt ?? 0,
    isPlaying: multiplayer.matchState === 'playing',
  });

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
    multiplayer.matchState === 'ended' && !!multiplayer.result,
    true,
    setShowGameOver
  );

  // Handle Escape key to dismiss game over modal
  useGameOverEscapeKey(showGameOver, setShowGameOver);

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

  // Loading state
  if (!multiplayer.gameState || multiplayer.connectionStatus === 'connecting') {
    return (
      <LoadingScreen
        message={multiplayer.connectionStatus === 'connecting' ? dict.play.connectingToGame : dict.play.loading}
      />
    );
  }

  // Error state - no game data
  if (multiplayer.connectionStatus === 'disconnected' && !multiplayer.gameState) {
    return (
      <LoadingScreen
        message="Game not found or session expired"
        showBackButton
        backLabel="Back to Lobby"
        onBack={handleBackToLobby}
      />
    );
  }

  const isPlaying = multiplayer.matchState === 'playing';
  const isCheck = chess.isCheck();
  const parsedMoves = parseMovesFromPgn(multiplayer.gameState.pgn);
  const gameResult = getPlayerResult(multiplayer.result, multiplayer.playerColor || 'w');
  const gameStatus = getGameStatusFromReason(multiplayer.result, multiplayer.resultReason);

  // Get opponent subtitle (ELO or first move warning)
  const getOpponentSubtitle = () => {
    if (
      multiplayer.firstMoveWarning.active &&
      multiplayer.firstMoveWarning.player === (multiplayer.playerColor === 'w' ? 'black' : 'white')
    ) {
      const label = `${dict.firstMoveWarning?.opponentMove || 'Waiting for move...'} ${dict.firstMoveWarning?.autoAbort?.replace('{seconds}', String(multiplayer.firstMoveWarning.countdown)) ||
        `0:${String(multiplayer.firstMoveWarning.countdown).padStart(2, '0')}`
        }`;
      return { subtitle: label, isWarning: true };
    }
    return { subtitle: `${multiplayer.opponent?.elo || '—'} ELO`, isWarning: false };
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
      return { subtitle: label, isWarning: true };
    }
    return {
      subtitle: multiplayer.playerColor === 'w' ? dict.gameOptions.white : dict.gameOptions.black,
      isWarning: false,
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
          name={multiplayer.opponent?.displayName || 'Opponent'}
          subtitle={opponentSubtitle.subtitle}
          statusIndicator={
            opponentSubtitle.isWarning
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
        />
      }
      playerInfo={
        <PlayerInfoCard
          avatarType="human"
          name={dict.play.you}
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
          <DisconnectOverlay
            isVisible={multiplayer.opponentDisconnected}
            countdown={multiplayer.disconnectCountdown}
            opponentName={multiplayer.opponent?.displayName}
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
                if (multiplayer.tournamentType) {
                  setShowGameOver(false);
                  multiplayer.joinQueue(multiplayer.tournamentType);
                } else {
                  handleNewGame(); // Fallback to lobby if type lost
                }
              }}
              onBackToLobby={handleBackToLobby}
              onDismiss={() => setShowGameOver(false)}
              dict={dict}
              isMultiplayer={true}
              multiplayerReason={multiplayer.resultReason || undefined}
              rematchState={multiplayer.rematchState}
              onRequestRematch={multiplayer.requestRematch}
              onAcceptRematch={multiplayer.acceptRematch}
              onDeclineRematch={multiplayer.declineRematch}
            />
          )}
        </>
      }
    />
  );
}

export default MultiplayerGameClient;
