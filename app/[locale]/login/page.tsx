'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldError, Input } from '@/components/ui/Input';
import { PasswordCriteria } from '@/components/auth/PasswordCriteria';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { fieldForAuthError, matchAuthErrorKey, type AuthErrorKey } from '@/lib/auth-errors';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { PASSWORD_MIN_LENGTH, isPasswordValid } from '@/lib/password-policy';
import { setActiveUid } from '@/lib/storage';
import { createClient } from '@/lib/supabase/client';

type View = 'signin' | 'signup' | 'forgot' | 'check-email' | 'reset-sent';

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
  form?: string;
}

const RATE_LIMIT_COOLDOWN_SECONDS = 60;

function LoginForm() {
  const { dict } = useDictionary();
  const t = dict.auth;
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const notice = searchParams.get('notice');
  const noticeText =
    notice === 'confirm_failed'
      ? t.notices.confirmFailed
      : notice === 'account_deleted'
        ? t.notices.accountDeleted
        : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      if (!session || cancelled) return;
      // The middleware sent this visitor here, so a local session may be stale
      // (deleted account). Going to / on it alone would loop with the middleware.
      const { data, error } = await createClient().auth.getUser();
      if (cancelled) return;
      if (data.user) {
        setActiveUid(data.user.id);
        window.location.assign('/');
      } else if (error && error.status && error.status < 500) {
        await createClient().auth.signOut({ scope: 'local' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  function startCooldown() {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(RATE_LIMIT_COOLDOWN_SECONDS);
    cooldownTimer.current = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current);
        return Math.max(0, seconds - 1);
      });
    }, 1000);
  }

  function switchView(next: View) {
    setView(next);
    setFieldErrors({});
    setPassword('');
    setConfirm('');
  }

  function showError(key: AuthErrorKey) {
    if (key === 'rateLimited') startCooldown();
    setFieldErrors({ [fieldForAuthError(key)]: t.errors[key] });
  }

  async function handleSignIn() {
    const { data, error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) return showError(matchAuthErrorKey(error));
    setActiveUid(data.user.id);
    window.location.assign('/');
  }

  async function handleSignUp() {
    if (!isPasswordValid(password)) {
      setFieldErrors({ password: t.errors.weakPassword });
      return;
    }
    if (password !== confirm) {
      setFieldErrors({ confirm: t.passwordsMismatch });
      return;
    }
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName.trim() || email.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return showError(matchAuthErrorKey(error));
    if (data.session && data.user) {
      setActiveUid(data.user.id);
      window.location.assign('/');
      return;
    }
    switchView('check-email');
  }

  async function handleForgot() {
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) return showError(matchAuthErrorKey(error));
    switchView('reset-sent');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || cooldown > 0) return;
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (view === 'signin') await handleSignIn();
      else if (view === 'signup') await handleSignUp();
      else await handleForgot();
    } catch {
      showError('network');
    } finally {
      setSubmitting(false);
    }
  }

  if (view === 'check-email' || view === 'reset-sent') {
    const isReset = view === 'reset-sent';
    return (
      <Card variant="elevated" padding="lg" className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary-subtle text-primary flex items-center justify-center">
          <MailCheck className="w-6 h-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-text">
          {isReset ? t.resetSentTitle : t.checkEmailTitle}
        </h1>
        <p className="text-sm text-text-muted">{isReset ? t.resetSentBody : t.checkEmailBody}</p>
        <Button type="button" fullWidth className="rounded-full" onClick={() => switchView('signin')}>
          {t.backToSignIn}
        </Button>
      </Card>
    );
  }

  const titles = {
    signin: [t.signInTitle, t.signInSubtitle],
    signup: [t.signUpTitle, t.signUpSubtitle],
    forgot: [t.forgotTitle, t.forgotSubtitle],
  } as const;
  const submitLabels = { signin: t.signIn, signup: t.signUp, forgot: t.sendResetLink } as const;
  const confirmMismatch = view === 'signup' && confirm.length > 0 && confirm !== password;
  const confirmError = fieldErrors.confirm ?? (confirmMismatch ? t.passwordsMismatch : undefined);

  return (
    <Card variant="elevated" padding="lg" className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-text">{titles[view][0]}</h1>
        <p className="text-sm text-text-muted mt-1">{titles[view][1]}</p>
      </div>

      {noticeText && view === 'signin' && (
        <p className="text-xs text-text bg-primary-subtle border border-primary/30 rounded p-2.5">
          {noticeText}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {view === 'signup' && (
          <div>
            <label htmlFor="display-name" className="block text-xs font-semibold text-text-muted mb-1">
              {t.displayNameLabel}
            </label>
            <Input
              id="display-name"
              autoComplete="nickname"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-text-muted mb-1">
            {t.emailLabel}
          </label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          />
          {fieldErrors.email && <FieldError id="email-error">{fieldErrors.email}</FieldError>}
        </div>

        {view !== 'forgot' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-xs font-semibold text-text-muted">
                {t.passwordLabel}
              </label>
              {view === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-xs text-primary hover:underline py-1.5 -my-1.5 pl-3"
                >
                  {t.forgotPassword}
                </button>
              )}
            </div>
            <PasswordInput
              id="password"
              required
              minLength={view === 'signup' ? PASSWORD_MIN_LENGTH : undefined}
              autoComplete={view === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && <FieldError id="password-error">{fieldErrors.password}</FieldError>}
            {view === 'signup' && <PasswordCriteria password={password} />}
          </div>
        )}

        {view === 'signup' && (
          <div>
            <label htmlFor="confirm" className="block text-xs font-semibold text-text-muted mb-1">
              {t.confirmPasswordLabel}
            </label>
            <PasswordInput
              id="confirm"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={!!confirmError}
              aria-describedby={confirmError ? 'confirm-error' : undefined}
            />
            {confirmError && <FieldError id="confirm-error">{confirmError}</FieldError>}
          </div>
        )}

        {fieldErrors.form && <FieldError id="form-error">{fieldErrors.form}</FieldError>}

        <Button
          type="submit"
          fullWidth
          size="lg"
          className="rounded-full"
          disabled={submitting || cooldown > 0}
          leftIcon={submitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : undefined}
        >
          {submitting
            ? t.loading
            : cooldown > 0
              ? t.retryIn.replace('{seconds}', String(cooldown))
              : submitLabels[view]}
        </Button>
      </form>

      <div className="text-center">
        {view === 'signin' ? (
          <button type="button" onClick={() => switchView('signup')} className="text-sm text-primary hover:underline py-2">
            {t.toSignUp}
          </button>
        ) : (
          <button type="button" onClick={() => switchView('signin')} className="text-sm text-primary hover:underline py-2">
            {view === 'signup' ? t.toSignIn : t.backToSignIn}
          </button>
        )}
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col px-4 py-4">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-md">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
