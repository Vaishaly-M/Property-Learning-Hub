//components/landing/PublicChrome.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Header from './header';
import Footer from './Footer';
import { useHidePublicChrome } from '../../hooks/useHidePublicChrome';
import {
  isAuthPath,
  isOnboardingPath,
  isPaidInviteOnboardingPath,
  isPublicChromePath,
} from '../../utils/publicRoutes';
import PaidInviteOnboardingShell from '../onboarding/PaidInviteOnboardingShell';
import { PAID_INVITE_ONBOARDING_KEY } from '@/services/paidInviteService';

/** Wraps page content with public header/footer for guests; hidden after login on app routes. */
export default function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hide = useHidePublicChrome();
  const forcePublicChrome = isPublicChromePath(pathname);
  const [paidInviteOnboarding, setPaidInviteOnboarding] = useState(false);

  useEffect(() => {
    const active =
      typeof window !== 'undefined' &&
      sessionStorage.getItem(PAID_INVITE_ONBOARDING_KEY) === '1' &&
      isPaidInviteOnboardingPath(pathname);
    setPaidInviteOnboarding(active);
  }, [pathname]);

  if (paidInviteOnboarding) {
    return <PaidInviteOnboardingShell>{children}</PaidInviteOnboardingShell>;
  }

  if (isOnboardingPath(pathname)) {
    return <>{children}</>;
  }

  // Marketing/auth pages always get header + footer, even when logged in.
  if (!forcePublicChrome && hide) {
    return <>{children}</>;
  }

  const showHeader = !isAuthPath(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && <Header />}
      <div className={`flex flex-1 flex-col w-full ${showHeader ? 'pt-16' : ''}`}>
        {children}
      </div>
      <Footer />
    </div>
  );
}
