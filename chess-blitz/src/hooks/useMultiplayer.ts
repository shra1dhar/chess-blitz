// ==============================================
// Chess Blitz - Multiplayer Hook
// Orchestrates matchmaking and multiplayer gameplay
// ==============================================

import { useState, useCallback, useEffect, useRef, useEffectEvent } from 'react';
import type { Square, PieceSymbol, Color as ChessColor } from 'chess.js';
import { Chess } from 'chess.js';
import { useWebSocket, type WebSocketStatus } from './useWebSocket';
import { useStockfish, parseUCIMove } from './useStockfish';
import { useSound } from './useSound';
import type { Difficulty } from '@/types/chess';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMultiplayerStore, selectToken } from '@/stores/multiplayerStore';
import { useShallow } from 'zustand/react/shallow';
import toast from 'react-hot-toast';
import {
  ClientMessageType,
  ServerMessageType,
  DrawClaimReason,
  MatchState,
  RematchState,
  DrawClaimType,
  type TournamentType,
  type PlayerInfo,
  type MultiplayerGameState,
  type ServerMessage,
  type ClientMessage,
  type GameEndResult,
  type GameResult,
  type GameResultReason,
  type Color,
  type SerializedGameState,
  type LiteSerializedGameState,
  RECONNECT_TIMEOUT_MS,
  TOURNAMENT_TIME_MS,
  DEFAULT_ELO,
  toChessColor,
} from '@/types/multiplayer';

// Re-export types for backwards compatibility
export { MatchState, RematchState, DrawClaimType };

/**
 * Calculate client-adjusted lastMoveAt based on server time difference.
 * This compensates for network latency by adjusting the server timestamp
 * to the client's clock.
 *
 * @param serverTime - The server's timestamp when the message was sent
 * @param lastMoveAt - The server's lastMoveAt timestamp
 * @returns The adjusted lastMoveAt relative to client time
 */
function calculateAdjustedLastMoveAt(serverTime: number, lastMoveAt: number): number {
  const clockOffset = Date.now() - serverTime;
  return lastMoveAt + clockOffset;
}

// Error code to user-friendly message mapping
const ERROR_MESSAGES: Record<string, string> = {
  NOT_YOUR_TURN: "It's not your turn",
  INVALID_MOVE: 'Invalid move',
  RATE_LIMITED: 'Slow down! Too many requests',
  DRAW_OFFER_COOLDOWN: 'Please wait before offering draw again',
  CANNOT_ABORT: 'Cannot abort after moves have been made',
  GAME_NOT_FOUND: 'Game not found',
  GAME_NOT_ACTIVE: 'Game is not active',
  NOT_A_PARTICIPANT: 'You are not in this game',
  INVALID_TOKEN: 'Session expired, please refresh',
  MESSAGE_TOO_LARGE: 'Message too large',
  QUEUE_FULL: 'Queue is full, please try again later',
  INVALID_TOURNAMENT_TYPE: 'Invalid tournament type',
};

// RematchState is now imported from @chess-blitz/shared via @/types/multiplayer

interface UseMultiplayerReturn {
  // Connection state
  connectionStatus: WebSocketStatus;

  // Match state
  matchState: MatchState;
  queuePosition: number | null;
  tournamentType: TournamentType | null;

  // Game state
  gameId: string | null;
  playerColor: ChessColor | null;
  opponent: PlayerInfo | null;
  gameState: MultiplayerGameState | null;
  isMyTurn: boolean;

  // Result
  result: GameResult | null;
  resultReason: GameResultReason | null;
  eloChanges: GameEndResult | null;

  // Draw offer
  drawOffered: boolean;
  drawOfferedByMe: boolean;

  // Draw claim (50-move rule, threefold repetition)
  drawClaimAvailable: DrawClaimType;

  // Opponent status
  opponentDisconnected: boolean;
  disconnectCountdown: number | null;

  // Game can be aborted (no moves made yet)
  canAbort: boolean;

  // Rematch
  rematchState: RematchState;

  // First-move warning
  firstMoveWarning: {
    active: boolean;
    player: Color | null;
    countdown: number | null;
  };

  // Actions
  joinQueue: (tournamentType: TournamentType) => void;
  joinGame: (gameId: string) => void;
  leaveQueue: () => void;
  makeMove: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  declineDraw: () => void;
  abortGame: () => void;
  claimDraw: (reason: 'fifty_move' | 'threefold_repetition') => void;
  requestRematch: () => void;
  acceptRematch: () => void;
  declineRematch: () => void;
  reset: () => void;
}

