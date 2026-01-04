// ==============================================
// Chess Blitz - Homepage (English - Root)
// ==============================================

import { Suspense } from 'react';
import { HeroSection, HomeInteractive } from '@/components/home';
import { getDictionary } from '@/i18n/dictionaries';
import styles from '../page.module.scss';

// Loading skeleton for interactive parts
function HomeLoading() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--color-text, #fff)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>♟</div>
        <div>Loading...</div>
      </div>
    </div>
  );
}

export default async function Home() {
  // Await for server rendering of hero section
  const dict = await getDictionary('en');

  return (
    <main className={styles.lobby}>
      {/* Background Pattern - static */}
      <div className={styles.bgPattern} aria-hidden="true" />

      {/* Hero Section - Server rendered */}
      <HeroSection dict={dict} />

      {/* Interactive Content - Client Component */}
      <Suspense fallback={<HomeLoading />}>
        <HomeInteractive dict={dict} />
      </Suspense>
    </main>
  );
}
