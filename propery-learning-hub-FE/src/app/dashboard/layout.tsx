'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, isInitialized } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;
    if (!admin) {
      router.replace('/login');
    }
  }, [admin, isInitialized, router]);

  if (!isInitialized || !admin) return null;

  return <>{children}</>;
}
