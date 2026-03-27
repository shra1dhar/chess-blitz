// ==============================================
// Chess Blitz - Private Lobby Screen
// Premium full-screen lobby for "Play with Friends"
// Features: side-by-side player cards, VS divider, time control selector
// ==============================================

'use client';

import { Activity } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePrivateLobby } from '@/hooks/usePrivateLobby';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useActivityAnimation } from '@/hooks/useActivityAnimation';
import { LobbyPlayerCard } from './LobbyPlayerCard';
import { IntegrationType } from '@/types/integration';
import type { TournamentType } from '@chess-blitz/shared';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './PrivateLobbyScreen.module.scss';

interface PrivateLobbyScreenProps {
  integrationType: IntegrationType;
  initialTournamentType?: TournamentType;
  /** Room ID to join (from invite link) - if provided, joins existing lobby instead of creating */
  initialInviteRoomId?: string | null;
  onClose: () => void;
  dict: Dictionary;
  locale: string;
}

// Copy icon for invite link button
const CopyIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// Check icon for copied state
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function PrivateLobbyScreen({
  integrationType,
  initialTournamentType = 'blitz',
  initialInviteRoomId,
  onClose,
  dict,
  locale,
}: PrivateLobbyScreenProps) {
  const router = useRouter();
  const currentGameId = useMultiplayerStore((s) => s.currentGameId);
  const hasNavigatedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [copied, setCopied] = useState(false);

  const privateLobby = usePrivateLobby(integrationType);

  // Animation for overlay
  const { activityMode, hasBeenVisible } = useActivityAnimation({
    isVisible: true,
    animationDuration: 400,
  });

  // Auto-create or join lobby on mount (only once)
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (privateLobby.status !== 'idle') return;

    hasInitializedRef.current = true;

    if (initialInviteRoomId) {
      // Join existing lobby (guest clicking invite link)
      privateLobby.joinLobby(initialInviteRoomId);
    } else {
      // Create new lobby (host)
      privateLobby.createLobby(initialTournamentType);
    }
  }, [initialInviteRoomId, initialTournamentType, privateLobby]);

  // Navigate to game when match found
  useEffect(() => {
    if (currentGameId && privateLobby.status === 'starting' && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.push(`/${locale}/play/${currentGameId}`);
    }
  }, [currentGameId, privateLobby.status, router, locale]);

  // If navigating, show nothing
  if (hasNavigatedRef.current) {
    return null;
  }

  const handleClose = () => {
    privateLobby.leaveLobby();
    onClose();
  };

  const handleCopyLink = async () => {
    if (!privateLobby.inviteLink) return;

    try {
      await navigator.clipboard.writeText(privateLobby.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[PrivateLobby] Failed to copy link:', error);
    }
  };

  const tournamentTypes: TournamentType[] = ['bullet', 'blitz', 'rapid', 'classical'];
  const timeLabels: Record<TournamentType, string> = {
    bullet: '1 min',
    blitz: '3 min',
    rapid: '5 min',
    classical: '10 min',
  };

  // Don't render until first shown
  if (!hasBeenVisible) {
    return null;
  }

  // Determine the host and guest for display
  // If we're host: host is us (use lobby.host), guest is opponent
  // If we're guest: host is them (use lobby.host), guest is us
  const hostPlayer = privateLobby.host;
  const guestPlayer = privateLobby.guest;
  const isWaitingForGuest = privateLobby.status === 'waiting' && privateLobby.isHost;
  const isWaitingForHost = privateLobby.status === 'waiting' && !privateLobby.isHost;

  return (
    <Activity mode={activityMode}>
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>{dict.tournament.privateLobby}</h1>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label={dict.tournament.cancel || 'Close'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Status Message */}
          {privateLobby.status === 'starting' && (
            <div className={styles.statusBanner}>
              <span className={styles.statusText}>{dict.tournament.preparingGame}</span>
            </div>
          )}
          {privateLobby.status === 'ready' && (
            <div className={styles.statusBanner}>
              <span className={styles.statusText}>{dict.tournament.friendJoined}</span>
            </div>
          )}

          {/* Players Section */}
          <div className={styles.playersSection}>
            <LobbyPlayerCard
              player={hostPlayer}
              isHost={true}
              isWaiting={isWaitingForHost}
              dict={dict}
            />

            <div className={styles.vsContainer}>
              <span className={styles.vs}>{dict.tournament.vs || 'VS'}</span>
            </div>

            <LobbyPlayerCard
              player={guestPlayer}
              isHost={false}
              isWaiting={isWaitingForGuest}
              dict={dict}
            />
          </div>

          {/* Time Control Section */}
          <div className={styles.timeControlSection}>
            <label className={styles.sectionLabel}>
              {dict.tournament.selectTimeControl}
              {!privateLobby.isHost && (
                <span className={styles.lockedHint}>
                  ({dict.tournament.timeControlSetByHost || 'Set by host'})
                </span>
              )}
            </label>

            <div className={styles.timeControls}>
              {tournamentTypes.map((type) => (
                <button
                  key={type}
                  className={`${styles.timeControl} ${
                    privateLobby.tournamentType === type ? styles.active : ''
                  }`}
                  onClick={() => privateLobby.isHost && privateLobby.setTournamentType(type)}
                  disabled={!privateLobby.isHost || privateLobby.status === 'ready' || privateLobby.status === 'starting'}
                  aria-pressed={privateLobby.tournamentType === type}
                >
                  <span className={styles.timeControlName}>
                    {dict.tournament[type]}
                  </span>
                  <span className={styles.timeControlTime}>{timeLabels[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            {/* Start Game Button - Host only when ready */}
            {privateLobby.isHost && privateLobby.status === 'ready' && (
              <button
                className={styles.startButton}
                onClick={privateLobby.startGame}
              >
                {dict.tournament.startGame}
              </button>
            )}

            {/* Waiting for host message - Guest only */}
            {!privateLobby.isHost && privateLobby.status === 'ready' && (
              <div className={styles.waitingMessage}>
                {dict.tournament.waitingForHostToStart || 'Waiting for host to start...'}
              </div>
            )}

            {/* Copy Invite Link Button */}
            {privateLobby.inviteLink && (
              <button
                className={`${styles.copyButton} ${copied ? styles.copied : ''}`}
                onClick={handleCopyLink}
              >
                {copied ? (
                  <>
                    <CheckIcon className={styles.copyIcon} />
                    {dict.tournament.linkCopied || 'Copied!'}
                  </>
                ) : (
                  <>
                    <CopyIcon className={styles.copyIcon} />
                    {dict.tournament.copyInviteLink}
                  </>
                )}
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {(privateLobby.status === 'creating' || privateLobby.status === 'waiting') && (
            <div className={styles.loadingSection}>
              <div className={styles.spinner}>
                <div className={styles.spinnerDot} />
                <div className={styles.spinnerDot} />
                <div className={styles.spinnerDot} />
              </div>
              <span className={styles.loadingText}>
                {privateLobby.status === 'creating'
                  ? (dict.tournament.connectingToLobby || 'Connecting...')
                  : (dict.tournament.waitingForFriend)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Activity>
  );
}
