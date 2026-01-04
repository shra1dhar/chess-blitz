// ==============================================
// Chess Blitz - Hero Section (Server Component)
// Static hero content rendered on the server
// ==============================================

import type { Dictionary } from '@/i18n/dictionaries';
import styles from '@/app/page.module.scss';

interface HeroSectionProps {
  dict: Dictionary;
}

export function HeroSection({ dict }: HeroSectionProps) {
  return (
    <header id="hero-section" className={`${styles.hero} ${styles.heroVisible}`}>
      <div className={styles.logoWrapper}>
        <div className={styles.logoIcon}>
          {/* Queen piece SVG */}
          <svg viewBox="0 0 45 45" width="56" height="56">
            <g fill="none" fillRule="evenodd" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="12" r="2.75" fill="currentColor" />
              <circle cx="14" cy="9" r="2.75" fill="currentColor" />
              <circle cx="22.5" cy="8" r="2.75" fill="currentColor" />
              <circle cx="31" cy="9" r="2.75" fill="currentColor" />
              <circle cx="39" cy="12" r="2.75" fill="currentColor" />
              <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" fill="currentColor" strokeLinecap="butt" />
              <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="currentColor" />
              <path d="M11.5 30c3.5-1 18.5-1 22 0" fill="none" />
              <path d="M12 33.5c6-1 15-1 21 0" fill="none" />
            </g>
          </svg>
        </div>
        <h1 className={styles.title}>{dict.home.title}</h1>
      </div>
      <p className={styles.tagline}>{dict.home.tagline}</p>
    </header>
  );
}