// Convert backend game state to frontend format
function convertGameState(backend: SerializedGameState | LiteSerializedGameState): MultiplayerGameState {
  const adjustedLastMoveAt = calculateAdjustedLastMoveAt(backend.serverTime, backend.lastMoveAt);

  return {
    id: backend.gameId,
    tournamentType: backend.tournamentType,
    white: {
      id: backend.white.id,
      displayName: backend.white.displayName,
      elo: backend.white.elo,
      isBot: backend.white.isBot,
    },
    black: {
      id: backend.black.id,
      displayName: backend.black.displayName,
      elo: backend.black.elo,
      isBot: backend.black.isBot,
    },
    fen: backend.fen,
    pgn: backend.pgn,
    whiteTimeMs: backend.whiteTimeMs,
    blackTimeMs: backend.blackTimeMs,
    turn: toChessColor(backend.turn),
    lastMoveAt: adjustedLastMoveAt,
    serverTime: backend.serverTime,
    status: backend.status,
    lastMove: backend.lastMove
      ? { from: backend.lastMove.from as Square, to: backend.lastMove.to as Square }
      : undefined,
  };
}

// Convert backend result to frontend format
function convertResult(winner: Color | 'draw' | null): GameResult {
  if (winner === 'white') return '1-0';
  if (winner === 'black') return '0-1';
  return '1/2-1/2';
}

// Get backend URL
function getBackendWsUrl(): string {
  if (typeof window !== 'undefined') {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';
    return backendUrl.replace(/^http/, 'ws');
  }
  return 'ws://localhost:8787';
}

// Create initial game state for bot games
function createInitialBotGameState(
  gameId: string,
  playerColor: ChessColor,
  opponent: PlayerInfo,
  tournamentType: TournamentType
): MultiplayerGameState {
  const timeMs = TOURNAMENT_TIME_MS[tournamentType];
  const playerInfo: PlayerInfo = {
    id: 'local-player',
    displayName: 'You',
    elo: DEFAULT_ELO,
    isBot: false,
  };

  return {
    id: gameId,
    tournamentType,
    white: playerColor === 'w' ? playerInfo : opponent,
    black: playerColor === 'b' ? playerInfo : opponent,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    pgn: '',
    whiteTimeMs: timeMs,
    blackTimeMs: timeMs,
    turn: 'w',
    lastMoveAt: Date.now(),
    serverTime: Date.now(),
    status: 'active',
  };
}

// Map bot ELO to Stockfish difficulty
function getBotDifficulty(elo: number): Difficulty {
  if (elo < 800) return 'easy';
  if (elo < 1200) return 'medium';
  if (elo < 1600) return 'hard';
  return 'expert';
}

interface UseMultiplayerOptions {
  /** Dictionary for localized notifications (optional) */
  dict?: { offerDeclined: string };
}

