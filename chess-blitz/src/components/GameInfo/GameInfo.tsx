'use client';

import { useRef, useEffect } from 'react';
import type { Color } from 'chess.js';
import type { Dictionary } from '@/i18n/dictionaries';
import styles from './GameInfo.module.scss';

interface GameInfoProps {
  moves: Array<{ san: string; from: string; to: string }>;
  turn: Color;
  status: string;
  isCheck: boolean;
  dict: Dictionary;
}

export default function GameInfo({ moves, turn, status, isCheck, dict }: GameInfoProps) {
  const movesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest move
  useEffect(() => {
    if (movesEndRef.current) {
      movesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [moves.length]);

  // Group moves by pairs (white + black)
  const movePairs: Array<{
    number: number;
    white: string | null;
    black: string | null;
  }> = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i]?.san || null,
      black: moves[i + 1]?.san || null,
    });
  }

  const colorName = turn === 'w' ? dict.gameOptions.white : dict.gameOptions.black;

  return (
    <div className={styles.gameInfo}>
      {/* Status */}
      <div className={styles.status}>
        <span className={styles.statusLabel}>{dict.gameInfo.status}</span>
        <span className={styles.statusValue}>
          {status === 'playing' ? (
            <>
              {isCheck
                ? dict.gameInfo.check.replace('{color}', colorName)
                : dict.gameInfo.toMove.replace('{color}', colorName)}
            </>
          ) : status === 'checkmate' ? (
            dict.gameInfo.checkmate
          ) : status === 'stalemate' ? (
            dict.gameInfo.stalemate
          ) : status === 'draw' ? (
            dict.gameInfo.draw
          ) : status === 'resigned' ? (
            dict.gameInfo.resigned
          ) : (
            dict.gameInfo.waiting
          )}
        </span>
      </div>

      {/* Move history */}
      <div className={styles.movesSection}>
        <h3 className={styles.movesTitle}>{dict.gameInfo.moveHistory}</h3>
        <div className={styles.movesList}>
          {movePairs.length === 0 ? (
            <p className={styles.noMoves}>{dict.gameInfo.noMoves}</p>
          ) : (
            <>
              {movePairs.map((pair, index) => (
                <div
                  key={pair.number}
                  className={`${styles.moveRow} ${
                    index === movePairs.length - 1 ? styles.moveRowLatest : ''
                  }`}
                >
                  <span className={styles.moveNumber}>{pair.number}.</span>
                  <span className={styles.moveWhite}>{pair.white || ''}</span>
                  <span className={styles.moveBlack}>{pair.black || ''}</span>
                </div>
              ))}
              <div ref={movesEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
