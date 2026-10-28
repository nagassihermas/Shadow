'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MasteryStatus, CECRLLevel, Language } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'mastery' | 'level';
  masteryStatus?: MasteryStatus;
  level?: CECRLLevel;
  language?: Language;
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  children,
  variant = 'default',
  masteryStatus,
  level,
  language,
  size = 'md',
  ...props
}: BadgeProps) {
  let computedStyle = 'bg-surface-subtle text-text-muted border border-surface-border';

  if (masteryStatus) {
    switch (masteryStatus) {
      case 'MASTERED':
        computedStyle = 'bg-primary/20 text-primary border border-primary/40 font-medium';
        break;
      case 'LEARNING':
        computedStyle = 'bg-secondary/20 text-secondary border border-secondary/40 font-medium';
        break;
      case 'NEW':
        computedStyle = 'bg-surface-subtle text-text-muted border border-surface-border';
        break;
    }
  } else {
    switch (variant) {
      case 'primary':
        computedStyle = 'bg-primary/20 text-primary border border-primary/30';
        break;
      case 'secondary':
        computedStyle = 'bg-secondary/20 text-secondary border border-secondary/30';
        break;
      case 'success':
        computedStyle = 'bg-success/20 text-success border border-success/30';
        break;
      case 'danger':
        computedStyle = 'bg-danger/20 text-danger border border-danger/30';
        break;
      case 'level':
        computedStyle = 'bg-surface-elevated text-secondary font-mono font-semibold border border-secondary/30';
        break;
      case 'outline':
        computedStyle = 'bg-transparent text-text border border-surface-border';
        break;
    }
  }

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 rounded-sm',
    md: 'text-xs px-2.5 py-1 rounded',
  };

  const renderContent = () => {
    if (children) return children;
    if (masteryStatus === 'MASTERED') return 'Maîtrisé';
    if (masteryStatus === 'LEARNING') return 'En apprentissage';
    if (masteryStatus === 'NEW') return 'Nouveau';
    if (level) return `Niveau ${level}`;
    if (language) return language === 'EN' ? 'Anglais' : 'Chinois (Mandarin)';
    return null;
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-tight select-none',
        computedStyle,
        sizes[size],
        className
      )}
      {...props}
    >
      {renderContent()}
    </span>
  );
}
