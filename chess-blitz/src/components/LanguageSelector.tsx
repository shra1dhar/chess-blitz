'use client';

// ==============================================
// Chess Blitz - Language Selector
// Dropdown with country flags and cookie persistence
// ==============================================

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { locales, localeNames, localeCountries, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries';
import { useDropdown } from '@/hooks/useDropdown';
import { soundManager } from '@/services/soundManager';
import styles from './LanguageSelector.module.scss';

// Import flags from country-flag-icons
import * as Flags from 'country-flag-icons/react/3x2';

interface LanguageSelectorProps {
  dict: Dictionary;
}

export function LanguageSelector({ dict }: LanguageSelectorProps) {
  const { isOpen, isVisible, containerRef, toggle, close, handleAnimationEnd } = useDropdown();
  const [rememberPreference, setRememberPreference] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params.lang as Locale) || 'en';

  // Check if preference is already saved
  useEffect(() => {
    const savedLocale = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='));
    if (savedLocale) {
      setRememberPreference(true);
    }
  }, []);

  const handleToggle = () => {
    soundManager.playSync('move');
    toggle();
  };

  const handleLocaleChange = (newLocale: Locale) => {
    soundManager.playSync('move');

    // Save preference to cookie if opted in
    if (rememberPreference) {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }

    // Build new pathname
    let newPathname: string;

    // Check if we're on root (/) or a root subpath (/play)
    const isOnRoot = pathname === '/' || !locales.some(
      (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
    );

    if (isOnRoot) {
      // Currently on root English page - add locale prefix (except for English)
      const restOfPath = pathname === '/' ? '' : pathname;
      newPathname = newLocale === 'en' ? (restOfPath || '/') : `/${newLocale}${restOfPath}`;
    } else {
      // Currently on locale-prefixed path - replace or remove locale
      const segments = pathname.split('/');
      if (newLocale === 'en') {
        // Remove locale segment for English (go to root)
        segments.splice(1, 1);
        newPathname = segments.join('/') || '/';
      } else {
        // Replace locale segment
        segments[1] = newLocale;
        newPathname = segments.join('/');
      }
    }

    router.push(newPathname);
    close();
  };

  const handleRememberChange = () => {
    const newValue = !rememberPreference;
    setRememberPreference(newValue);

    if (newValue) {
      // Save current locale
      document.cookie = `NEXT_LOCALE=${currentLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } else {
      // Remove cookie
      document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
    }
  };

  // Get flag component for a locale
  const getFlag = (locale: Locale) => {
    const countryCode = localeCountries[locale] as keyof typeof Flags;
    const FlagComponent = Flags[countryCode];
    return FlagComponent ? <FlagComponent className={styles.flag} /> : null;
  };

  return (
    <div ref={containerRef} className={styles.languageSelector}>
      {/* Trigger Button */}
      <button
        className={styles.trigger}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        {getFlag(currentLocale)}
        <span className={styles.currentLanguage}>{localeNames[currentLocale]}</span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {isVisible && (
        <div
          className={`${styles.dropdown} ${isOpen ? styles.open : styles.closing}`}
          onAnimationEnd={handleAnimationEnd}
        >
          {/* Language List */}
          <div className={styles.languageList}>
            {locales.map((locale) => (
              <button
                key={locale}
                className={`${styles.option} ${locale === currentLocale ? styles.active : ''}`}
                onClick={() => handleLocaleChange(locale)}
              >
                {getFlag(locale)}
                <span>{localeNames[locale]}</span>
                {locale === currentLocale && (
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={styles.checkmark}
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Remember Preference */}
          <div className={styles.rememberRow}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={rememberPreference}
                onChange={handleRememberChange}
                className={styles.checkbox}
              />
              <span className={styles.checkboxCustom}>
                {rememberPreference && (
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span>{dict.language.rememberPreference}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
