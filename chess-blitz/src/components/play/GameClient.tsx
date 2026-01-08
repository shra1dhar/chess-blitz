'use client';

// ==============================================
// Chess Blitz - Game Client Component
// Single-player game with Stockfish AI
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
import { useGameOverModal } from '@/hooks/useGameOverModal';
import { LoadingScreen, GameHeader, PlayerInfoCard, GameLayout } from '@/components/game';
import GameControls from '@/components/GameControls/GameControls';
import ChessBoard from '@/components/Board/ChessBoard';
import GameInfo from '@/components/GameInfo/GameInfo';
import GameOverModal from '@/components/GameOver/GameOverModal';

interface GameClientProps {
  dictPromise: Promise<Dictionary>;
  locale: Locale;
}

export function GameClient({ dictPromise, locale }: GameClientProps) {
  const dict = use(dictPromise);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  // Parse URL params
  const playerColor = (searchParams.get('color') as Color) || 'w';
  const difficulty = (searchParams.get('difficulty') as Difficulty) || 'medium';

  // Game state
  const game = useChessGame();
  const { theme, showLegalMoves, animationSpeed } = useSettingsStore();

  // Sync with MSN audio state
  useMSNAudioSync();

  // Initialize game on mount
  useEffect(() => {
    if (!isInitialized && game.isEngineReady) {
      game.startGame(playerColor, difficulty);
      setIsInitialized(true);
    }
  }, [isInitialized, game.isEngineReady, game.startGame, playerColor, difficulty]);

  // Show game over modal when game ends
  useGameOverModal(game.isGameOver, isInitialized, setShowGameOver);

  // Handlers
  const handleNewGame = () => {
    setShowGameOver(false);
    game.startGame(playerColor, difficulty);
  };

  const handleBackToLobby = () => {
    router.push(`/${locale}`);
  };

  const handleResign = () => {
    if (window.confirm(dict.play.resignConfirm)) {
      game.resign();
    }
  };

  // Loading state - show chess-themed screen while Stockfish loads
  if (!game.isEngineReady) {
    return (
      <LoadingScreen
        message={dict.play.engineLoading || 'Preparing your opponent...'}
        variant="engine"
        showBackButton
        backLabel={dict.play.back}
        onBack={() => router.push(`/${locale}`)}
      />
    );
  }

  return (
    <GameLayout
      theme={theme}
      header={
        <GameHeader
          title={dict.home.title}
          backLabel={dict.play.back}
          onBack={handleBackToLobby}
        />
      }
      opponentInfo={
        <PlayerInfoCard
          avatarType="bot"
          name={dict.play.stockfish}
          subtitle={dict.difficulty[difficulty as keyof typeof dict.difficulty]}
          statusIndicator={game.isThinking ? { type: 'thinking' } : undefined}
        />
      }
      board={
        <ChessBoard
          fen={game.fen}
          playerColor={playerColor}
          onMove={game.makeMove}
          getLegalMoves={game.getLegalMoves}
          lastMove={game.lastMove}
          isPlayerTurn={game.isPlayerTurn}
          isCheck={game.isCheck}
          showLegalMoves={showLegalMoves}
          animationSpeed={animationSpeed}
        />
      }
      playerInfo={
        <PlayerInfoCard
          avatarType="human"
          name={dict.play.you}
          subtitle={playerColor === 'w' ? dict.gameOptions.white : dict.gameOptions.black}
          isPlayer
          statusIndicator={
            game.isPlayerTurn && !game.isGameOver
              ? { type: 'yourTurn', label: dict.play.yourTurn }
              : undefined
          }
        />
      }
      mobileControls={
        <GameControls
          onUndo={game.undoMove}
          onResign={handleResign}
          onNewGame={handleNewGame}
          canUndo={game.moves.length >= 2 && !game.isGameOver}
          isGameOver={game.isGameOver}
          dict={dict}
        />
      }
      sidebar={
        <>
          <GameInfo
            moves={game.moves}
            turn={game.turn}
            status={game.status}
            isCheck={game.isCheck}
            dict={dict}
          />
          <GameControls
            onUndo={game.undoMove}
            onResign={handleResign}
            onNewGame={handleNewGame}
            canUndo={game.moves.length >= 2 && !game.isGameOver}
            isGameOver={game.isGameOver}
            dict={dict}
          />
        </>
      }
      overlays={
        showGameOver && (
          <GameOverModal
            result={game.result}
            status={game.status}
            playerColor={playerColor}
            onPlayAgain={handleNewGame}
            onBackToLobby={handleBackToLobby}
            dict={dict}
          />
        )
      }
    />
  );
}
