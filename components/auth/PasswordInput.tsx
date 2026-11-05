'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { cn } from '@/lib/utils';

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => {
  const { dict } = useDictionary();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn('pr-12', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? dict.auth.hidePassword : dict.auth.showPassword}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 min-h-11 min-w-11 flex items-center justify-center rounded text-text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-light transition-colors duration-150"
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
