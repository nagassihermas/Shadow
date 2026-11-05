export type AuthErrorKey =
  | 'invalidCredentials'
  | 'emailTaken'
  | 'invalidEmail'
  | 'emailNotConfirmed'
  | 'weakPassword'
  | 'samePassword'
  | 'reauthenticationNeeded'
  | 'rateLimited'
  | 'signupDisabled'
  | 'network'
  | 'generic';

export type AuthErrorField = 'email' | 'password' | 'form';

interface AuthErrorLike {
  code?: string;
  status?: number;
  message?: string;
  name?: string;
}

// Codes come from ErrorCode in @supabase/auth-js (lib/error-codes.d.ts).
const KEY_BY_CODE: Record<string, AuthErrorKey> = {
  invalid_credentials: 'invalidCredentials',
  email_exists: 'emailTaken',
  user_already_exists: 'emailTaken',
  email_address_invalid: 'invalidEmail',
  email_not_confirmed: 'emailNotConfirmed',
  weak_password: 'weakPassword',
  same_password: 'samePassword',
  reauthentication_needed: 'reauthenticationNeeded',
  reauthentication_not_valid: 'reauthenticationNeeded',
  over_email_send_rate_limit: 'rateLimited',
  over_request_rate_limit: 'rateLimited',
  signup_disabled: 'signupDisabled',
  email_provider_disabled: 'signupDisabled',
};

// Fallback only, for responses that carry no code (older servers).
const KEY_BY_MESSAGE: Array<[RegExp, AuthErrorKey]> = [
  [/invalid (login )?credentials/i, 'invalidCredentials'],
  [/already (registered|been registered|in use|exists)/i, 'emailTaken'],
  [/different from the old password/i, 'samePassword'],
  [/password.*(weak|short|at least|characters)/i, 'weakPassword'],
  [/(invalid|valid).*email|email.*invalid/i, 'invalidEmail'],
  [/rate limit|too many requests|security purposes/i, 'rateLimited'],
  [/email not confirmed/i, 'emailNotConfirmed'],
  [/failed to fetch|network|load failed/i, 'network'],
];

const FIELD_BY_KEY: Partial<Record<AuthErrorKey, AuthErrorField>> = {
  invalidCredentials: 'password',
  weakPassword: 'password',
  samePassword: 'password',
  emailTaken: 'email',
  invalidEmail: 'email',
  emailNotConfirmed: 'email',
};

export function matchAuthErrorKey(error: AuthErrorLike | null | undefined): AuthErrorKey {
  if (!error) return 'generic';
  if (error.code && KEY_BY_CODE[error.code]) return KEY_BY_CODE[error.code];
  if (error.status === 429) return 'rateLimited';
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'network';
  const message = error.message ?? '';
  const match = KEY_BY_MESSAGE.find(([pattern]) => pattern.test(message));
  return match ? match[1] : 'generic';
}

export function fieldForAuthError(key: AuthErrorKey): AuthErrorField {
  return FIELD_BY_KEY[key] ?? 'form';
}
