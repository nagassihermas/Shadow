'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDictionary } from '@/lib/i18n/DictionaryProvider';

export default function LoginPage() {
  const { dict } = useDictionary();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? 'error' : 'sent');
  }

  if (status === 'sent') {
    return <p>{dict.auth.magicLinkSent}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {dict.auth.emailLabel}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? dict.auth.sending : dict.auth.sendMagicLink}
      </button>
      {status === 'error' && <p role="alert">{dict.auth.error}</p>}
    </form>
  );
}
