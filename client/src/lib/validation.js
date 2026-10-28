// JanSetu Form & Credential Validation Rules

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Normalizes email address (trims whitespace, converts to lowercase)
 */
export function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Validates email format according to standard RFC pattern
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'Email address is required.';
  }
  const normalized = email.trim();
  if (normalized.length === 0) {
    return 'Email address is required.';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalized)) {
    return 'Please enter a valid email address (e.g. name@example.com).';
  }
  if (normalized.length > 255) {
    return 'Email address is too long.';
  }
  return null;
}

/**
 * Validates password rules:
 * - Minimum 12 characters
 * - Maximum 128 characters
 * - Never trims or silently modifies password
 * - Supports passphrases and spaces without restrictive character set penalties
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required.';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long (you have entered ${password.length}).`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }
  return null;
}

/**
 * Validates password confirmation match
 */
export function validatePasswordConfirmation(password, confirmPassword) {
  if (!confirmPassword) {
    return 'Please confirm your password.';
  }
  if (password !== confirmPassword) {
    return 'Passwords do not match.';
  }
  return null;
}

/**
 * Validates full name
 */
export function validateFullName(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Full name is required.';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters.';
  }
  if (trimmed.length > 100) {
    return 'Full name cannot exceed 100 characters.';
  }
  return null;
}

/**
 * Validates phone number (optional, but if provided must be a valid 10-digit number)
 */
export function validatePhoneNumber(phone) {
  if (!phone || !phone.trim()) {
    return null; // Phone is optional for initial citizen registration
  }
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(cleanPhone)) {
    return 'Please enter a valid 10-digit mobile number.';
  }
  return null;
}

/**
 * Evaluates password strength for user feedback
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Empty', color: 'bg-slate-200' };
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600' };
  if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-600' };
  return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
}
