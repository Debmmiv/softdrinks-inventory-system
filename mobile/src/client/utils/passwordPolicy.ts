export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score: number; // 0 to 5
  strength: 'weak' | 'fair' | 'strong' | 'very strong';
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  'password123!',
  '12345678',
  '123456789',
  'admin123',
  'admin123!',
  'admin2026',
  'qwerty123',
  'softdrinks',
  'softdrinks123',
  'softdrinks123!',
  'gusa1234',
  'depot1234',
]);

/**
 * Validates password against enterprise depot security standards:
 * - 8 to 128 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*...)
 * - Does not contain the user's username
 * - Not a commonly used weak password
 */
export function validatePassword(password: string, username?: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('At least 8 characters');
  } else if (password.length > 128) {
    errors.push('Cannot exceed 128 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least 1 uppercase letter (A-Z)');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least 1 lowercase letter (a-z)');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('At least 1 number (0-9)');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('At least 1 special character (!@#$%^&*...)');
  }

  const cleanUsername = username?.trim().toLowerCase();
  if (cleanUsername && cleanUsername.length >= 3 && password.toLowerCase().includes(cleanUsername)) {
    errors.push('Cannot contain your username');
  }

  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common and easily guessed');
  }

  // Calculate score (0-5)
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) score++;

  let strength: PasswordValidationResult['strength'] = 'weak';
  if (score <= 2) {
    strength = 'weak';
  } else if (score === 3) {
    strength = 'fair';
  } else if (score === 4) {
    strength = 'strong';
  } else {
    strength = 'very strong';
  }

  return {
    valid: errors.length === 0,
    errors,
    score,
    strength,
  };
}
