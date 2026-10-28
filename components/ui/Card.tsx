'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle' | 'outline' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      children,
      variant = 'default',
      padding = 'md',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'rounded-md transition-all duration-200 text-text overflow-hidden';

    const variants = {
      default: 'bg-surface border border-surface-border/70',
      elevated: 'bg-surface-elevated border border-surface-border shadow-md',
      subtle: 'bg-surface-subtle border border-surface-border/40',
      outline: 'bg-transparent border border-surface-border',
      interactive:
        'bg-surface border border-surface-border/70 hover:border-primary/50 hover:bg-surface-hover cursor-pointer active:scale-[0.99]',
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6 sm:p-7',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 pb-3', className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-base font-semibold leading-none tracking-tight text-text',
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-xs text-text-muted', className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('pt-0', className)} {...props} />;
}
