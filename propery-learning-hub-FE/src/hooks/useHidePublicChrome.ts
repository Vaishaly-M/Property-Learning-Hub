'use client';

import { usePathname } from 'next/navigation';

function isAppPath(pathname: string): boolean {
  return (
    pathname.startsWith('/learn') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/instructor') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/verify-email')
  );
}

/** Hide landing header/footer only on authenticated app routes. */
export function useHidePublicChrome(): boolean {
  const pathname = usePathname();
  return isAppPath(pathname);
}