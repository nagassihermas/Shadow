'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none select-none';

    const variants = {
      primary:
        'bg-primary text-background font-semibold hover:bg-primary-hover shadow-sm',
      secondary:
        'bg-secondary text-background font-medium hover:bg-secondary-hover shadow-sm',
      outline:
        'border border-surface-border bg-transparent text-text hover:bg-surface-hover hover:border-textMuted/40',
      ghost:
        'bg-transparent text-text hover:bg-surface-hover hover:text-text',
      danger:
        'bg-danger text-text font-medium hover:opacity-90 shadow-sm',
      subtle:
        'bg-surface-hover text-text hover:bg-surface-border text-text',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 rounded-sm gap-1.5',
      md: 'text-sm px-4 py-2.5 rounded gap-2',
      lg: 'text-base px-6 py-3.5 rounded-md gap-2.5 font-medium',
      icon: 'p-2.5 rounded-full aspect-square',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : leftIcon ? (
          <span className="shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
