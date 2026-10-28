import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { BottomNav } from '@/components/navigation/BottomNav';
import { PWARegister } from '@/components/PWARegister';
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { DictionaryProvider } from '@/lib/i18n/DictionaryProvider';
import { LocaleBootstrap } from '@/components/i18n/LocaleBootstrap';

export const metadata: Metadata = {
  title: 'Shadow — Apprentissage des Langues (Anglais & Chinois)',
  description: 'Application PWA d’apprentissage par répétition espacée FSRS et pratique du Shadowing pour l’anglais et le chinois.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Shadow',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#1C1B1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string } | Promise<{ locale: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const rawLocale = resolvedParams?.locale;
  const locale = (LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : DEFAULT_LOCALE;

  const dict = getDictionary(locale);

  return (
    <html lang={locale} className="dark">
      <body className="bg-background text-text selection:bg-primary/30 selection:text-text min-h-screen">
        <DictionaryProvider dict={dict} locale={locale}>
          <LocaleBootstrap />
          <PWARegister />
          <main className="min-h-screen flex flex-col">{children}</main>
          <BottomNav />
        </DictionaryProvider>
      </body>
    </html>
  );
}
