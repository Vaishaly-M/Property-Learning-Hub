// components/learner/Sidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  VideoLibrary,
  School,
  CalendarToday,
  Handshake,
  Storefront,
  Videocam,
  Chat,
  Notifications,
  Person,
  ChevronLeft,
  ChevronRight,
  Calculate,
  ReceiptLong,
  PeopleAlt,
  Draw,
  CheckCircle,
  Assessment,
} from '@mui/icons-material';
import SidebarBrand from '../shared/SidebarBrand';
import { BookOpen, HelpCircle } from 'lucide-react';
import { SupportModal } from '../auth/SupportModal';
import { dashboardService } from '@/services/dashboardService';
import {
  getFeatureDashboardSsoUrl,
  type InfinitWizardFeatureSlug,
} from '@/utils/feature-dashboard-url';

interface MenuItem {
  icon: React.ReactElement;
  label: string;
  href: string;
}

interface FeatureMenuItem {
  icon: React.ReactElement;
  label: string;
  slug: InfinitWizardFeatureSlug;
}

const mainMenuItems: MenuItem[] = [
  { icon: <VideoLibrary />, label: 'Dashboard', href: '/learn/dashboard' },
  { icon: <Chat />, label: 'Chat', href: '/learn/chat' },
  { icon: <BookOpen />, label: 'Business Journal', href: '/learn/business-journal' },
  { icon: <School />, label: 'Learn', href: '/learn/education' },
  { icon: <CalendarToday />, label: 'Meetings', href: '/learn/meetings' },
   { icon: <Videocam />, label: 'Webinars', href: '/learn/webinars' },
  { icon: <Storefront />, label: 'Deal Marketplace', href: '/learn/deals' },
  { icon: <Handshake />, label: 'Deal Review', href: '/learn/deal-review' },
  { icon: <Calculate />, label: 'Deal Analyzer', href: '/learn/deal-analyzer' },
  { icon: <Notifications />, label: 'Announcements', href: '/learn/announcements' },
  { icon: <Assessment />, label: 'Weekly Progress', href: '/learn/weekly-report' },
   { icon: <Person />, label: 'Profile', href: '/learn/profile' },
];

