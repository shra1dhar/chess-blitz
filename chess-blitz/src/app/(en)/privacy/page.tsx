// ==============================================
// Chess Blitz - Privacy Policy Page
// ==============================================

import type { Metadata } from 'next';
import styles from './privacy.module.scss';

export const metadata: Metadata = {
  title: 'Privacy Policy - Chess Blitz',
  description: 'Privacy Policy for Chess Blitz - Learn how we handle your data and protect your privacy.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.container}>
      <article className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last Updated: January 10, 2026</p>
        </header>

        <section className={styles.section}>
          <h2>Introduction</h2>
          <p>
            Welcome to Chess Blitz. We are committed to protecting your privacy and being transparent
            about how we handle data. This privacy policy explains what information we collect,
            how we use it, and your rights regarding your data.
          </p>
          <p>
            Chess Blitz is a free online chess game that allows you to play against AI opponents
            or other players online. We designed our service with privacy in mind, using anonymous
            guest sessions that require no registration or personal information.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Information We Collect</h2>

          <h3>Automatically Generated Data</h3>
          <p>When you use Chess Blitz, we automatically generate:</p>
          <ul>
            <li>
              <strong>Anonymous Session ID:</strong> A random identifier (UUID) that is not linked
              to your real identity. This allows us to maintain your game session.
            </li>
            <li>
              <strong>Display Name:</strong> An auto-generated name (e.g., &quot;Guest_abc123&quot;) used
              to identify you in multiplayer games. You do not provide this yourself.
            </li>
            <li>
              <strong>ELO Ratings:</strong> Skill ratings for each game mode (Bullet, Blitz, Rapid,
              Classical) that are calculated based on your game results.
            </li>
          </ul>

          <h3>Game Data</h3>
          <ul>
            <li>
              <strong>Game Statistics:</strong> Win/loss/draw records stored locally in your browser.
            </li>
            <li>
              <strong>Game Moves:</strong> During multiplayer games, your moves are transmitted to
              our game servers. We do not permanently store game history.
            </li>
          </ul>

          <h3>User Preferences</h3>
          <p>Settings you configure are stored locally in your browser:</p>
          <ul>
            <li>Board theme (Wood, Green, Blue, Midnight)</li>
            <li>Sound settings</li>
            <li>Animation speed</li>
            <li>Move confirmation preferences</li>
            <li>Language preference (stored as a cookie)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How We Store Your Data</h2>

          <h3>Browser Storage</h3>
          <p>We use your browser&apos;s local storage to save:</p>
          <ul>
            <li><code>chess-blitz-auth</code> - Your anonymous session token and ELO ratings</li>
            <li><code>chess-blitz-settings</code> - Your game preferences</li>
            <li><code>chess-blitz-multiplayer</code> - Temporary game reconnection data</li>
          </ul>

          <h3>Cookies</h3>
          <p>We use a single cookie:</p>
          <ul>
            <li><code>NEXT_LOCALE</code> - Stores your language preference</li>
          </ul>

          <h3>Session Duration</h3>
          <ul>
            <li>Session tokens expire after 7 days of inactivity</li>
            <li>Settings persist until you clear your browser data</li>
            <li>You can reset all data at any time by clearing your browser&apos;s local storage</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Third-Party Services</h2>

          <h3>MSN Start Games Platform</h3>
          <p>
            When Chess Blitz is accessed through the MSN Start Games platform, additional
            features may be available:
          </p>
          <ul>
            <li>
              <strong>Advertisements:</strong> Display ads, interstitial ads, and rewarded ads
              may be shown. Ad delivery is handled by the MSN platform.
            </li>
            <li>
              <strong>Leaderboards:</strong> Your scores may be submitted to platform leaderboards.
            </li>
            <li>
              <strong>Cloud Saves:</strong> Game state may be saved to the platform&apos;s cloud
              storage.
            </li>
            <li>
              <strong>Platform Data:</strong> The MSN platform may collect additional usage data
              according to their own privacy policy.
            </li>
          </ul>
          <p>
            When accessing Chess Blitz directly (not through MSN), these platform features are
            not active and no data is shared with MSN.
          </p>

          <h3>Game Backend Service</h3>
          <p>Our multiplayer functionality is powered by a backend service that:</p>
          <ul>
            <li>Handles matchmaking between players</li>
            <li>Transmits game moves in real-time via WebSocket connections</li>
            <li>Calculates and updates ELO ratings after games</li>
            <li>Does not permanently store game history or move records</li>
          </ul>

          <h3>Hosting Provider</h3>
          <p>
            Chess Blitz is hosted on Cloudflare, which may collect standard server logs for
            security and performance purposes. These logs may include IP addresses and are
            handled according to Cloudflare&apos;s privacy policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Information We Do NOT Collect</h2>
          <p>Chess Blitz does not collect:</p>
          <ul>
            <li>Real names or email addresses</li>
            <li>Payment or billing information</li>
            <li>Precise geolocation data</li>
            <li>Device identifiers or fingerprints</li>
            <li>Browsing history outside of our application</li>
            <li>Contact lists or social media data</li>
          </ul>
          <p>
            We do not use analytics services such as Google Analytics, and we do not track
            users across websites.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Children&apos;s Privacy</h2>
          <p>
            Chess Blitz is designed to be accessible to players of all ages. Because we use
            anonymous guest sessions and do not collect personal information, there is no
            special data collection from children. We do not knowingly collect personally
            identifiable information from anyone.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your data to third parties. Data may only be
            shared in the following limited circumstances:
          </p>
          <ul>
            <li>
              <strong>Multiplayer Games:</strong> Your anonymous display name and moves are
              shared with your opponent during games.
            </li>
            <li>
              <strong>MSN Platform:</strong> When accessed through MSN Start Games, data
              may be shared with Microsoft according to their policies.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose information if required
              by law or to protect our rights.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Your Rights and Choices</h2>
          <p>You have control over your data:</p>
          <ul>
            <li>
              <strong>Clear Data:</strong> Clear your browser&apos;s local storage to reset
              all Chess Blitz data, including your session and settings.
            </li>
            <li>
              <strong>Change Settings:</strong> Modify your preferences at any time through
              the settings menu.
            </li>
            <li>
              <strong>Cookies:</strong> Your browser settings allow you to manage or delete
              cookies.
            </li>
            <li>
              <strong>No Account:</strong> Since there are no user accounts, there is nothing
              to delete or deactivate.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Security</h2>
          <p>
            We take reasonable measures to protect data transmitted through our service.
            Connections to our game servers use secure WebSocket connections. However,
            because we primarily use client-side storage and anonymous sessions, the
            security of your data also depends on your browser and device security.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. When we make changes,
            we will update the &quot;Last Updated&quot; date at the top of this page. We encourage
            you to review this policy periodically.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact Us</h2>
          <p>
            If you have questions about this privacy policy or our data practices,
            please contact us at:
          </p>
          <p className={styles.contactEmail}>
            <a href="mailto:contact@zoony.io">contact@zoony.io</a>
          </p>
        </section>
      </article>
    </main>
  );
}
