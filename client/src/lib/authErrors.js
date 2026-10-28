/**
 * Maps Supabase Auth errors to user-facing copy.
 * Avoids account enumeration and leaking internals.
 */

export function publicAuthErrorMessage(error, context = 'generic') {
  const raw = typeof error === 'string' ? error : error?.message || '';
  const message = raw.toLowerCase();

  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return 'Please confirm your email address before signing in. Check your inbox for a verification link.';
  }

  if (message.includes('over_email_send_rate_limit') || message.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (context === 'signup') {
    if (message.includes('password')) {
      return raw || 'The password does not meet the security requirements.';
    }
    if (
      message.includes('already registered') ||
      message.includes('already been registered') ||
      message.includes('user already exists')
    ) {
      return 'If this email can be registered, a confirmation message will be sent. You can also try signing in.';
    }
    return 'Registration could not be completed. Check your details and try again.';
  }

  if (context === 'signin') {
    if (message.includes('access denied') || message.includes('required role')) {
      return 'This portal is reserved for authorized accounts. Signing in here does not grant extra permissions.';
    }
    return 'Unable to sign in. Check your email, password, and that you are using the correct portal.';
  }

  if (context === 'reset') {
    return 'The password could not be updated. The reset link may have expired. Request a new one.';
  }

  return 'Something went wrong. Please try again.';
}
