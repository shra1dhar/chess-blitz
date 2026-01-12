// ==============================================
// Chess Blitz - Tournament Lobby Component
// ==============================================

'use client';

import { useCallback, useEffect, useRef, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useMultiplayerStore } from '@/stores/multiplayerStore';
import { useMultiplayer, MatchState } from '@/hooks/useMultiplayer';
import { MatchmakingOverlay } from './MatchmakingOverlay';
import { BackArrowIcon } from '@/components/icons/GameIcons';
import type { TournamentType } from '@/types/multiplayer';
import { TOURNAMENT_TIME_MS } from '@/types/multiplayer';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './TournamentLobby.module.scss';

// Icons
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2" />
  </svg>
);

const RocketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const FlameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const PlayIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const TOURNAMENTS: { type: TournamentType; icon: React.ReactNode; labelKey: 'bullet' | 'blitz' | 'rapid' | 'classical'; descKey: 'bulletDesc' | 'blitzDesc' | 'rapidDesc' | 'classicalDesc' }[] = [
  {
    type: 'bullet',
    icon: <RocketIcon />,
    labelKey: 'bullet',
    descKey: 'bulletDesc',
  },
  {
    type: 'blitz',
    icon: <BoltIcon />,
    labelKey: 'blitz',
    descKey: 'blitzDesc',
  },
  {
    type: 'rapid',
    icon: <FlameIcon />,
    labelKey: 'rapid',
    descKey: 'rapidDesc',
  },
  {
    type: 'classical',
    icon: <ClockIcon />,
    labelKey: 'classical',
    descKey: 'classicalDesc',
  },
];

interface TournamentLobbyProps {
  dictPromise: Promise<Dictionary>;
  onGameStart?: (gameId: string) => void;
}

export function TournamentLobby({ dictPromise, onGameStart }: TournamentLobbyProps) {
  // Use React 19's use() hook to unwrap the promise - this enables streaming
  const dict = use(dictPromise);

  const router = useRouter();
  const params = useParams();
  const locale = (params.lang as string) || 'en';
  const t = dict.tournament;

  // Player state - use separate selectors to avoid re-render on unrelated state changes
  const playerId = useMultiplayerStore((state) => state.playerId);
  const isAuthenticated = useMultiplayerStore((state) => state.isAuthenticated);
  const lastTournamentType = useMultiplayerStore((state) => state.lastTournamentType);
  const sessionError = useMultiplayerStore((state) => state.sessionError);
  const isInitializing = useMultiplayerStore((state) => state.isInitializing);
  const initializeSession = useMultiplayerStore((state) => state.initializeSession);
  const setLastTournamentType = useMultiplayerStore((state) => state.setLastTournamentType);
  const clearSessionError = useMultiplayerStore((state) => state.clearSessionError);

  // Track if we've already attempted initialization
  const hasInitializedRef = useRef(false);

  // Initialize session on mount (only once)
  useEffect(() => {
    if (!hasInitializedRef.current && !isAuthenticated && !playerId && !isInitializing) {
      hasInitializedRef.current = true;
      initializeSession();
    }
  }, [isAuthenticated, playerId, isInitializing, initializeSession]);

  // Track if we've shown the error toast
  const shownErrorRef = useRef<string | null>(null);

  // Show error toast when session initialization fails (only once per error)
  useEffect(() => {
    if (sessionError && sessionError !== shownErrorRef.current) {
      shownErrorRef.current = sessionError;
      toast.error(sessionError);
      // Clear the error after showing toast to prevent repeated toasts
      clearSessionError?.();
    }
  }, [sessionError, clearSessionError]);

  // Multiplayer state
  const {
    matchState,
    queuePosition,
    tournamentType: currentTournament,
    gameId,
    opponent,
    playerColor,
    joinQueue,
    leaveQueue,
  } = useMultiplayer();

  // Track if navigation is pending
  const navigationPendingRef = useRef(false);

  // Handle game start - wait for overlay fade-out animation
  useEffect(() => {
    if (matchState === MatchState.Matched && gameId && !navigationPendingRef.current) {
      navigationPendingRef.current = true;

      // Wait for overlay fade-out animation (1500ms show + 500ms fade)
      const timer = setTimeout(() => {
        if (onGameStart) {
          onGameStart(gameId);
        } else {
          // Navigate to multiplayer game (handles both human and bot opponents)
          router.push(`/${locale}/play/${gameId}`);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [matchState, gameId, onGameStart, router, locale]);

  // Handle tournament selection
  const handleSelectTournament = useCallback((type: TournamentType) => {
    if (matchState === MatchState.Queued && currentTournament === type) {
      // Already in this queue - leave it
      leaveQueue();
    } else {
      // Join new queue
      setLastTournamentType(type);
      joinQueue(type);
    }
  }, [matchState, currentTournament, joinQueue, leaveQueue, setLastTournamentType]);

  // Format time
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    return `${minutes} ${t.min}`;
  };

  // Is queued for a specific tournament
  const isQueuedFor = (type: TournamentType) =>
    matchState === MatchState.Queued && currentTournament === type;

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push(`/${locale}`);
  }, [router, locale]);

  return (
    <div className={styles.lobby}>
      <button className={styles.backButton} onClick={handleBack}>
        <BackArrowIcon size={20} />
        <span>{t.back}</span>
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
      </div>

      <div className={styles.tournaments}>
        {TOURNAMENTS.map(({ type, icon, labelKey, descKey }) => (
          <button
            key={type}
            className={`${styles.tournamentCard} ${isQueuedFor(type) ? styles.queued : ''} ${isInitializing ? styles.initializing : ''}`}
            onClick={() => handleSelectTournament(type)}
            disabled={matchState === MatchState.Matched || isInitializing}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>{icon}</span>
              <span className={styles.cardLabel}>{t[labelKey]}</span>
            </div>

            <div className={styles.cardTime}>
              {formatTime(TOURNAMENT_TIME_MS[type])}
            </div>

            <p className={styles.cardDescription}>{t[descKey]}</p>

            {isQueuedFor(type) ? (
              <div className={styles.queueStatus}>
                <div className={styles.queueSpinner} />
                <span>{t.findingOpponent}</span>
                {queuePosition && queuePosition > 1 && (
                  <span className={styles.queuePosition}>
                    {t.position}: {queuePosition}
                  </span>
                )}
              </div>
            ) : (
              <div className={styles.playButton}>
                <PlayIcon />
                <span>{t.play}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {matchState === MatchState.Queued && (
        <button className={styles.cancelButton} onClick={leaveQueue}>
          <XIcon />
          <span>{t.cancelSearch}</span>
        </button>
      )}

      {matchState === MatchState.Matched && (
        <div className={styles.matchFound}>
          <div className={styles.matchFoundIcon}>
            <PlayIcon />
          </div>
          <span>{t.matchFound}</span>
        </div>
      )}

      {/* Matchmaking overlay - shown when queued or matched */}
      {(matchState === MatchState.Queued || matchState === MatchState.Matched) && (
        <MatchmakingOverlay
          matchState={matchState}
          queuePosition={queuePosition}
          opponent={opponent}
          playerColor={playerColor}
          onCancel={leaveQueue}
          dict={dict}
        />
      )}
    </div>
  );
}

export default TournamentLobby;
