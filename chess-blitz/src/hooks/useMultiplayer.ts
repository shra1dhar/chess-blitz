// ==============================================
// Chess Blitz - Multiplayer Hook
// Orchestrates matchmaking and multiplayer gameplay
// ==============================================

import { useState, useCallback, useEffect, useRef, useEffectEvent } from 'react';
import type { Square, PieceSymbol, Color as ChessColor } from 'chess.js';
import { useWebSocket, type WebSocketStatus } from './useWebSocket';
import { useStockfish } from './useStockfish';
import { useSound } from './useSound';
import { useSettingsStore } from '@/stores/settingsStore';
import { useMultiplayerStore, selectToken } from '@/stores/multiplayerStore';
import { useShallow } from 'zustand/react/shallow';
import toast from 'react-hot-toast';
import {
  ClientMessageType,
  ServerMessageType,
  DrawClaimReason,
  type TournamentType,
  type MatchState,
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
  toChessColor,
} from '@/types/multiplayer';

// Draw claim types
export type DrawClaimType = 'none' | 'fifty_move' | 'threefold_repetition';

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

// Rematch state type
export type RematchState = 'idle' | 'requested' | 'received' | 'accepted';

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
  isThinking: boolean;

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
  const [matchState, setMatchState] = useState<MatchState>('idle');
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
  const [drawClaimAvailable, setDrawClaimAvailable] = useState<DrawClaimType>('none');
  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rematch state
  const [rematchState, setRematchState] = useState<RematchState>('idle');

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
  const drawOfferedByMeRef = useRef(false);

  // Settings
  const { soundEnabled } = useSettingsStore();
  const { playMoveSound, playCheckmateSound, playGameEndSound, playGameStartSound } = useSound();

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
        setMatchState('queued');
        setQueuePosition(message.position);
        setTournamentType(message.tournamentType);
        connectionErrorCountRef.current = 0;
        break;

      case ServerMessageType.QueuePosition:
        setQueuePosition(message.position);
        break;

      case ServerMessageType.QueueLeft:
        setMatchState('idle');
        setQueuePosition(null);
        break;

      case ServerMessageType.MatchFound:
        setMatchState('matched');
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
        setMatchState('playing');
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
        setMatchState('ended');
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
        setDrawClaimAvailable(message.reason === DrawClaimReason.FiftyMove ? 'fifty_move' : 'threefold_repetition');
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
          setRematchState('received');
          toast('Opponent wants a rematch!');
        }
        break;

      case ServerMessageType.RematchStarting:
        setRematchState('accepted');
        setResult(null);
        setResultReason(null);
        setEloChanges(null);
        setDrawOffered(false);
        setDrawOfferedByMe(false);
        setGameId(message.gameId);
        setPlayerColor(toChessColor(message.yourColor));
        setMatchState('playing');
        toast.success('Rematch starting!');
        if (soundEnabled) {
          playGameStartSound();
        }
        break;

      case ServerMessageType.RematchDeclined:
        setRematchState('idle');
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

  const { status: connectionStatus, sendMessage, disconnect } = useWebSocket(wsUrl, {
    onMessage: handleMessage,
    onOpen: () => {
      // If we have a pending join_queue request, send it now
      if (pendingJoinQueueRef.current) {
        sendMessage({ type: ClientMessageType.JoinQueue, tournamentType: pendingJoinQueueRef.current });
        pendingJoinQueueRef.current = null;
      }
      // CRITICAL FIX: If we reconnect while queued, we MUST re-send JoinQueue
      // because the backend treats a new WebSocket connection as a new session (not in queue)
      // unless we explicitly tell it to put us back in.
      else if (matchState === 'queued' && joinQueueTournamentRef.current) {
        console.log('[Multiplayer] Reconnected while queued, re-sending JoinQueue');
        sendMessage({ type: ClientMessageType.JoinQueue, tournamentType: joinQueueTournamentRef.current });
      }
    },
    onClose: () => {
      // If we got matched and need to switch to game room
      if (pendingGameConnectionRef.current && !isBotGameRef.current) {
        const { gameId: gId, color } = pendingGameConnectionRef.current;
        const gameUrl = getGameUrl(gId, color);
        if (gameUrl) {
          setWsUrl(gameUrl);
        }
        pendingGameConnectionRef.current = null;
      }
    },
    onError: () => {
      // On error during queue, increment error count
      if (matchState === 'queued') {
        connectionErrorCountRef.current++;
        if (connectionErrorCountRef.current >= 10 && joinQueueTournamentRef.current) {
          console.log('[Multiplayer] WebSocket connection failed, falling back to bot');
          createLocalBotMatch(joinQueueTournamentRef.current);
          setWsUrl(null);
        }
      }
    },
    reconnect: matchState === 'playing' || matchState === 'queued' || matchState === 'ended',
  });

  // Bot game handling with Stockfish
  const handleBotMove = useCallback(
    (uciMove: string) => {
      if (!gameState || matchState !== 'playing') return;

      // For bot games, update would be handled locally
      if (soundEnabled) {
        playMoveSound();
      }
    },
    [gameState, matchState, soundEnabled, playMoveSound]
  );

  // Stockfish for bot games
  const { isThinking, stop: stopStockfish } = useStockfish({
    difficulty: 'medium',
    onBestMove: handleBotMove,
    onError: (error) => console.error('Stockfish error:', error),
  });

  // Computed values
  const isMyTurn = Boolean(gameState && matchState === 'playing' && playerColor && gameState.turn === playerColor);

  // Can abort only if no moves have been made
  const canAbort = Boolean(
    matchState === 'playing' && gameState && gameState.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  );

  // Create a local bot match (fallback for when backend is unavailable)
  const createLocalBotMatch = useCallback(
    (tournament: TournamentType) => {
      const botNames = ['ChessBot', 'Stockfish Jr', 'BlitzMaster', 'KnightRider', 'QueenSlayer'];
      const botName = botNames[Math.floor(Math.random() * botNames.length)];
      const color: ChessColor = Math.random() > 0.5 ? 'w' : 'b';

      setMatchState('queued');
      setTournamentType(tournament);
      setQueuePosition(1);

      setTimeout(() => {
        setMatchState('matched');
        setGameId(`bot-${Date.now()}`);
        setPlayerColor(color);
        setOpponent({
          id: 'bot-stockfish',
          displayName: botName,
          elo: 1500,
          isBot: true,
        });
        isBotGameRef.current = true;

        if (soundEnabled) {
          playGameStartSound();
        }
      }, 1500);
    },
    [soundEnabled, playGameStartSound]
  );

  // Track tournament type for fallback
  const joinQueueTournamentRef = useRef<TournamentType | null>(null);

  // Actions
  const joinQueue = useCallback(
    (tournament: TournamentType) => {
      if (!token) {
        toast.error('Session not initialized. Please refresh the page.');
        return;
      }

      setMatchState('queued');
      setTournamentType(tournament);
      joinQueueTournamentRef.current = tournament;
      connectionErrorCountRef.current = 0;

      // Store the tournament type so we can send join_queue after connection
      pendingJoinQueueRef.current = tournament;

      const url = getMatchmakingUrl(tournament);
      if (url) {
        setWsUrl(url);
      }
    },
    [token, getMatchmakingUrl]
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
      setMatchState('playing');
      isBotGameRef.current = Boolean(storedOpponent.isBot);

      // Connect to game room WebSocket
      const gameUrl = getGameUrl(gId, storedColor);
      if (gameUrl) {
        setWsUrl(gameUrl);
      }
    },
    [token, currentGame, getGameUrl]
  );

  const leaveQueue = useCallback(() => {
    sendMessage({ type: ClientMessageType.LeaveQueue } as ClientMessage);
    disconnect();
    setMatchState('idle');
    setQueuePosition(null);
    setTournamentType(null);
    setWsUrl(null);
  }, [sendMessage, disconnect]);

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (!isMyTurn) return;

      if (isBotGameRef.current) {
        // TODO: Handle bot game locally
      } else {
        sendMessage({
          type: ClientMessageType.Move,
          from,
          to,
          promotion: promotion || undefined,
        } as ClientMessage);
      }
    },
    [isMyTurn, sendMessage]
  );

  const resign = useCallback(() => {
    if (isBotGameRef.current) {
      setMatchState('ended');
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
      setDrawClaimAvailable('none');
    },
    [sendMessage, drawClaimAvailable]
  );

  // Rematch actions
  const requestRematch = useCallback(() => {
    if (matchState !== 'ended') return;
    if (isBotGameRef.current) {
      toast('Start a new game to play again');
      return;
    }
    setRematchState('requested');
    sendMessage({ type: ClientMessageType.OfferRematch } as ClientMessage);
    toast('Rematch request sent!');
  }, [matchState, sendMessage]);

  const acceptRematch = useCallback(() => {
    if (rematchState !== 'received') return;
    setRematchState('accepted');
    sendMessage({ type: ClientMessageType.AcceptRematch } as ClientMessage);
  }, [rematchState, sendMessage]);

  const declineRematch = useCallback(() => {
    if (rematchState !== 'received') return;
    sendMessage({ type: ClientMessageType.DeclineRematch } as ClientMessage);
    setRematchState('idle');
    // Note: Don't disconnect here - let the message reach the backend first
  }, [rematchState, sendMessage]);

  const reset = useCallback(() => {
    disconnect();
    stopStockfish();
    clearCurrentGame();
    setMatchState('idle');
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
    setDrawClaimAvailable('none');
    setRematchState('idle');
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
  }, [disconnect, stopStockfish, clearCurrentGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      stopStockfish();
      if (disconnectTimerRef.current) {
        clearInterval(disconnectTimerRef.current);
      }
      if (firstMoveTimerRef.current) {
        clearInterval(firstMoveTimerRef.current);
      }
    };
  }, [disconnect, stopStockfish]);

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
    isThinking,
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
