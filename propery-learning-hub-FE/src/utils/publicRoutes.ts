/** Paths used only during paid invite onboarding (header/footer hidden). */
export const PAID_INVITE_ONBOARDING_PATHS = [
  '/join',
  '/agreement',
  '/payment',
  '/payment-success',
  '/verify-email',
  '/profile/learner',
] as const;

/** Free invite entry paths — always hide marketing chrome. */
export const ONBOARDING_PATHS = ['/join', '/invite', '/registration-received'] as const;

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  return pathname;
}

export function isPaidInviteOnboardingPath(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  return PAID_INVITE_ONBOARDING_PATHS.some(
    (segment) => path === segment || path.startsWith(`${segment}/`)
  );
}

export function isOnboardingPath(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  return ONBOARDING_PATHS.some(
    (segment) => path === segment || path.startsWith(`${segment}/`)
  );
}

/** Public marketing pages that always show site header/footer, even when logged in. */
export const PUBLIC_MARKETING_PATHS = [
  '/demo',
  '/freesby',
  '/about',
  '/discovery-call',
  '/members',
  '/booking-success',
] as const;

export const AUTH_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
] as const;

export function isPublicMarketingPath(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  if (path === '/') return true;
  return PUBLIC_MARKETING_PATHS.some(
    (segment) => path === segment || path.startsWith(`${segment}/`)
  );
}

export function isAuthPath(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  return AUTH_PATHS.some(
    (segment) => path === segment || path.startsWith(`${segment}/`)
  );
}

export function isAppPath(pathname: string | null | undefined): boolean {
  const path = normalizePathname(pathname);
  return (
    path.startsWith('/learn') ||
    path.startsWith('/admin') ||
    path.startsWith('/instructor') ||
    path.startsWith('/profile') ||
    path.startsWith('/verify-email') ||
    path.startsWith('/dashboard') ||
    path.startsWith('/meetings/manage') ||
    path.startsWith('/auth/')
  );
}

/** Routes that always render PublicChrome header/footer (marketing + auth). */
export function isPublicChromePath(pathname: string | null | undefined): boolean {
  return isPublicMarketingPath(pathname) || isAuthPath(pathname);
}
