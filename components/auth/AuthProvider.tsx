'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { User as AuthUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { stripLocalePrefix } from '@/lib/i18n/config';
import { clearActiveUid, getActiveUid, setActiveUid } from '@/lib/storage';

const PUBLIC_PATHS = ['/login', '/reset-password', '/delete-account'];

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: (options?: { redirectTo?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = stripLocalePrefix(usePathname());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const isPublic = PUBLIC_PATHS.includes(pathname);

    // getSession() reads local storage, so this also works offline.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (cancelled) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);

      if (sessionUser) {
        if (sessionUser.id !== getActiveUid()) {
          setActiveUid(sessionUser.id);
          // Pages already read storage under the previous uid. The read-back
          // guards against a reload loop when localStorage is unavailable.
          if (getActiveUid() === sessionUser.id) window.location.reload();
        }
        return;
      }

      if (!error && !isPublic && navigator.onLine) {
        window.location.assign('/login');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // Runs once per full page load: pathname only decides the first redirect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const signOut = useCallback(
    async ({ redirectTo = '/login' }: { redirectTo?: string } = {}) => {
      // 'local' never fails on a deleted account or an unreachable server.
      await supabase.auth.signOut({ scope: 'local' });
      clearActiveUid();
      window.location.assign(redirectTo);
    },
    [supabase]
  );

  const value = useMemo(() => ({ user, loading, signOut }), [user, loading, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be called within an AuthProvider');
  }
  return ctx;
}
