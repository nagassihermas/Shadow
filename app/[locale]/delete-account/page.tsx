'use client';

import Link from 'next/link';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import { Card } from '@/components/ui/Card';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

export default function DeleteAccountInfoPage() {
  const { dict } = useDictionary();
  const t = dict.deleteAccountPage;

  return (
    <div className="flex-1 flex flex-col px-4 py-4">
      <div className="flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center py-6">
        <Card variant="elevated" padding="lg" className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-bold text-text">{t.title}</h1>
          <p className="text-sm text-text-muted">{t.intro}</p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-text">
            <li>{t.step1}</li>
            <li>{t.step2}</li>
            <li>{t.step3}</li>
          </ol>
          <p className="text-sm text-text-muted">{t.dataDeleted}</p>
          {SUPPORT_EMAIL && (
            <p className="text-sm text-text-muted">
              {t.contact}{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          )}
          <Link href="/login" className="block text-sm text-primary hover:underline py-2">
            {dict.auth.backToSignIn}
          </Link>
        </Card>
      </div>
    </div>
  );
}
