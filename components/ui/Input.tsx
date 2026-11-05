'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export const inputStyles =
  'w-full min-h-11 px-3.5 py-2.5 bg-surface-subtle border border-surface-border rounded text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary aria-[invalid=true]:border-danger disabled:opacity-60 transition-colors duration-150';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputStyles, className)} {...props} />
  )
);

Input.displayName = 'Input';

export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="text-xs text-danger mt-1.5">
      {children}
    </p>
  );
}
