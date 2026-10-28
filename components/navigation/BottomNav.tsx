'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Sparkles, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';

export function BottomNav() {
  const pathname = usePathname();
  const { dict } = useDictionary();

  const navItems = [
    {
      label: dict.nav.home,
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: dict.nav.blocks,
      href: '/blocks',
      icon: Layers,
      isActive: pathname.startsWith('/blocks'),
    },
    {
      label: dict.nav.practice,
      href: '/practice',
      icon: Sparkles,
      isActive: pathname.startsWith('/practice'),
    },
    {
      label: dict.nav.stats,
      href: '/stats',
      icon: BarChart3,
      isActive: pathname.startsWith('/stats'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-surface-border safe-area-bottom">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 group relative',
                active ? 'text-primary' : 'text-text-muted hover:text-text'
              )}
            >
              {active && (
                <span className="absolute -top-1 w-8 h-0.5 bg-primary rounded-full animate-fade-in" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5 transition-transform duration-200',
                  active ? 'scale-110' : 'group-hover:scale-105'
                )}
              />
              <span
                className={cn(
                  'text-[11px] font-medium tracking-tight mt-1 transition-colors',
                  active ? 'text-text font-semibold' : 'text-text-muted'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
