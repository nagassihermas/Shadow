'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { Header } from '@/components/navigation/Header';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { DeleteAccountDialog } from '@/components/profile/DeleteAccountDialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldError, Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { calculateCECRLProgress } from '@/lib/cecrl';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';
import { getDisplayName, updateProfile } from '@/lib/profile';
import { getSelectedLanguage, getStoredPhrases, saveUser, setSelectedLanguage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';

const ALL_LANGUAGES: Language[] = ['EN', 'ZH'];

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-text">{children}</h2>;
}

export default function ProfilePage() {
  const { dict } = useDictionary();
  const t = dict.profile;
  const { user, profile, loading, signOut, setProfile } = useAuth();
  const online = useOnline();

  const [name, setName] = useState('');
  const [languages, setLanguages] = useState<Language[]>(ALL_LANGUAGES);
  const [defaultLanguage, setDefaultLanguage] = useState<Language>('EN');
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!profile || hydrated) return;
    setName(profile.name ?? '');
    setLanguages(profile.target_languages?.length ? profile.target_languages : ALL_LANGUAGES);
    setDefaultLanguage(getSelectedLanguage());
    setHydrated(true);
  }, [profile, hydrated]);

  function chooseDefaultLanguage(language: Language) {
    setDefaultLanguage(language);
    setSelectedLanguage(language);
  }

  function toggleLanguage(language: Language) {
    setSaveState('idle');
    const next = languages.includes(language)
      ? languages.filter((item) => item !== language)
      : ALL_LANGUAGES.filter((item) => item === language || languages.includes(item));
    if (next.length === 0) return;
    setLanguages(next);
    if (!next.includes(defaultLanguage)) chooseDefaultLanguage(next[0]);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setSaveState('idle');
    try {
      const updated = await updateProfile(user.id, { name: name.trim(), target_languages: languages });
      saveUser(updated);
      setProfile(updated);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = getDisplayName(profile);
  const languageLabels: Record<Language, string> = { EN: t.languageEN, ZH: t.languageZH };

  return (
    <div className="flex-1 pb-8">
      <Header title={t.title} />

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {!online && (
          <p role="status" className="text-xs text-text bg-surface-subtle border border-surface-border rounded p-2.5">
            {t.offlineNotice}
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Card variant="default" padding="md" className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="w-12 h-12 rounded-full bg-primary-subtle text-primary flex items-center justify-center text-lg font-bold uppercase shrink-0"
              >
                {displayName.charAt(0)}
              </div>
              <div className="min-w-0">
                <SectionTitle>{t.identity}</SectionTitle>
                <p className="text-xs text-text-muted truncate">{profile.email}</p>
              </div>
            </div>

            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold text-text-muted mb-1">
                {t.nameLabel}
              </label>
              <Input
                id="profile-name"
                autoComplete="nickname"
                maxLength={80}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaveState('idle');
                }}
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="block text-xs font-semibold text-text-muted mb-1">
                {dict.auth.emailLabel}
              </label>
              <Input id="profile-email" type="email" value={profile.email} readOnly disabled />
              <p className="text-[11px] text-text-muted mt-1">{t.emailReadOnly}</p>
            </div>
          </Card>

          <Card variant="default" padding="md" className="space-y-4">
            <SectionTitle>{t.preferences}</SectionTitle>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-text-muted">{dict.common.interfaceLanguage}</span>
              <LocaleSwitcher />
            </div>

            <fieldset>
              <legend className="text-xs font-semibold text-text-muted mb-1.5">{t.studiedLanguages}</legend>
              <div className="flex gap-2">
                {ALL_LANGUAGES.map((language) => (
                  <label
                    key={language}
                    className={cn(
                      'flex-1 min-h-11 flex items-center justify-center gap-2 rounded border text-xs font-medium cursor-pointer transition-colors duration-150',
                      languages.includes(language)
                        ? 'bg-primary-subtle border-primary/40 text-text'
                        : 'bg-surface-subtle border-surface-border text-text-muted'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={languages.includes(language)}
                      onChange={() => toggleLanguage(language)}
                    />
                    {languageLabels[language]}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-text-muted mt-1">{t.studiedLanguagesHint}</p>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold text-text-muted mb-1.5">{t.defaultLanguage}</legend>
              <div className="flex gap-2">
                {languages.map((language) => (
                  <button
                    key={language}
                    type="button"
                    aria-pressed={defaultLanguage === language}
                    onClick={() => chooseDefaultLanguage(language)}
                    className={cn(
                      'flex-1 min-h-11 rounded border text-xs font-medium transition-colors duration-150',
                      defaultLanguage === language
                        ? 'bg-primary text-background border-primary font-semibold'
                        : 'bg-surface-subtle border-surface-border text-text-muted hover:text-text'
                    )}
                  >
                    {languageLabels[language]}
                  </button>
                ))}
              </div>
            </fieldset>

            {saveState === 'error' && <FieldError id="profile-save-error">{t.saveFailed}</FieldError>}
            {saveState === 'saved' && (
              <p role="status" className="text-xs text-success">
                {t.saved}
              </p>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={saving || !online}
              leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : undefined}
            >
              {saving ? dict.auth.loading : t.save}
            </Button>
          </Card>
        </form>

        <Card variant="default" padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionTitle>{t.progress}</SectionTitle>
            <Link href="/stats" className="text-xs text-primary hover:underline flex items-center gap-0.5 py-1">
              {t.viewStats}
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
          {languages.map((language) => {
            const mastered = getStoredPhrases(language).filter((p) => p.mastery_status === 'MASTERED').length;
            const progress = calculateCECRLProgress(language, mastered);
            return (
              <div key={language} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text">{languageLabels[language]}</span>
                  <Badge level={progress.currentLevel} size="sm">
                    {progress.currentLevel}
                  </Badge>
                </div>
                <ProgressBar value={progress.progressPercent} size="sm" />
              </div>
            );
          })}
        </Card>

        <Card variant="default" padding="md" className="space-y-3">
          <SectionTitle>{t.security}</SectionTitle>
          <ChangePasswordForm email={profile.email} disabled={!online} />
        </Card>

        <Button
          type="button"
          variant="outline"
          fullWidth
          leftIcon={<LogOut className="w-4 h-4" aria-hidden="true" />}
          onClick={() => signOut()}
        >
          {t.signOut}
        </Button>

        <Card variant="outline" padding="md" className="space-y-3 border-danger/40">
          <SectionTitle>{t.dangerZone}</SectionTitle>
          <p className="text-xs text-text-muted">{t.deleteBody}</p>
          <Button
            type="button"
            variant="danger"
            fullWidth
            disabled={!online}
            leftIcon={<Trash2 className="w-4 h-4" aria-hidden="true" />}
            onClick={() => setDeleteOpen(true)}
          >
            {t.deleteAccount}
          </Button>
        </Card>
      </div>

      {deleteOpen && (
        <DeleteAccountDialog uid={user.id} email={profile.email} onClose={() => setDeleteOpen(false)} />
      )}
    </div>
  );
}
