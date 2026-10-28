import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from './lib/i18n/config';

// Routes that must stay reachable WITHOUT a session (login screen itself).
// /auth/callback is handled separately below — it's excluded from the
// locale rewrite entirely (see matcher), same treatment as /api.
const PUBLIC_ROUTES = ['/login'];

function resolveLocaleFromCookie(request: NextRequest): Locale | null {
  const cookieValue = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieValue && (LOCALES as readonly string[]).includes(cookieValue)) {
    return cookieValue as Locale;
  }
  return null;
}

function resolveLocaleFromHeader(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get('accept-language');
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const parsed = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, qValue] = part.trim().split(';q=');
      return { baseLang: tag.split('-')[0].toLowerCase(), quality: qValue ? parseFloat(qValue) : 1 };
    })
    .sort((a, b) => b.quality - a.quality);
  for (const { baseLang } of parsed) {
    if ((LOCALES as readonly string[]).includes(baseLang)) return baseLang as Locale;
  }
  return DEFAULT_LOCALE;
}

export async function middleware(request: NextRequest) {
  // ── 1. Supabase session refresh ──────────────────────────────────────────
  // Must run first and the resulting cookies must survive into whichever
  // response (redirect or rewrite) this function ultimately returns.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT per Supabase's documented pattern: do not remove this call or
  // insert logic between client creation and this line — getUser() is what
  // actually performs the token refresh and cookie rewrite.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 2. Route protection ──────────────────────────────────────────────────
  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // ── 3. Interface-locale resolution + transparent rewrite ────────────────
  const locale = resolveLocaleFromCookie(request) ?? resolveLocaleFromHeader(request);
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/${locale}${pathname}`;

  const finalResponse = NextResponse.rewrite(rewriteUrl, { request });
  response.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));
  finalResponse.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!api|auth/callback|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/).*)',
  ],
};
