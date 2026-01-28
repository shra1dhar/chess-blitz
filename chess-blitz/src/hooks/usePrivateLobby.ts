'use client';

import { useState, useCallback, useEffect, useEffectEvent, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { getIntegrationService } from '@/services/integration';
import { IntegrationType } from '@/types/integration';
import { ClientMessageType, ServerMessageType } from '@chess-blitz/shared';
import type { TournamentType } from '@chess-blitz/shared';
import type { WebSocketStatus } from '@/types/multiplayer';

export type PrivateLobbyStatus = 'idle' | 'creating' | 'waiting' | 'ready' | 'starting';

interface LobbyPlayerInfo {
  id: string;
  displayName: string;
  elo: number;
  /** CrazyGames platform username (if available) */
  platformUsername?: string;
  /** CrazyGames platform avatar URL (if available) */
  platformAvatarUrl?: string;
}

interface LobbyStateInfo {
  lobbyId: string;
  host: LobbyPlayerInfo;
  guest: LobbyPlayerInfo | null;
  tournamentType: TournamentType;
  status: 'waiting' | 'ready' | 'starting';
  createdAt: number;
}

interface ServerMessage {
  type: ServerMessageType;
  [key: string]: unknown;
}

interface UsePrivateLobbyReturn {
  status: PrivateLobbyStatus;
  lobbyId: string | null;
  isHost: boolean;
  /** Host player info (for guests to see) */
  host: LobbyPlayerInfo | null;
  /** Guest player info (for host to see) */
  guest: LobbyPlayerInfo | null;
  tournamentType: TournamentType;
  inviteLink: string | null;
  connectionStatus: WebSocketStatus;
  createLobby: (type?: TournamentType) => void;
  joinLobby: (lobbyId: string) => void;
  setTournamentType: (type: TournamentType) => void;
  startGame: () => void;
  leaveLobby: () => void;
}

export function usePrivateLobby(integrationType: IntegrationType): UsePrivateLobbyReturn {
  const token = useMultiplayerStore((s) => s.token);
  const [status, setStatus] = useState<PrivateLobbyStatus>('idle');
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [host, setHost] = useState<LobbyPlayerInfo | null>(null);
  const [guest, setGuest] = useState<LobbyPlayerInfo | null>(null);
  const [tournamentType, setTournamentTypeState] = useState<TournamentType>('blitz');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const sendMessageRef = useRef<((data: unknown) => void) | null>(null);
  // Cache platform user info to avoid re-fetching
  const platformUserRef = useRef<{ username: string; avatarUrl?: string } | null>(null);

  const integrationService = getIntegrationService(integrationType);

  // Show/hide invite button based on status
  useEffect(() => {
    if (!lobbyId) return;

    if (status === 'waiting' && integrationService.showInviteButton) {
      const link = integrationService.showInviteButton(lobbyId);
      setInviteLink(link);
      console.log('[PrivateLobby] Invite button shown');
    } else if ((status === 'ready' || status === 'starting' || status === 'idle') &&
               integrationService.hideInviteButton) {
      integrationService.hideInviteButton();
      setInviteLink(null);
      console.log('[PrivateLobby] Invite button hidden');
    }

    return () => {
      if (integrationService.hideInviteButton) {
        integrationService.hideInviteButton();
      }
    };
  }, [status, lobbyId, integrationService]);

  const handleMessage = useEffectEvent((data: unknown) => {
    const message = data as ServerMessage;

    switch (message.type) {
      case ServerMessageType.Connected:
        console.log('[PrivateLobby] Connected');
        setStatus('waiting');
        break;

      case ServerMessageType.LobbyState: {
        const lobbyState = (message as any).lobby as LobbyStateInfo;
        console.log('[PrivateLobby] Lobby state:', lobbyState);
        setHost(lobbyState.host);
        setGuest(lobbyState.guest);
        setTournamentTypeState(lobbyState.tournamentType);

        if (lobbyState.status === 'waiting') {
          setStatus('waiting');
        } else if (lobbyState.status === 'ready') {
          setStatus('ready');
        } else if (lobbyState.status === 'starting') {
          setStatus('starting');
        }
        break;
      }

      case ServerMessageType.LobbyPlayerJoined: {
        const player = (message as any).player as LobbyPlayerInfo;
        console.log('[PrivateLobby] Player joined:', player.displayName);
        setGuest(player);
        setStatus('ready');
        break;
      }

      case ServerMessageType.LobbyPlayerLeft:
        console.log('[PrivateLobby] Player left');
        setGuest(null);
        setStatus('waiting');
        break;

      case ServerMessageType.MatchFound: {
        const matchMessage = message as any as {
          gameId: string;
          opponent: { id: string; displayName: string; elo: number; isBot: boolean };
          color: 'white' | 'black';
        };
        console.log('[PrivateLobby] Match found, game ID:', matchMessage.gameId);
        setStatus('starting');

        // Store game data for navigation
        useMultiplayerStore.getState().setCurrentGame(
          matchMessage.gameId,
          matchMessage.color,
          matchMessage.opponent,
          tournamentType
        );

        // Mark as private lobby game for "Play Again with Friend" feature
        if (lobbyId) {
          useMultiplayerStore.getState().setPrivateLobbyGame(lobbyId);
        }

        // Navigate handled by parent component
        break;
      }

      case ServerMessageType.LobbyClosed: {
        const reason = (message as any).reason as string;
        console.log('[PrivateLobby] Lobby closed:', reason);
        setStatus('idle');
        setLobbyId(null);
        setHost(null);
        setGuest(null);
        break;
      }

      case ServerMessageType.Error: {
        const error = message as any as { code: string; message: string };
        console.error('[PrivateLobby] Error:', error.message);
        break;
      }
    }
  });

  const { status: connectionStatus, sendMessage, disconnect } = useWebSocket(wsUrl, {
    onMessage: handleMessage,
  });

  // Store sendMessage ref for use in other functions
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const createLobby = useCallback(async (type: TournamentType = 'blitz') => {
    const newLobbyId = crypto.randomUUID();
    setLobbyId(newLobbyId);
    setIsHost(true);
    setTournamentTypeState(type);
    setStatus('creating');

    // Fetch platform user info (CrazyGames username/avatar)
    if (!platformUserRef.current && integrationService.getUser) {
      try {
        platformUserRef.current = await integrationService.getUser();
      } catch (error) {
        console.warn('[PrivateLobby] Failed to get platform user:', error);
      }
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/^http/, 'ws');
    let url = `${backendUrl}/ws/lobby/${newLobbyId}?token=${token}&action=create&tournamentType=${type}`;

    // Add platform user info to URL if available
    if (platformUserRef.current?.username) {
      url += `&platformUsername=${encodeURIComponent(platformUserRef.current.username)}`;
    }
    if (platformUserRef.current?.avatarUrl) {
      url += `&platformAvatarUrl=${encodeURIComponent(platformUserRef.current.avatarUrl)}`;
    }

    setWsUrl(url);
    console.log('[PrivateLobby] Creating lobby:', newLobbyId);
  }, [token, integrationService]);

  const joinLobby = useCallback(async (id: string) => {
    setLobbyId(id);
    setIsHost(false);
    setStatus('creating');

    // Fetch platform user info (CrazyGames username/avatar)
    if (!platformUserRef.current && integrationService.getUser) {
      try {
        platformUserRef.current = await integrationService.getUser();
      } catch (error) {
        console.warn('[PrivateLobby] Failed to get platform user:', error);
      }
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/^http/, 'ws');
    let url = `${backendUrl}/ws/lobby/${id}?token=${token}&action=join`;

    // Add platform user info to URL if available
    if (platformUserRef.current?.username) {
      url += `&platformUsername=${encodeURIComponent(platformUserRef.current.username)}`;
    }
    if (platformUserRef.current?.avatarUrl) {
      url += `&platformAvatarUrl=${encodeURIComponent(platformUserRef.current.avatarUrl)}`;
    }

    setWsUrl(url);
    console.log('[PrivateLobby] Joining lobby:', id);
  }, [token, integrationService]);

  const setTournamentType = useCallback((type: TournamentType) => {
    setTournamentTypeState(type);
    if (isHost && sendMessageRef.current) {
      sendMessageRef.current({
        type: ClientMessageType.SetLobbyTournamentType,
        tournamentType: type,
      });
    }
  }, [isHost]);

  const startGame = useCallback(() => {
    if (isHost && sendMessageRef.current) {
      sendMessageRef.current({
        type: ClientMessageType.StartPrivateGame,
      });
    }
  }, [isHost]);

  const leaveLobby = useCallback(() => {
    if (sendMessageRef.current) {
      sendMessageRef.current({
        type: ClientMessageType.LeaveLobby,
      });
    }
    disconnect();
    setStatus('idle');
    setLobbyId(null);
    setHost(null);
    setGuest(null);
  }, [disconnect]);

  return {
    status,
    lobbyId,
    isHost,
    host,
    guest,
    tournamentType,
    inviteLink,
    connectionStatus,
    createLobby,
    joinLobby,
    setTournamentType,
    startGame,
    leaveLobby,
  };
}
