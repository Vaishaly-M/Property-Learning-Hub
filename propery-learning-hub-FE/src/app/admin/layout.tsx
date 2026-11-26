'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const { admin, isInitialized } = useAdminAuth(); // ← use isInitialized consistently
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialized) return;
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      router.replace('/login');
    }
  }, [admin, isInitialized, router]);

  const getPageTitle = () => {
    if (pathname.includes('/crm'))              return 'CRM';
    if (pathname.includes('/users'))          return 'User Management';
    if (pathname.includes('/content'))        return 'Course Management';
    if (pathname.includes('/webinars'))       return 'Host Webinar';
    if (pathname.includes('/sessions'))       return 'Meetings';
    if (pathname.includes('/deal-review')) return 'Deal Review';
    if (pathname.includes('/deal-analyzer')) return 'Deal Analyzer';
    if (pathname.includes('/deal-marketplace') || pathname.includes('/deals')) return 'Deal Marketplace';
    if (pathname.includes('/analytics'))      return 'Analytics';
    if (pathname.includes('/business-journal'))      return 'Business Journal';
    if (pathname.includes('/chat'))           return 'Chat';
    if (pathname.includes('/permissions'))    return 'Roles & Permissions';
    if (pathname.includes('/weekly-report'))    return 'Weekly Progress';
    if (pathname.includes('/communications')) return 'Announcement';
    if (pathname.includes('/subscriptions'))  return 'Subscriptions & Payments';
    if (pathname.includes('/training-agreements')) return 'Training Agreements';
    if (pathname.includes('/support-inquiries')) return 'Support Inquiries';
    if (pathname.includes('/profile'))        return 'Profile';
    return 'Dashboard';
  };

  // Block render until auth is confirmed
  if (!isInitialized || !admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) return null;

  return (
    <AdminLayout pageTitle={getPageTitle()} role="admin">
      {children}
    </AdminLayout>
  );
}