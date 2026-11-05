'use client';

import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/Input';
import { matchAuthErrorKey } from '@/lib/auth-errors';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { deleteLocalUserData } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';

export function DeleteAccountDialog({
  uid,
  email,
  onClose,
}: {
  uid: string;
  email: string;
  onClose: () => void;
}) {
  const { dict } = useDictionary();
  const t = dict.profile;
  const { signOut } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password });
      if (verifyError) {
        const key = matchAuthErrorKey(verifyError);
        setError(key === 'invalidCredentials' ? t.currentPasswordWrong : dict.auth.errors[key]);
        return;
      }

      const { error: deleteError } = await supabase.rpc('delete_own_account');
      if (deleteError) {
        console.error('delete_own_account failed:', deleteError.code);
        setError(t.deleteFailed);
        return;
      }

      deleteLocalUserData(uid);
      await signOut({ redirectTo: '/login?notice=account_deleted' });
    } catch {
      setError(dict.auth.errors.network);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        className="bg-surface-elevated border border-surface-border rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl animate-fade-in"
      >
        <h2 id="delete-account-title" className="text-base font-bold text-text">
          {t.deleteTitle}
        </h2>
        <p className="text-sm text-text-muted">{t.deleteBody}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="delete-password" className="block text-xs font-semibold text-text-muted mb-1">
              {dict.auth.passwordLabel}
            </label>
            <PasswordInput
              id="delete-password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'delete-password-error' : undefined}
            />
            {error && <FieldError id="delete-password-error">{error}</FieldError>}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t.cancel}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={submitting}
              leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : undefined}
            >
              {submitting ? dict.auth.loading : t.deleteConfirm}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
