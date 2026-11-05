'use client';

import { Check, Circle } from 'lucide-react';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { PASSWORD_CRITERIA, PASSWORD_MIN_LENGTH } from '@/lib/password-policy';
import { cn } from '@/lib/utils';

export function PasswordCriteria({ password }: { password: string }) {
  const { dict } = useDictionary();

  return (
    <div className="mt-2 rounded border border-surface-border bg-surface-subtle px-3 py-2">
      <p className="text-[11px] font-semibold text-text-muted">{dict.auth.criteriaTitle}</p>
      <ul className="mt-1 space-y-1">
        {PASSWORD_CRITERIA.map((criterion) => {
          const met = criterion.test(password);
          const Icon = met ? Check : Circle;
          return (
            <li
              key={criterion.key}
              className={cn('flex items-center gap-1.5 text-xs', met ? 'text-success' : 'text-text-muted')}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {dict.auth.criteria[criterion.key].replace('{min}', String(PASSWORD_MIN_LENGTH))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
