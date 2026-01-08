'use client';

import { useMemo } from 'react';
import styles from './Confetti.module.scss';

interface ConfettiProps {
  isActive: boolean;
  particleCount?: number;
}

const COLORS = ['#f4d03f', '#e67e22', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71'];

export function Confetti({ isActive, particleCount = 50 }: ConfettiProps) {
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 0.5}s`,
      animationDuration: `${2.5 + Math.random() * 1.5}s`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      size: 8 + Math.random() * 4,
    }));
  }, [particleCount]);

  if (!isActive) return null;

  return (
    <div className={styles.confettiContainer} aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={styles.confetti}
          style={{
            left: particle.left,
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            width: particle.size,
            height: particle.size * 0.6,
          }}
        />
      ))}
    </div>
  );
}
