import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Only same-origin relative paths: `next` comes from the URL, so it is untrusted. */
function safeNextPath(next: string | null, origin: string): string {
  if (!next || !next.startsWith('/')) return '/';
  try {
    const url = new URL(next, origin);
    return url.origin === origin ? `${url.pathname}${url.search}` : '/';
  } catch {
    return '/';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Missing/expired code, or a link opened in another browser (no PKCE verifier).
  if (next === '/reset-password') {
    return NextResponse.redirect(`${origin}/reset-password?invalid=1`);
  }
  return NextResponse.redirect(`${origin}/login?notice=confirm_failed`);
}
