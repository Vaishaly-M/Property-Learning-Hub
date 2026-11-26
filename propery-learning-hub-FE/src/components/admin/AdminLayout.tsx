//app/components/admin/AdminLayout.tsx
'use client';

import React, { ReactNode, useState } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import {
  Dashboard as DashboardIcon,
  People,
  OndemandVideo,
  TrendingUp,
  Storefront,
  Analytics,
  Email,
  Settings,
  CreditCard,
  CalendarToday,
  Videocam,
  Contacts,
  Campaign,
  ExitToApp,
  Close,
  Calculate,
  HelpOutline,
  Assessment,
} from '@mui/icons-material';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useAdminAuth } from '../../context/AdminAuthContext'; // ← import context
import chatService from '../../services/chatService';
import { BookOpen } from 'lucide-react';
import { SupportModal } from '../auth/SupportModal';

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle: string;
  role?: 'admin' | 'instructor';
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  pageTitle,
  role = 'admin',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const { admin, logout } = useAdminAuth(); // ← real user data + logout
  const pathname = usePathname();
  const unreadCountRef = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const adminNavItems = [
    { icon: <DashboardIcon />, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: <Email />, label: 'Chat', path: '/admin/chat' },
    { icon: <BookOpen />, label: 'Business Journal', path: '/admin/business-journal' },
    { icon: <OndemandVideo />, label: 'Course Management', path: '/admin/content' },
    { icon: <CalendarToday />, label: 'Meetings', path: '/admin/sessions' },
    { icon: <Storefront />, label: 'Deal Marketplace', path: '/admin/deal-marketplace' },
    { icon: <TrendingUp />, label: 'Deal Review', path: '/admin/deal-review' },
    { icon: <Calculate />, label: 'Deal Analyzer', path: '/admin/deal-analyzer' },
    { icon: <Campaign />, label: 'Announcement', path: '/admin/communications' },
    { icon: <People />, label: 'User Management', path: '/admin/users' },
    { icon: <Analytics />, label: 'Analytics', path: '/admin/analytics' },
    { icon: <Settings />, label: 'Roles & Permissions', path: '/admin/permissions' }, 
    { icon: <Assessment />,    label: 'Weekly-Report',            path: '/admin/weekly-report' },
    { icon: <CreditCard />, label: 'Subscriptions & Payments', path: '/admin/subscriptions' },
    { icon: <Settings />, label: 'Profile', path: '/admin/profile' },
    { icon: <HelpOutline />, label: 'Help & Support', path: 'support_modal' },
    { icon: <CreditCard />, label: 'Training Agreements', path: '/admin/training-agreements' },
    { icon: <Videocam />, label: 'Host Webinar', path: '/admin/webinars' },
    { icon: <Contacts />, label: 'CRM', path: '/admin/crm' },
    { icon: <HelpOutline />, label: 'Support Inquiries', path: '/admin/support-inquiries' },
  ];

  const instructorNavItems = [
    { icon: <DashboardIcon />, label: 'Dashboard', path: '/instructor/dashboard' },
    { icon: <Email />, label: 'Chat', path: '/instructor/chat' },
    { icon: <BookOpen />, label: 'Business Journal', path: '/instructor/business-journal' },
    { icon: <OndemandVideo />, label: 'Course Management', path: '/instructor/content' },
    { icon: <CalendarToday />, label: 'Meetings', path: '/instructor/meetings' },
    { icon: <Videocam />, label: 'Host Webinar', path: '/instructor/webinars' },
    { icon: <Storefront />, label: 'Deal Marketplace', path: '/instructor/deal-marketplace' },
    { icon: <Calculate />, label: 'Deal Analyzer', path: '/instructor/deal-analyzer' },
    { icon: <CreditCard />, label: 'Subscriptions', path: '/instructor/subscriptions' },
    { icon: <Settings />, label: 'Profile', path: '/instructor/profile' },
    { icon: <HelpOutline />, label: 'Help & Support', path: 'support_modal' },
    { icon: <CalendarToday />, label: 'Book Admin Session', path: '/dashboard/book-meeting' },
    { icon: <Videocam />, label: 'My Admin Sessions', path: '/dashboard/my-meetings' },
  ];

  useEffect(() => {
    let mounted = true;

    const loadUnread = async () => {
      try {
        const chats = await chatService.getChats();
        const totalUnread = chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);

        if (!mounted) return;
        setUnreadCount(totalUnread);

        const wasUnread = unreadCountRef.current;
        const isChatPage = pathname.includes('/chat');
        if (!isChatPage && totalUnread > wasUnread) {
          toast('New chat message received');
        }
        unreadCountRef.current = totalUnread;
      } catch {
        // Ignore polling errors on pages/users without chat access.
      }
    };

    loadUnread();
    const timer = setInterval(loadUnread, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pathname]);

  const navItems = useMemo(() => {
    const items = role === 'instructor' ? instructorNavItems : adminNavItems;
    return items.map((item) => ({
      ...item,
      hasNotification: item.label === 'Chat' && unreadCount > 0,
    }));
  }, [role, unreadCount]);
  const portalTitle = role === 'instructor' ? 'Instructor Portal' : 'Admin Portal';

  // ← Real user data from context instead of hardcoded strings
  const user = {
    name: admin ? `${admin.first_name} ${admin.last_name}` : '',
    role: role === 'instructor' ? 'Instructor' : 'Administrator',
    email: admin?.email ?? '',
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div className="flex h-screen min-h-0 bg-slate-50 font-sans overflow-hidden">
      <AdminSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        navItems={navItems}
        currentPage={pageTitle}
        portalTitle={portalTitle}
        user={user}
        onLogout={handleLogoutClick}
        showActiveFeatures={role !== 'instructor'}
        onNavigate={(path) => {
          if (path === 'support_modal') {
            setIsSupportOpen(true);
          } else {
            window.location.assign(path);
          }
        }}
      />
      <div className={`flex-1 min-h-0 transition-all ${pathname?.includes('/deal-analyzer') ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
        <main className={`p-8 ${pathname?.includes('/deal-analyzer') ? 'flex flex-col flex-1 min-h-0' : ''}`}>{children}</main>
      </div>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultCategory="other"
        defaultEmail={user.email}
      />

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10000]"
          onClick={() => {
            if (!isLoggingOut) setShowLogoutConfirm(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-logout-confirm-title"
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-5 border-b border-slate-200">
              <h3 id="admin-logout-confirm-title" className="text-lg font-semibold text-slate-800">
                Log out?
              </h3>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
              >
                <Close className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">
                Are you sure you want to logout? You will need to sign in again to access your account.
              </p>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 bg-red-600 hover:bg-red-700"
              >
                {isLoggingOut ? 'Please wait...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;