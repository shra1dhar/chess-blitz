// ==============================================
// Chess Blitz - Private Lobby Wrapper
// Root-level component that shows private lobby overlay
// when invite link or instant multiplayer is detected
// ==============================================

'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Activity } from 'react';
import { useIntegrationStore } from '@/stores/integrationStore';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { PrivateLobbyScreen } from './PrivateLobbyScreen';
import { HumanIcon } from '@/components/icons/GameIcons';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './PrivateLobbyScreen.module.scss';

interface PrivateLobbyWrapperProps {
  locale: string;
  dictPromise: Promise<Dictionary>;
}

/**
 * Loading state component shown while auth initializes
 */
function LobbyLoadingState({ dict }: { dict: Dictionary }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{dict.tournament.privateLobby}</h1>
        </div>

        <div className={styles.playersSection}>
          <div className={`${styles.playerCard} ${styles.waiting}`}>
            <div className={styles.avatarContainer}>
              <div className={`${styles.avatar} ${styles.avatarPlaceholder}`}>
                <HumanIcon size={36} className={styles.avatarIcon} />
              </div>
              <div className={styles.pulseRing} />
            </div>
            <div className={styles.playerDetails}>
              <span className={styles.waitingText}>
                {dict.tournament.connectingToLobby || 'Connecting...'}
              </span>
            </div>
          </div>

          <div className={styles.vsContainer}>
            <span className={styles.vs}>{dict.tournament.vs || 'VS'}</span>
          </div>

          <div className={`${styles.playerCard} ${styles.waiting}`}>
            <div className={styles.avatarContainer}>
              <div className={`${styles.avatar} ${styles.avatarPlaceholder}`}>
                <HumanIcon size={36} className={styles.avatarIcon} />
              </div>
            </div>
            <div className={styles.playerDetails}>
              <span className={styles.waitingText}>
                {dict.tournament.waitingForPlayer || 'Waiting...'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.loadingSection}>
          <div className={styles.spinner}>
            <div className={styles.spinnerDot} />
            <div className={styles.spinnerDot} />
            <div className={styles.spinnerDot} />
          </div>
          <span className={styles.loadingText}>
            {dict.tournament.connectingToLobby || 'Connecting to lobby...'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Root-level wrapper that monitors integration store for private lobby triggers.
 * Shows the lobby overlay immediately when an invite link is detected or
 * when the user clicks "Play with Friends" in CrazyGames.
 */
export function PrivateLobbyWrapper({ locale, dictPromise }: PrivateLobbyWrapperProps) {
  // Use React 19's use() to unwrap the dictionary promise
  const dict = use(dictPromise);

  // Integration store state
  const integrationType = useIntegrationStore((s) => s.integrationType);
  const isInstantMultiplayer = useIntegrationStore((s) => s.isInstantMultiplayer);
  const inviteRoomId = useIntegrationStore((s) => s.inviteRoomId);
  const showPrivateLobby = useIntegrationStore((s) => s.showPrivateLobby);
  const clearMultiplayerState = useIntegrationStore((s) => s.clearMultiplayerState);
  const setShowPrivateLobby = useIntegrationStore((s) => s.setShowPrivateLobby);

  // Auth state
  const isAuthenticated = useMultiplayerStore((s) => s.isAuthenticated);
  const isInitializing = useMultiplayerStore((s) => s.isInitializing);

  // Local state for pending invite
  const [pendingInviteRoomId, setPendingInviteRoomId] = useState<string | null>(null);
  const hasHandledRef = useRef(false);

  // Detect when we should show the lobby
  useEffect(() => {
    // Already handled or nothing to show
    if (hasHandledRef.current) return;
    if (!isInstantMultiplayer && !inviteRoomId) return;

    // Capture the invite room ID before clearing
    if (inviteRoomId) {
      setPendingInviteRoomId(inviteRoomId);
    }

    // Show the lobby
    setShowPrivateLobby(true);
    hasHandledRef.current = true;

    // Clear the trigger state (so it doesn't re-trigger on navigation)
    // Note: We keep showPrivateLobby true until user closes it
    clearMultiplayerState();
  }, [isInstantMultiplayer, inviteRoomId, setShowPrivateLobby, clearMultiplayerState]);

  // Handle closing the lobby
  const handleClose = () => {
    setShowPrivateLobby(false);
    setPendingInviteRoomId(null);
    hasHandledRef.current = false;
  };

  // Nothing to show
  if (!showPrivateLobby) {
    return null;
  }

  // Show loading state while auth initializes
  if (isInitializing || !isAuthenticated) {
    return (
      <Activity mode="visible">
        <LobbyLoadingState dict={dict} />
      </Activity>
    );
  }

  // Show the lobby screen
  return (
    <Activity mode="visible">
      <PrivateLobbyScreen
        integrationType={integrationType}
        initialInviteRoomId={pendingInviteRoomId}
        onClose={handleClose}
        dict={dict}
        locale={locale}
      />
    </Activity>
  );
}
