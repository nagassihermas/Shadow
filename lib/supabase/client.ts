import { createBrowserClient } from '@supabase/ssr';

/**
 * Call only from effects and event handlers, never during render: pages are
 * prerendered at build time and this throws if the Supabase variables are not
 * available to the build. It returns a shared instance in the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
