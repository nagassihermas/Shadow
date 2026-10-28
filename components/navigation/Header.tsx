'use client';

import React from 'react';
import Link from 'next/link';
import { Language } from '@/types';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';

export interface HeaderProps {
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
  title?: string;
  showBack?: boolean;
  backHref?: string;
  className?: string;
}

export function Header({
  currentLanguage,
  onLanguageChange,
  title,
  showBack = false,
  backHref = '/',
  className,
}: HeaderProps) {
  const { dict } = useDictionary();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-surface-border/60 py-3.5 px-4 sm:px-6',
        className
      )}
    >
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link
              href={backHref}
              className="p-1.5 -ml-1.5 rounded text-text-muted hover:text-text hover:bg-surface transition-colors"
              aria-label={dict.common.back}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded bg-surface-elevated border border-surface-border flex items-center justify-center text-primary font-bold text-sm tracking-tighter">
                S
              </div>
              <span className="font-semibold text-text tracking-tight text-base group-hover:text-primary transition-colors">
                Shadow
              </span>
            </Link>
          )}

          {title && (
            <h1 className="text-base font-medium text-text truncate max-w-[200px] sm:max-w-xs">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sélecteur de langue d'interface */}
          <LocaleSwitcher />

          {/* Sélecteur de langue d'apprentissage EN / ZH */}
          {onLanguageChange && (
            <div className="flex items-center bg-surface-subtle p-1 rounded border border-surface-border">
              <button
                type="button"
                onClick={() => onLanguageChange('EN')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded transition-all duration-150',
                  currentLanguage === 'EN'
                    ? 'bg-surface-elevated text-primary shadow-sm border border-surface-border/80'
                    : 'text-text-muted hover:text-text'
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ZH')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded transition-all duration-150',
                  currentLanguage === 'ZH'
                    ? 'bg-surface-elevated text-secondary shadow-sm border border-surface-border/80'
                    : 'text-text-muted hover:text-text'
                )}
              >
                ZH
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
