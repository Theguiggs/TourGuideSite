'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'LanguageTabs';

// --- Types ---

export interface LanguageTabItem {
  code: string;
  label: string;
  countryCode: string;
  isBase: boolean;
  progress: { completed: number; total: number };
}

export interface LanguageTabsProps {
  languages: LanguageTabItem[];
  activeLanguage: string;
  onLanguageChange: (lang: string) => void;
}

const MAX_VISIBLE = 5;

// --- Component ---

export function LanguageTabs({ languages, activeLanguage, onLanguageChange }: LanguageTabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const visibleTabs = languages.slice(0, MAX_VISIBLE);
  const overflowTabs = languages.slice(MAX_VISIBLE);

  // Close overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  // Close overflow on Escape
  const handleOverflowKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOverflowOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index;
      switch (e.key) {
        case 'ArrowRight':
          newIndex = (index + 1) % visibleTabs.length;
          break;
        case 'ArrowLeft':
          newIndex = (index - 1 + visibleTabs.length) % visibleTabs.length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = visibleTabs.length - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      onLanguageChange(visibleTabs[newIndex].code);
      tabRefs.current[newIndex]?.focus();
    },
    [visibleTabs, onLanguageChange],
  );

  const handleTabClick = useCallback(
    (code: string) => {
      logger.info(SERVICE_NAME, 'Language tab selected', { lang: code });
      onLanguageChange(code);
    },
    [onLanguageChange],
  );

  const handleOverflowItemClick = useCallback(
    (code: string) => {
      logger.info(SERVICE_NAME, 'Language tab selected from overflow', { lang: code });
      onLanguageChange(code);
      setOverflowOpen(false);
    },
    [onLanguageChange],
  );

  if (languages.length <= 1) {
    return null;
  }

  return (
    <div className="mb-4">
      <div
        className="flex items-center border-b border-line overflow-x-auto scrollbar-thin"
        role="tablist"
        aria-label="Langues de la visite"
      >
        {visibleTabs.map((tab, index) => {
          const isActive = tab.code === activeLanguage;
          return (
            <button
              key={tab.code}
              ref={(el) => { tabRefs.current[index] = el; }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              aria-label={`${tab.label}, ${tab.progress.completed} sur ${tab.progress.total} scenes traduites`}
              onClick={() => handleTabClick(tab.code)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-grenadine text-grenadine font-semibold'
                  : 'border-transparent text-ink-60 hover:text-ink-80 hover:border-line'
              }`}
              data-testid={`lang-tab-${tab.code}`}
            >
              <img
                src={`https://flagcdn.com/w40/${tab.countryCode}.png`}
                srcSet={`https://flagcdn.com/w80/${tab.countryCode}.png 2x`}
                width="20"
                height="15"
                alt=""
                aria-hidden="true"
                className="shrink-0"
              />
              <span>{tab.label}</span>
              <span className="text-xs text-ink-40 ml-1">
                {tab.progress.completed}/{tab.progress.total}
              </span>
            </button>
          );
        })}

        {overflowTabs.length > 0 && (
          <div className="relative" ref={overflowRef}>
            <button
              onClick={() => setOverflowOpen((prev) => !prev)}
              onKeyDown={handleOverflowKeyDown}
              className="px-3 py-2 text-sm font-medium text-ink-60 hover:text-ink-80 border-b-2 border-transparent"
              aria-haspopup="true"
              aria-expanded={overflowOpen}
              data-testid="lang-tab-overflow"
            >
              +{overflowTabs.length}
            </button>

            {overflowOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 bg-white border border-line rounded-lg shadow-lg z-10 min-w-[180px]"
                onKeyDown={handleOverflowKeyDown}
              >
                {overflowTabs.map((tab) => (
                  <button
                    key={tab.code}
                    role="menuitem"
                    onClick={() => handleOverflowItemClick(tab.code)}
                    className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-paper-soft ${
                      tab.code === activeLanguage ? 'text-grenadine font-semibold bg-grenadine-soft' : 'text-ink-80'
                    }`}
                    data-testid={`lang-overflow-${tab.code}`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${tab.countryCode}.png`}
                      srcSet={`https://flagcdn.com/w80/${tab.countryCode}.png 2x`}
                      width="20"
                      height="15"
                      alt=""
                      aria-hidden="true"
                      className="shrink-0"
                    />
                    <span>{tab.label}</span>
                    <span className="text-xs text-ink-40 ml-auto">
                      {tab.progress.completed}/{tab.progress.total}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab panel */}
      <div role="tabpanel" aria-label={`Contenu ${languages.find((l) => l.code === activeLanguage)?.label ?? ''}`} data-testid="lang-tab-panel" />
    </div>
  );
}
