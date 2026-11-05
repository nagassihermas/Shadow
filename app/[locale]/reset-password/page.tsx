'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldError } from '@/components/ui/Input';
import { PasswordCriteria } from '@/components/auth/PasswordCriteria';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { fieldForAuthError, matchAuthErrorKey } from '@/lib/auth-errors';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { PASSWORD_MIN_LENGTH, isPasswordValid } from '@/lib/password-policy';
import { createClient } from '@/lib/supabase/client';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

const TOKEN_EXCHANGE_TIMEOUT_MS = 4000;

/**
 * The browser client uses PKCE, so the e-mail link normally goes through
 * /auth/callback?next=/reset-password: the code is exchanged on the server and
 * this page opens with a session. PASSWORD_RECOVERY therefore does not fire
 * here in that flow; it and the #type=recovery wait only cover an implicit link.
 */
function ResetForm() {
  const { dict } = useDictionary();
  const t = dict.auth;
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const markReady = () => {
      if (!cancelled) setStatus((current) => (current === 'checking' ? 'ready' : current));
    };

    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markReady();
    });

    const check = async () => {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (cancelled) return;
      if (session) markReady();
      else setStatus((current) => (current === 'checking' ? 'invalid' : current));
    };

    if (searchParams.get('invalid')) {
      setStatus('invalid');
    } else if (window.location.hash.includes('type=recovery')) {
      timer = setTimeout(check, TOKEN_EXCHANGE_TIMEOUT_MS);
    } else {
      check();
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!isPasswordValid(password)) {
      setErrors({ password: t.errors.weakPassword });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: t.passwordsMismatch });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        const key = matchAuthErrorKey(error);
        setErrors(fieldForAuthError(key) === 'password' ? { password: t.errors[key] } : { form: t.errors[key] });
        return;
      }
      setStatus('done');
    } catch {
      setErrors({ form: t.errors.network });
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'checking') {
    return (
      <div className="flex justify-center py-10" role="status" aria-label={t.loading}>
        <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (status === 'invalid' || status === 'done') {
    const done = status === 'done';
    const Icon = done ? CheckCircle2 : AlertTriangle;
    return (
      <Card variant="elevated" padding="lg" className="text-center space-y-4">
        <div
          className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
            done ? 'bg-primary-subtle text-primary' : 'bg-danger-subtle text-danger'
          }`}
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-text">
          {done ? t.passwordUpdatedTitle : t.resetInvalidTitle}
        </h1>
        <p className="text-sm text-text-muted">{done ? t.passwordUpdatedBody : t.resetInvalidBody}</p>
        <Link href={done ? '/' : '/login'} className="block">
          <Button type="button" fullWidth className="rounded-full">
            {done ? t.goHome : t.backToSignIn}
          </Button>
        </Link>
      </Card>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  const confirmError = errors.confirm ?? (mismatch ? t.passwordsMismatch : undefined);

  return (
    <Card variant="elevated" padding="lg" className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">{t.resetTitle}</h1>
        <p className="text-sm text-text-muted mt-1">{t.resetSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold text-text-muted mb-1">
            {t.newPasswordLabel}
          </label>
          <PasswordInput
            id="new-password"
            required
            minLength={PASSWORD_MIN_LENGTH}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'new-password-error' : undefined}
          />
          {errors.password && <FieldError id="new-password-error">{errors.password}</FieldError>}
          <PasswordCriteria password={password} />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-xs font-semibold text-text-muted mb-1">
            {t.confirmPasswordLabel}
          </label>
          <PasswordInput
            id="confirm-password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={!!confirmError}
            aria-describedby={confirmError ? 'confirm-password-error' : undefined}
          />
          {confirmError && <FieldError id="confirm-password-error">{confirmError}</FieldError>}
        </div>

        {errors.form && <FieldError id="reset-form-error">{errors.form}</FieldError>}

        <Button
          type="submit"
          fullWidth
          size="lg"
          className="rounded-full"
          disabled={submitting}
          leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : undefined}
        >
          {submitting ? t.loading : t.updatePassword}
        </Button>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 flex flex-col px-4 py-4">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-md">
          <Suspense fallback={null}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
