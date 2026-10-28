'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: 'primary' | 'secondary' | 'success';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const fillVariants = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    success: 'bg-success',
  };

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-muted">
          <span>Progression</span>
          <span className="font-mono">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-surface-subtle border border-surface-border rounded-full overflow-hidden',
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            fillVariants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
