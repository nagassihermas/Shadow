'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PasswordCriteria } from '@/components/auth/PasswordCriteria';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/Input';
import { fieldForAuthError, matchAuthErrorKey } from '@/lib/auth-errors';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { PASSWORD_MIN_LENGTH, isPasswordValid } from '@/lib/password-policy';
import { createClient } from '@/lib/supabase/client';

interface Errors {
  current?: string;
  next?: string;
  confirm?: string;
  form?: string;
}

export function ChangePasswordForm({ email, disabled }: { email: string; disabled: boolean }) {
  const { dict } = useDictionary();
  const t = dict.profile;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSaved(false);
    if (!isPasswordValid(next)) {
      setErrors({ next: dict.auth.errors.weakPassword });
      return;
    }
    if (next !== confirm) {
      setErrors({ confirm: dict.auth.passwordsMismatch });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error: verifyError } = await createClient().auth.signInWithPassword({ email, password: current });
      if (verifyError) {
        const key = matchAuthErrorKey(verifyError);
        setErrors(
          key === 'invalidCredentials' ? { current: t.currentPasswordWrong } : { form: dict.auth.errors[key] }
        );
        return;
      }

      const { error } = await createClient().auth.updateUser({ password: next });
      if (error) {
        const key = matchAuthErrorKey(error);
        setErrors(
          fieldForAuthError(key) === 'password' ? { next: dict.auth.errors[key] } : { form: dict.auth.errors[key] }
        );
        return;
      }

      setCurrent('');
      setNext('');
      setConfirm('');
      setSaved(true);
    } catch {
      setErrors({ form: dict.auth.errors.network });
    } finally {
      setSubmitting(false);
    }
  }

  const mismatch = confirm.length > 0 && confirm !== next;
  const confirmError = errors.confirm ?? (mismatch ? dict.auth.passwordsMismatch : undefined);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="current-password" className="block text-xs font-semibold text-text-muted mb-1">
          {t.currentPasswordLabel}
        </label>
        <PasswordInput
          id="current-password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          aria-invalid={!!errors.current}
          aria-describedby={errors.current ? 'current-password-error' : undefined}
        />
        {errors.current && <FieldError id="current-password-error">{errors.current}</FieldError>}
      </div>

      <div>
        <label htmlFor="next-password" className="block text-xs font-semibold text-text-muted mb-1">
          {dict.auth.newPasswordLabel}
        </label>
        <PasswordInput
          id="next-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={!!errors.next}
          aria-describedby={errors.next ? 'next-password-error' : undefined}
        />
        {errors.next && <FieldError id="next-password-error">{errors.next}</FieldError>}
        <PasswordCriteria password={next} />
      </div>

      <div>
        <label htmlFor="next-password-confirm" className="block text-xs font-semibold text-text-muted mb-1">
          {dict.auth.confirmPasswordLabel}
        </label>
        <PasswordInput
          id="next-password-confirm"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={!!confirmError}
          aria-describedby={confirmError ? 'next-password-confirm-error' : undefined}
        />
        {confirmError && <FieldError id="next-password-confirm-error">{confirmError}</FieldError>}
      </div>

      {errors.form && <FieldError id="change-password-error">{errors.form}</FieldError>}
      {saved && (
        <p role="status" className="text-xs text-success">
          {t.passwordChanged}
        </p>
      )}

      <Button
        type="submit"
        variant="subtle"
        fullWidth
        disabled={submitting || disabled}
        leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : undefined}
      >
        {submitting ? dict.auth.loading : t.changePassword}
      </Button>
    </form>
  );
}