const infinitWizardFeatures: FeatureMenuItem[] = [
  { icon: <ReceiptLong />, label: 'Invoice', slug: 'invoice' },
  // TEMP: CRM SSO disabled — show Coming soon page instead.
  // To restore live CRM SSO, uncomment the line below and remove the CRM Link block in the nav.
  // { icon: <PeopleAlt />, label: 'CRM', slug: 'crm' },
  { icon: <Draw />, label: 'InfinitDoc', slug: 'docusign' },
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });
  const [featureLoading, setFeatureLoading] = useState<InfinitWizardFeatureSlug | null>(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // Store current route in sessionStorage whenever it changes
  useEffect(() => {
    if (pathname && pathname.startsWith('/learn/') && pathname !== '/learn') {
      sessionStorage.setItem('lastLearnRoute', pathname);
    }
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  /**
   * One click: education SSO → IW Passport token → open feature dashboard SSO URL.
   * Skips landing on the InfinitWizard dashboard first.
   */
  const openFeatureDashboard = async (slug: InfinitWizardFeatureSlug) => {
    if (featureLoading) return;
    setFeatureLoading(slug);
    try {
      const result = await dashboardService.openInfinitWizard();
      const token = String(result.access_token || '').trim();
      if (!token) {
        throw new Error('Missing InfinitWizard login token. Please try again.');
      }
      const url = getFeatureDashboardSsoUrl(slug, token);
      if (!url) {
        throw new Error('Feature dashboard URL is not configured.');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to open feature dashboard.';
      window.alert(message);
    } finally {
      setFeatureLoading(null);
    }
  };

  return (
    <div
      className={`bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full min-h-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand Section */}
      <div
        className={`flex-shrink-0 p-3 border-b border-slate-100 flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {isCollapsed ? (
          <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-md ring-1 ring-black/5 flex-shrink-0">
            <Image
              src="/landingImages/logo.jpeg"
              alt="Freedom Property Academy"
              fill
              className="object-cover"
              sizes="32px"
              priority
            />
          </div>
        ) : (
          <SidebarBrand href="/learn/dashboard" variant="dark" />
        )}

        <button
          onClick={toggleSidebar}
          className={`p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto py-2 overscroll-contain">
        <div className="flex flex-col gap-1">
          {mainMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname === '/learn' && item.href === '/learn/dashboard') ||
              pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full px-6 py-2 flex items-center gap-3 border-none bg-transparent cursor-pointer transition-all text-sm font-medium text-left min-h-[40px] box-border ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 border-l-3 border-blue-900'
                    : 'text-slate-500 hover:bg-slate-50'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <span className="text-xl">{item.icon}</span>
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Help & Support Button — directly below Profile */}
          <button
            type="button"
            onClick={() => setIsSupportOpen(true)}
            className={`w-full px-6 py-2 flex items-center gap-3 border-none bg-transparent cursor-pointer transition-all text-sm font-medium text-left min-h-[40px] box-border text-slate-500 hover:bg-slate-50 ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
            title={isCollapsed ? 'Help & Support' : ''}
          >
            <span className="text-xl">
              <HelpCircle className="h-5 w-5 text-slate-500" />
            </span>
            {!isCollapsed && <span>Help & Support</span>}
          </button>
        </div>

        {/* InfinitWizard product shortcuts — one-click SSO into each feature */}
        <div className={`mt-4 pt-3 border-t border-slate-100 ${isCollapsed ? 'px-1' : 'px-3'}`}>
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Active Features
            </p>
          )}
          <div className="flex flex-col gap-1">
            {/* TEMP: CRM → Coming soon. Restore SSO by uncommenting CRM in infinitWizardFeatures above and deleting this Link. */}
            <Link
              href="/learn/crm"
              className={`w-full flex items-center gap-3 rounded-lg border border-transparent text-sm font-medium text-left min-h-[40px] transition-all ${
                isCollapsed
                  ? 'justify-center px-0 py-2'
                  : 'justify-between px-3 py-2'
              } ${
                pathname === '/learn/crm' || pathname?.startsWith('/learn/crm/')
                  ? 'bg-blue-50 text-blue-900 border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:border-slate-200'
              }`}
              title={isCollapsed ? 'CRM' : 'CRM — Coming soon'}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-xl text-slate-500">
                  <PeopleAlt />
                </span>
                {!isCollapsed && <span className="truncate">CRM</span>}
              </span>
              {!isCollapsed && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 flex-shrink-0">
                  Soon
                </span>
              )}
            </Link>

            {infinitWizardFeatures.map((item) => {
              const isBusy = featureLoading === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => openFeatureDashboard(item.slug)}
                  disabled={!!featureLoading}
                  className={`w-full flex items-center gap-3 rounded-lg border border-transparent text-sm font-medium text-left min-h-[40px] transition-all disabled:opacity-60 ${
                    isCollapsed
                      ? 'justify-center px-0 py-2'
                      : 'justify-between px-3 py-2'
                  } text-slate-600 hover:bg-slate-50 hover:border-slate-200 ${
                    isBusy ? 'bg-slate-50 border-slate-200' : ''
                  }`}
                  title={
                    isCollapsed
                      ? `Open ${item.label}`
                      : `Open ${item.label} (signed in automatically)`
                  }
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="text-xl text-slate-500">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="truncate">
                        {isBusy ? 'Opening…' : item.label}
                      </span>
                    )}
                  </span>
                  {!isCollapsed && (
                    <CheckCircle
                      className="text-green-500 flex-shrink-0"
                      style={{ fontSize: 18 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        defaultCategory="other"
      />
    </div>
  );
};

export default Sidebar;
