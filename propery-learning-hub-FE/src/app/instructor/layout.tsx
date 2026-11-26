//app/instructor/layout.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function InstructorRootLayout({ children }: { children: React.ReactNode }) {
  const { admin, isInitialized } = useAdminAuth();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialized) return;
    if (!admin || admin.role !== 'instructor') {
      router.replace('/login');
    }
  }, [admin, isInitialized, router]);

  const getPageTitle = () => {
    if (pathname.includes('/calendar'))       return 'Microsoft Calendar';
    if (pathname.includes('/sessions'))       return 'Mentor Sessions';
    if (pathname.includes('/meetings'))       return 'Meetings';
    if (pathname.includes('/content'))        return 'Course Management';
    if (pathname.includes('/deal-marketplace') || pathname.includes('/deals')) return 'Deal Marketplace';
    if (pathname.includes('/deal-analyzer')) return 'Deal Analyzer';
     if (pathname.includes('/business-journal'))   return 'Business Journal';
    if (pathname.includes('/chat'))           return 'Chat';
    if (pathname.includes('/communications')) return 'Communications';
    if (pathname.includes('/subscriptions'))  return 'Subscriptions';
    if (pathname.includes('/profile'))        return 'Profile';
    return 'Dashboard';
  };

  if (!isInitialized || !admin || admin.role !== 'instructor') return null;

  return (
    <AdminLayout pageTitle={getPageTitle()} role="instructor">
      {children}
    </AdminLayout>
  );
}