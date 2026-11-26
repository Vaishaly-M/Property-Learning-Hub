'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import paidInviteService, {
  PAID_INVITE_ONBOARDING_KEY,
} from '@/services/paidInviteService';

export type PaidInviteOnboardingStep =
  | 'details'
  | 'agreement'
  | 'payment'
  | 'password'
  | 'verify'
  | 'profile'
  | 'dashboard';

export const PAID_INVITE_STEPS: {
  id: PaidInviteOnboardingStep;
  label: string;
}[] = [
  { id: 'details', label: 'Your details' },
  { id: 'agreement', label: 'Agreement' },
  { id: 'payment', label: 'Payment' },
  { id: 'password', label: 'Set password' },
  { id: 'verify', label: 'Verify email' },
  { id: 'profile', label: 'Your profile' },
  { id: 'dashboard', label: 'Dashboard' },
];

function stepFromPathname(pathname: string): PaidInviteOnboardingStep {
  if (pathname.startsWith('/learn')) return 'dashboard';
  if (pathname.startsWith('/profile/learner')) return 'profile';
  if (pathname.startsWith('/verify-email')) return 'verify';
  if (pathname.startsWith('/payment-success')) return 'password';
  if (pathname.startsWith('/payment')) return 'payment';
  if (pathname.startsWith('/agreement')) return 'details';
  if (pathname.startsWith('/join')) return 'details';
  return 'details';
}

export function usePaidInviteOnboarding() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const check = () => {
      const onboarding =
        sessionStorage.getItem(PAID_INVITE_ONBOARDING_KEY) === '1' &&
        !!paidInviteService.getInviteToken();
      setActive(onboarding);
    };
    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, [pathname]);

  const currentStep = stepFromPathname(pathname);
  const currentIndex = PAID_INVITE_STEPS.findIndex((s) => s.id === currentStep);

  return {
    active,
    currentStep,
    currentIndex: currentIndex >= 0 ? currentIndex : 0,
    steps: PAID_INVITE_STEPS,
  };
}