export function useMultiplayer(options: UseMultiplayerOptions = {}): UseMultiplayerReturn {
  const { dict } = options;
  // Get auth and game state from store - use useShallow for object selectors to avoid infinite loops
  const token = useMultiplayerStore(selectToken);
  const currentGame = useMultiplayerStore(
    useShallow((state) => ({
      gameId: state.currentGameId,
      playerColor: state.currentPlayerColor,
      opponent: state.currentOpponent,
      tournamentType: state.currentTournamentType,
    }))
  );
  const setCurrentGame = useMultiplayerStore((state) => state.setCurrentGame);
  const clearCurrentGame = useMultiplayerStore((state) => state.clearCurrentGame);

  // State
  const [matchState, setMatchState] = useState<MatchState>(MatchState.Idle);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [tournamentType, setTournamentType] = useState<TournamentType | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<ChessColor | null>(null);
  const [opponent, setOpponent] = useState<PlayerInfo | null>(null);
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [resultReason, setResultReason] = useState<GameResultReason | null>(null);
  const [eloChanges, setEloChanges] = useState<GameEndResult | null>(null);
  const [drawOffered, setDrawOffered] = useState(false);
  const [drawOfferedByMe, setDrawOfferedByMe] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const [drawClaimAvailable, setDrawClaimAvailable] = useState<DrawClaimType>(DrawClaimType.None);
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rematch state
  const [rematchState, setRematchState] = useState<RematchState>(RematchState.Idle);

  // First-move warning state
  const [firstMoveWarning, setFirstMoveWarning] = useState<{
    active: boolean;
    player: Color | null;
    countdown: number | null;
  }>({ active: false, player: null, countdown: null });
  const firstMoveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs
  const pendingGameConnectionRef = useRef<{ gameId: string; color: Color } | null>(null);
  const isBotGameRef = useRef(false);
  const botChessRef = useRef<Chess | null>(null);
  const drawOfferedByMeRef = useRef(false);

  // Bot game state - used for lazy loading Stockfish (state triggers re-render, ref for sync access)
  const [isBotGame, setIsBotGame] = useState(false);

  // Settings
  const { soundEnabled } = useSettingsStore();
  const { playMoveSound, playCheckmateSound, playGameEndSound, playGameStartSound } = useSound();

  // Handle bot's best move using useEffectEvent to avoid Stockfish re-initialization
  const handleBotMove = useEffectEvent((uciMove: string) => {
    if (!isBotGameRef.current || !botChessRef.current || !gameState) return;

    const { from, to, promotion } = parseUCIMove(uciMove);

    try {
      const move = botChessRef.current.move({
        from,
        to,
        promotion: promotion as PieceSymbol | undefined,
      });

      if (move) {
        const newTurn = botChessRef.current.turn();
        const isCheckmate = botChessRef.current.isCheckmate();
        const isStalemate = botChessRef.current.isStalemate();
        const isDraw = botChessRef.current.isDraw();

        // Calculate elapsed time
        const elapsed = Date.now() - gameState.lastMoveAt;
        const newWhiteTime = gameState.turn === 'w' ? Math.max(0, gameState.whiteTimeMs - elapsed) : gameState.whiteTimeMs;
        const newBlackTime = gameState.turn === 'b' ? Math.max(0, gameState.blackTimeMs - elapsed) : gameState.blackTimeMs;

        // Update game state
        setGameState((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            fen: botChessRef.current!.fen(),
            pgn: botChessRef.current!.pgn(),
            turn: newTurn,
            whiteTimeMs: newWhiteTime,
            blackTimeMs: newBlackTime,
            lastMoveAt: Date.now(),
            serverTime: Date.now(),
            lastMove: { from: from as Square, to: to as Square },
            status: isCheckmate || isStalemate || isDraw ? 'finished' : 'active',
          };
        });

        if (soundEnabled) {
          playMoveSound();
        }

        // Check for game end
        if (isCheckmate) {
          // Bot checkmated the player (it was bot's turn, now it's player's turn but they're mated)
          setMatchState(MatchState.Ended);
          setResult(playerColor === 'w' ? '0-1' : '1-0'); // Bot won
          setResultReason('checkmate');
          if (soundEnabled) playCheckmateSound();
        } else if (isStalemate || isDraw) {
          setMatchState(MatchState.Ended);
          setResult('1/2-1/2');
          setResultReason(isStalemate ? 'stalemate' : 'draw_agreement');
          if (soundEnabled) playGameEndSound();
        }
      }
    } catch (error) {
      console.error('[Bot] Move error:', error);
    }
  });

  // Stockfish integration for bot games - lazy loaded only when in bot game
  const { isReady: isStockfishReady, findBestMove, stop: stopStockfish } = useStockfish({
    difficulty: getBotDifficulty(opponent?.elo || 1500),
    onBestMove: handleBotMove,
    onError: (error) => console.error('[Stockfish] Error:', error),
    enabled: isBotGame, // Only load Stockfish when in bot game
  });

  // Build WebSocket URLs
  const getMatchmakingUrl = useCallback(
    (tournament: TournamentType) => {
      if (!token) return null;
      const baseWsUrl = getBackendWsUrl();
      return `${baseWsUrl}/ws/queue/${tournament}?token=${encodeURIComponent(token)}`;
    },
    [token]
  );

  const getGameUrl = useCallback(
    (gId: string, color: Color) => {
      if (!token) return null;
      const baseWsUrl = getBackendWsUrl();
      return `${baseWsUrl}/ws/game/${gId}?token=${encodeURIComponent(token)}&color=${color}`;
    },
    [token]
  );

  // Handle messages using useEffectEvent to avoid reconnection when callbacks change
  // This allows us to always access the latest soundEnabled, playerColor, etc. without
  // causing the WebSocket to reconnect when these values change
  const handleMessage = useEffectEvent((data: unknown) => {
    const message = data as ServerMessage;

    switch (message.type) {
      case ServerMessageType.Connected:
        // Reset error counter on successful connection
        connectionErrorCountRef.current = 0;
        break;

      case ServerMessageType.QueueJoined:
        setMatchState(MatchState.Queued);
        setQueuePosition(message.position);
        setTournamentType(message.tournamentType);
        connectionErrorCountRef.current = 0;
        break;

      case ServerMessageType.QueuePosition:
        setQueuePosition(message.position);
        break;

      case ServerMessageType.QueueLeft:
        setMatchState(MatchState.Idle);
        setQueuePosition(null);
        break;

      case ServerMessageType.MatchFound:
        // Clear queue timeout - we found a match!
        if (queueTimeoutRef.current) {
          clearTimeout(queueTimeoutRef.current);
          queueTimeoutRef.current = null;
        }

        setMatchState(MatchState.Matched);
        setGameId(message.gameId);
        setPlayerColor(toChessColor(message.color));
        setOpponent(message.opponent);
        isBotGameRef.current = Boolean(message.opponent.isBot);

        // Store game data in persistent store for navigation/reconnection
        if (joinQueueTournamentRef.current) {
          setCurrentGame(
            message.gameId,
            message.color,
            message.opponent,
            joinQueueTournamentRef.current
          );
        }

        if (soundEnabled) {
          playGameStartSound();
        }

        // Store pending game connection info - will connect after matchmaking WS closes
        pendingGameConnectionRef.current = { gameId: message.gameId, color: message.color };
        break;

      case ServerMessageType.GameStart:
      case ServerMessageType.GameState:
        setMatchState(MatchState.Playing);
        setGameState(convertGameState(message.gameState));
        break;

      case ServerMessageType.MoveMade:
        setGameState(convertGameState(message.gameState));
        // Clear first-move warning on any move
        if (firstMoveTimerRef.current) {
          clearInterval(firstMoveTimerRef.current);
          firstMoveTimerRef.current = null;
        }
        setFirstMoveWarning({ active: false, player: null, countdown: null });
        if (soundEnabled) {
          playMoveSound();
        }
        break;

      case ServerMessageType.ClockUpdate: {
        const adjustedLastMoveAt = calculateAdjustedLastMoveAt(message.serverTime, message.lastMoveAt);

        setGameState((prev) =>
          prev
            ? {
              ...prev,
              whiteTimeMs: message.white,
              blackTimeMs: message.black,
              turn: toChessColor(message.turn),
              lastMoveAt: adjustedLastMoveAt,
              serverTime: message.serverTime,
            }
            : null
        );
        break;
      }

      case ServerMessageType.GameOver:
        setMatchState(MatchState.Ended);
        setResult(convertResult(message.result.winner));
        setResultReason(message.result.reason);
        setEloChanges(message.result);
        setDrawOffered(false);
        setDrawOfferedByMe(false);
        if (soundEnabled) {
          if (message.result.reason === 'checkmate') {
            playCheckmateSound();
          } else {
            playGameEndSound();
          }
        }
        break;

      case ServerMessageType.DrawOffered: {
        setDrawOffered(true);
        // Determine if this is my offer or opponent's offer
        const isMyOffer =
          (playerColor === 'w' && message.by === 'white') ||
          (playerColor === 'b' && message.by === 'black');
        setDrawOfferedByMe(isMyOffer);
        drawOfferedByMeRef.current = isMyOffer;
        break;
      }

      case ServerMessageType.DrawDeclined:
        // Show notification if my draw offer was declined
        if (drawOfferedByMeRef.current && dict) {
          toast(dict.offerDeclined, { icon: '🤝' });
        }
        setDrawOffered(false);
        setDrawOfferedByMe(false);
        drawOfferedByMeRef.current = false;
        break;

      case ServerMessageType.DrawClaimAvailable:
        setDrawClaimAvailable(message.reason === DrawClaimReason.FiftyMove ? DrawClaimType.FiftyMove : DrawClaimType.ThreefoldRepetition);
        const claimMsg =
          message.reason === DrawClaimReason.FiftyMove
            ? '50-move rule reached - you can claim a draw'
            : 'Threefold repetition - you can claim a draw';
        toast(claimMsg, { duration: 5000 });
        break;

      case ServerMessageType.OpponentDisconnected:
        setOpponentDisconnected(true);
        const reconnectTimeoutSec = Math.floor((message.timeoutMs || RECONNECT_TIMEOUT_MS) / 1000);
        setDisconnectCountdown(reconnectTimeoutSec);
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
        }
        disconnectTimerRef.current = setInterval(() => {
          setDisconnectCountdown((prev) => {
            if (prev === null || prev <= 1) {
              if (disconnectTimerRef.current) {
                clearInterval(disconnectTimerRef.current);
                disconnectTimerRef.current = null;
              }
              return null;
            }
            return prev - 1;
          });
        }, 1000);
        break;

      case ServerMessageType.OpponentReconnected:
        setOpponentDisconnected(false);
        setDisconnectCountdown(null);
        if (disconnectTimerRef.current) {
          clearInterval(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
        }
        toast.success('Opponent reconnected');
        break;

      case ServerMessageType.RematchOffered:
        // If offered by opponent
        if ((playerColor === 'w' && message.by === 'black') || (playerColor === 'b' && message.by === 'white')) {
          // If we already requested, auto-accept (mutual rematch)
          if (rematchState === RematchState.Requested) {
            setRematchState(RematchState.Accepted);
            sendMessage({ type: ClientMessageType.AcceptRematch } as ClientMessage);
            toast.success('Mutual rematch - starting game!');
          } else {
            // Only show UI if we didn't already request
            setRematchState(RematchState.Received);
            toast('Opponent wants a rematch!');
          }
        }
        break;

      case ServerMessageType.RematchStarting: {
        const newColor = toChessColor(message.yourColor);

        setRematchState(RematchState.Accepted);
        setResult(null);
        setResultReason(null);
        setEloChanges(null);
        setDrawOffered(false);
        setDrawOfferedByMe(false);
        setGameId(message.gameId);
        setPlayerColor(newColor);
        setMatchState(MatchState.Playing);

        // Update the persistent store with new game data (colors swap on rematch)
        if (opponent && tournamentType) {
          setCurrentGame(message.gameId, message.yourColor, opponent, tournamentType);
        }

        toast.success('Rematch starting!');
        if (soundEnabled) {
          playGameStartSound();
        }

        // CRITICAL: Reconnect WebSocket with new game ID and new color
        // The URL contains color param that server uses to identify player
        const newGameUrl = getGameUrl(message.gameId, message.yourColor);
        if (newGameUrl) {
          setWsUrl(newGameUrl);
        }
        break;
      }

      case ServerMessageType.RematchDeclined:
        setRematchState(RematchState.Idle);
        toast.error('Rematch declined');
        break;

      case ServerMessageType.LowTimeWarning:
        // Could show a warning to the user
        break;

      case ServerMessageType.FiftyMoveWarning:
        // Could show a warning to the user
        break;

      case ServerMessageType.FirstMoveWarning:
        // Start countdown timer for first-move warning
        const remainingSec = Math.ceil(message.remainingMs / 1000);
        setFirstMoveWarning({
          active: true,
          player: message.player,
          countdown: remainingSec,
        });

        // Clear any existing timer
        if (firstMoveTimerRef.current) {
          clearInterval(firstMoveTimerRef.current);
        }

        // Start countdown
        firstMoveTimerRef.current = setInterval(() => {
          setFirstMoveWarning((prev) => {
            if (!prev.active || prev.countdown === null || prev.countdown <= 1) {
              if (firstMoveTimerRef.current) {
                clearInterval(firstMoveTimerRef.current);
                firstMoveTimerRef.current = null;
              }
              return { active: false, player: null, countdown: null };
            }
            return { ...prev, countdown: prev.countdown - 1 };
          });
        }, 1000);
        break;

      case ServerMessageType.Error: {
        console.error('Multiplayer error:', message.message, message.code);
        const errorMsg = ERROR_MESSAGES[message.code] || message.message || 'An error occurred';
        toast.error(errorMsg);
        // Reset draw state on draw-related errors (e.g., cooldown)
        if (message.code === 'DRAW_OFFER_COOLDOWN') {
          setDrawOfferedByMe(false);
          setDrawOffered(false);
        }
        break;
      }

      case ServerMessageType.Pong:
        // Keep-alive response, no action needed
        break;
    }
  });

  // WebSocket connection
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const connectionErrorCountRef = useRef(0);
  const pendingJoinQueueRef = useRef<TournamentType | null>(null);

  // Handle queue errors - use useEffectEvent to always access latest state
  const handleQueueError = useEffectEvent(() => {
    // On error during queue, increment error count
    if (matchState === MatchState.Queued) {
      connectionErrorCountRef.current++;
      console.log(`[Multiplayer] Queue error #${connectionErrorCountRef.current}`);
      if (connectionErrorCountRef.current >= 2 && joinQueueTournamentRef.current) {
        // Clear queue timeout to prevent double-triggering
        if (queueTimeoutRef.current) {
          clearTimeout(queueTimeoutRef.current);
          queueTimeoutRef.current = null;
        }
        console.log('[Multiplayer] WebSocket connection failed, falling back to bot');
        createLocalBotMatch(joinQueueTournamentRef.current);
        setWsUrl(null);
      }
    }
  });

  // Handle WebSocket open - use useEffectEvent to always access latest state
  const handleWsOpen = useEffectEvent(() => {
    // If we have a pending join_queue request, send it now
    if (pendingJoinQueueRef.current) {
      sendMessage({ type: ClientMessageType.JoinQueue, tournamentType: pendingJoinQueueRef.current });
      pendingJoinQueueRef.current = null;
    }
    // CRITICAL FIX: If we reconnect while queued, we MUST re-send JoinQueue
    // because the backend treats a new WebSocket connection as a new session (not in queue)
    // unless we explicitly tell it to put us back in.
    else if (matchState === MatchState.Queued && joinQueueTournamentRef.current) {
      console.log('[Multiplayer] Reconnected while queued, re-sending JoinQueue');
      sendMessage({ type: ClientMessageType.JoinQueue, tournamentType: joinQueueTournamentRef.current });
    }
  });

  // Handle WebSocket close - use useEffectEvent to always access latest state
  const handleWsClose = useEffectEvent(() => {
    // If we got matched and need to switch to game room
    if (pendingGameConnectionRef.current && !isBotGameRef.current) {
      const { gameId: gId, color } = pendingGameConnectionRef.current;
      const gameUrl = getGameUrl(gId, color);
      if (gameUrl) {
        setWsUrl(gameUrl);
      }
      pendingGameConnectionRef.current = null;
    }
  });

  const { status: connectionStatus, sendMessage, disconnect } = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    onOpen: handleWsOpen,
    onClose: handleWsClose,
    onError: handleQueueError,
    reconnect: matchState === MatchState.Playing || matchState === MatchState.Queued || matchState === MatchState.Ended,
  });

  // Computed values
  const isMyTurn = Boolean(gameState && matchState === MatchState.Playing && playerColor && gameState.turn === playerColor);

  // Can abort only if no moves have been made
  const canAbort = Boolean(
    matchState === MatchState.Playing && gameState && gameState.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );

  // Initialize Chess.js instance for bot games
  useEffect(() => {
    if (isBotGameRef.current && gameState && !botChessRef.current) {
      botChessRef.current = new Chess(gameState.fen);
      console.log('[Bot] Chess instance initialized');
    }
  }, [gameState?.id]);

  // Track if we've triggered the bot's first move
  const botFirstMoveTriggeredRef = useRef(false);

  // Trigger bot's first move when Stockfish is ready (if bot plays first)
  useEffect(() => {
    if (
      isBotGameRef.current &&
      botChessRef.current &&
      isStockfishReady &&
      playerColor === 'b' &&
      gameState?.turn === 'w' &&
      !botFirstMoveTriggeredRef.current
    ) {
      botFirstMoveTriggeredRef.current = true;
      console.log('[Bot] Bot plays first, triggering move');
      setTimeout(() => {
        if (botChessRef.current) {
          findBestMove(botChessRef.current.fen());
        }
      }, 500);
    }
  }, [isStockfishReady, playerColor, gameState?.turn, findBestMove]);

  // Bot game clock timeout check
  useEffect(() => {
    if (!isBotGameRef.current || matchState !== MatchState.Playing || !gameState) return;

    const checkTimeout = () => {
      if (!gameState) return;

      const elapsed = Date.now() - gameState.lastMoveAt;
      const currentPlayerTime = gameState.turn === 'w' ? gameState.whiteTimeMs : gameState.blackTimeMs;
      const remainingTime = currentPlayerTime - elapsed;

      if (remainingTime <= 0) {
        const timedOutPlayer = gameState.turn;
        const playerWon = timedOutPlayer !== playerColor;

        setMatchState(MatchState.Ended);
        setResult(playerWon ? (playerColor === 'w' ? '1-0' : '0-1') : playerColor === 'w' ? '0-1' : '1-0');
        setResultReason('timeout');
        if (soundEnabled) playGameEndSound();
      }
    };

    const interval = setInterval(checkTimeout, 100);
    return () => clearInterval(interval);
  }, [gameState, matchState, playerColor, soundEnabled, playGameEndSound]);

  // Create a local bot match (fallback for when backend is unavailable)
  const createLocalBotMatch = useCallback(
    (tournament: TournamentType) => {
      const botNames = ['ChessBot', 'Stockfish Jr', 'BlitzMaster', 'KnightRider', 'QueenSlayer'];
      const botName = botNames[Math.floor(Math.random() * botNames.length)];
      const color: ChessColor = Math.random() > 0.5 ? 'w' : 'b';
      const gId = `bot-${Date.now()}`;

      const botOpponent: PlayerInfo = {
        id: 'bot-stockfish',
        displayName: botName,
        elo: 1500,
        isBot: true,
      };

      // Briefly show queued state, then matched
      setMatchState(MatchState.Queued);
      setTournamentType(tournament);
      setQueuePosition(1);

      setTimeout(() => {
        // Set matched state - TournamentLobby will handle navigation
        // Don't set Playing here - that happens in joinGame after navigation
        setMatchState(MatchState.Matched);
        setGameId(gId);
        setPlayerColor(color);
        setOpponent(botOpponent);
        isBotGameRef.current = true;
        setIsBotGame(true); // Trigger Stockfish lazy load

        // Store game data for navigation (joinGame will read this)
        setCurrentGame(gId, color === 'w' ? 'white' : 'black', botOpponent, tournament);

        if (soundEnabled) {
          playGameStartSound();
        }
      }, 1500);
    },
    [soundEnabled, playGameStartSound, setCurrentGame]
  );

  // Track tournament type for fallback
  const joinQueueTournamentRef = useRef<TournamentType | null>(null);
  const queueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actions
  const joinQueue = useCallback(
    (tournament: TournamentType) => {
      if (!token) {
        toast.error('Session not initialized. Please refresh the page.');
        return;
      }

      setMatchState(MatchState.Queued);
      setTournamentType(tournament);
      joinQueueTournamentRef.current = tournament;
      connectionErrorCountRef.current = 0;

      // Store the tournament type so we can send join_queue after connection
      pendingJoinQueueRef.current = tournament;

      // Start 7-second timeout for bot fallback
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
      queueTimeoutRef.current = setTimeout(() => {
        // Only trigger fallback if still in queue
        if (joinQueueTournamentRef.current) {
          console.log('[Multiplayer] Queue timeout (7s), falling back to bot');
          createLocalBotMatch(joinQueueTournamentRef.current);
          setWsUrl(null);
        }
      }, 7000);

      const url = getMatchmakingUrl(tournament);
      if (url) {
        setWsUrl(url);
      }
    },
    [token, getMatchmakingUrl, createLocalBotMatch]
  );

  // Join an existing game directly (for navigation from matchmaking)
  const joinGame = useCallback(
    (gId: string) => {
      if (!token) {
        toast.error('Session not initialized. Please refresh the page.');
        return;
      }

      // Get game data from store (set during matchmaking)
      const { playerColor: storedColor, opponent: storedOpponent, tournamentType: storedTournament } = currentGame;

      if (!storedColor || !storedOpponent || gId !== currentGame.gameId) {
        toast.error('Game session expired. Please start a new game.');
        return;
      }

      // Set local state from store
      setGameId(gId);
      setPlayerColor(toChessColor(storedColor));
      setOpponent(storedOpponent);
      setTournamentType(storedTournament);
      setMatchState(MatchState.Playing);
      isBotGameRef.current = Boolean(storedOpponent.isBot);
      setIsBotGame(Boolean(storedOpponent.isBot)); // Trigger Stockfish lazy load for bot games

      // For bot games, initialize game state locally without WebSocket
      if (storedOpponent.isBot && storedTournament) {
        const initialState = createInitialBotGameState(gId, toChessColor(storedColor), storedOpponent, storedTournament);
        setGameState(initialState);
        console.log('[Bot] Game state initialized for bot game');
        return; // Don't connect to WebSocket for bot games
      }

      // Connect to game room WebSocket for real games
      const gameUrl = getGameUrl(gId, storedColor);
      if (gameUrl) {
        setWsUrl(gameUrl);
      }
    },
    [token, currentGame, getGameUrl]
  );

  const leaveQueue = useCallback(() => {
    // Clear queue timeout
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
    joinQueueTournamentRef.current = null;
    sendMessage({ type: ClientMessageType.LeaveQueue } as ClientMessage);
    disconnect();
    setMatchState(MatchState.Idle);
    setQueuePosition(null);
    setTournamentType(null);
    setWsUrl(null);
  }, [sendMessage, disconnect]);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!isMyTurn) return;

      if (isBotGameRef.current) {
        // Handle bot game locally
        if (!botChessRef.current || !gameState) return;

        try {
          const move = botChessRef.current.move({
            from,
            to,
            promotion: promotion || 'q',
          });

          if (!move) return;

          // Calculate elapsed time and update clocks
          const elapsed = Date.now() - gameState.lastMoveAt;
          const newWhiteTime = gameState.turn === 'w' ? Math.max(0, gameState.whiteTimeMs - elapsed) : gameState.whiteTimeMs;
          const newBlackTime = gameState.turn === 'b' ? Math.max(0, gameState.blackTimeMs - elapsed) : gameState.blackTimeMs;

          const newTurn = botChessRef.current.turn();
          const isCheckmate = botChessRef.current.isCheckmate();
          const isStalemate = botChessRef.current.isStalemate();
          const isDraw = botChessRef.current.isDraw();

          // Update game state
          setGameState((prev) =>
            prev
              ? {
                  ...prev,
                  fen: botChessRef.current!.fen(),
                  pgn: botChessRef.current!.pgn(),
                  turn: newTurn,
                  whiteTimeMs: newWhiteTime,
                  blackTimeMs: newBlackTime,
                  lastMoveAt: Date.now(),
                  serverTime: Date.now(),
                  lastMove: { from, to },
                  status: isCheckmate || isStalemate || isDraw ? 'finished' : 'active',
                }
              : null
          );

          if (soundEnabled) {
            playMoveSound();
          }

          // Check for game end
          if (isCheckmate) {
            // Player checkmated the bot
            setMatchState(MatchState.Ended);
            setResult(playerColor === 'w' ? '1-0' : '0-1'); // Player won
            setResultReason('checkmate');
            if (soundEnabled) playCheckmateSound();
          } else if (isStalemate || isDraw) {
            setMatchState(MatchState.Ended);
            setResult('1/2-1/2');
            setResultReason(isStalemate ? 'stalemate' : 'draw_agreement');
            if (soundEnabled) playGameEndSound();
          } else {
            // Trigger bot response after small delay
            setTimeout(() => {
              if (botChessRef.current && isStockfishReady) {
                findBestMove(botChessRef.current.fen());
              }
            }, 200);
          }
        } catch (error) {
          console.error('[Bot] Invalid move:', error);
        }
      } else {
        sendMessage({
          type: ClientMessageType.Move,
          from,
          to,
          promotion: promotion || undefined,
        } as ClientMessage);
      }
    },
    [isMyTurn, gameState, playerColor, soundEnabled, playMoveSound, playCheckmateSound, playGameEndSound, sendMessage, isStockfishReady, findBestMove]
  );

  const resign = useCallback(() => {
    if (isBotGameRef.current) {
      setMatchState(MatchState.Ended);
      setResult(playerColor === 'w' ? '0-1' : '1-0');
      setResultReason('resignation');
      if (soundEnabled) {
        playGameEndSound();
      }
    } else {
      sendMessage({ type: ClientMessageType.Resign } as ClientMessage);
    }
  }, [sendMessage, playerColor, soundEnabled, playGameEndSound]);

  const offerDraw = useCallback(() => {
    if (isBotGameRef.current) return;
    // Don't set state optimistically - wait for server confirmation via DrawOffered message
    sendMessage({ type: ClientMessageType.OfferDraw } as ClientMessage);
  }, [sendMessage]);

  const acceptDraw = useCallback(() => {
    if (!drawOffered || drawOfferedByMe) return;
    sendMessage({ type: ClientMessageType.AcceptDraw } as ClientMessage);
  }, [sendMessage, drawOffered, drawOfferedByMe]);

  const declineDraw = useCallback(() => {
    if (!drawOffered || drawOfferedByMe) return;
    sendMessage({ type: ClientMessageType.DeclineDraw } as ClientMessage);
    setDrawOffered(false);
  }, [sendMessage, drawOffered, drawOfferedByMe]);

  const abortGame = useCallback(() => {
    if (!canAbort) return;
    sendMessage({ type: ClientMessageType.Abort } as ClientMessage);
  }, [sendMessage, canAbort]);

  const claimDraw = useCallback(
    (reason: 'fifty_move' | 'threefold_repetition') => {
      if (drawClaimAvailable !== reason) return;
      const drawReason = reason === 'fifty_move' ? DrawClaimReason.FiftyMove : DrawClaimReason.ThreefoldRepetition;
      sendMessage({ type: ClientMessageType.ClaimDraw, reason: drawReason } as ClientMessage);
      setDrawClaimAvailable(DrawClaimType.None);
    },
    [sendMessage, drawClaimAvailable]
  );

  // Rematch actions
  const requestRematch = useCallback(() => {
    if (matchState !== MatchState.Ended) return;
    if (isBotGameRef.current) {
      toast('Start a new game to play again');
      return;
    }
    setRematchState(RematchState.Requested);
    sendMessage({ type: ClientMessageType.OfferRematch } as ClientMessage);
    toast('Rematch request sent!');
  }, [matchState, sendMessage]);

  const acceptRematch = useCallback(() => {
    if (rematchState !== RematchState.Received) return;
    setRematchState(RematchState.Accepted);
    sendMessage({ type: ClientMessageType.AcceptRematch } as ClientMessage);
  }, [rematchState, sendMessage]);

  const declineRematch = useCallback(() => {
    if (rematchState !== RematchState.Received) return;
    sendMessage({ type: ClientMessageType.DeclineRematch } as ClientMessage);
    setRematchState(RematchState.Idle);
    // Note: Don't disconnect here - let the message reach the backend first
  }, [rematchState, sendMessage]);

  const reset = useCallback(() => {
    // Clean up bot game state
    stopStockfish();
    botChessRef.current = null;
    botFirstMoveTriggeredRef.current = false;
    setIsBotGame(false);

    // Clear queue timeout
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
    joinQueueTournamentRef.current = null;

    disconnect();
    clearCurrentGame();
    setMatchState(MatchState.Idle);
    setQueuePosition(null);
    setTournamentType(null);
    setGameId(null);
    setPlayerColor(null);
    setOpponent(null);
    setGameState(null);
    setResult(null);
    setResultReason(null);
    setEloChanges(null);
    setDrawOffered(false);
    setDrawOfferedByMe(false);
    setOpponentDisconnected(false);
    setDisconnectCountdown(null);
    setDrawClaimAvailable(DrawClaimType.None);
    setRematchState(RematchState.Idle);
    setFirstMoveWarning({ active: false, player: null, countdown: null });
    setWsUrl(null);
    pendingGameConnectionRef.current = null;
    isBotGameRef.current = false;
    if (disconnectTimerRef.current) {
      clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    if (firstMoveTimerRef.current) {
      clearInterval(firstMoveTimerRef.current);
      firstMoveTimerRef.current = null;
    }
  }, [disconnect, clearCurrentGame, stopStockfish]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
      }
      if (firstMoveTimerRef.current) {
        clearInterval(firstMoveTimerRef.current);
      }
    };
  }, [disconnect]);

  return {
    connectionStatus,
    matchState,
    queuePosition,
    tournamentType,
    gameId,
    playerColor,
    opponent,
    gameState,
    isMyTurn,
    result,
    resultReason,
    eloChanges,
    drawOffered,
    drawOfferedByMe,
    drawClaimAvailable,
    opponentDisconnected,
    disconnectCountdown,
    canAbort,
    rematchState,
    firstMoveWarning,
    joinQueue,
    joinGame,
    leaveQueue,
    makeMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    abortGame,
    claimDraw,
    requestRematch,
    acceptRematch,
    declineRematch,
    reset,
  };
}
