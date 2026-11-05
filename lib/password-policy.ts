export const PASSWORD_MIN_LENGTH = 8;

export type PasswordCriterionKey = 'minLength';

export interface PasswordCriterion {
  key: PasswordCriterionKey;
  test: (password: string) => boolean;
}

/** Single source of truth for password rules: add a rule here, not in a form. */
export const PASSWORD_CRITERIA: PasswordCriterion[] = [
  { key: 'minLength', test: (password) => password.length >= PASSWORD_MIN_LENGTH },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_CRITERIA.every((criterion) => criterion.test(password));
}
