'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  Menu as MenuIcon,
  Logout,
  Person,
  ReceiptLong,
  PeopleAlt,
  Draw,
  CheckCircle,
} from '@mui/icons-material';
import SidebarBrand from '../shared/SidebarBrand';
import { infinitWizardService } from '@/services/infinitWizardService';
import {
  getFeatureDashboardSsoUrl,
  type InfinitWizardFeatureSlug,
} from '@/utils/feature-dashboard-url';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  hasNotification?: boolean;
}

interface FeatureMenuItem {
  icon: React.ReactElement;
  label: string;
  slug: InfinitWizardFeatureSlug;
}

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  navItems: NavItem[];
  currentPage: string;
  portalTitle?: string;
  user: { name: string; role: string; email: string };
  onLogout: () => void;
  onNavigate: (path: string) => void;
  /** Show InfinitWizard Active Features SSO (admin only; instructor sidebar hides this). */
  showActiveFeatures?: boolean;
}

const infinitWizardFeatures: FeatureMenuItem[] = [
  { icon: <ReceiptLong />, label: 'Invoice', slug: 'invoice' },
  { icon: <Draw />, label: 'InfinitDoc', slug: 'docusign' },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen,
  onToggle,
  navItems,
  currentPage,
  portalTitle = 'Admin Portal',
  user,
  onLogout,
  onNavigate,
  showActiveFeatures = true,
}) => {
  const [featureLoading, setFeatureLoading] = useState<InfinitWizardFeatureSlug | null>(null);

  const handleUserClick = () => {
    onNavigate('/admin/profile');
  };

  /**
   * One click: education SSO → IW Passport token → open feature dashboard SSO URL.
   */
  const openFeatureDashboard = async (slug: InfinitWizardFeatureSlug) => {
    if (featureLoading) return;
    setFeatureLoading(slug);
    try {
      const result = await infinitWizardService.openAsAdmin();
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
    <div className={`
      flex flex-col h-full min-h-0 flex-shrink-0 bg-blue-900 text-white transition-all duration-300
      ${isOpen ? 'w-80' : 'w-18'}
    `}>
      {/* Header */}
      <div className={`
        flex-shrink-0 p-4 border-b border-blue-700 flex items-center gap-2
        ${isOpen ? 'justify-between' : 'justify-center flex-col'}
      `}>
        <SidebarBrand
          showText={isOpen}
          variant="light"
          subtitle={isOpen ? portalTitle : undefined}
          href="/admin/dashboard"
          className={isOpen ? 'flex-1 min-w-0' : ''}
        />
        <button
          onClick={onToggle}
          className="p-2 text-white hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
        >
          {isOpen ? <ChevronLeft className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-5 overscroll-contain">
        {navItems.map((item) => {
          const isActive = currentPage === item.label;
          return (
            <div
              key={item.label}
              onClick={() => onNavigate(item.path)}
              className={`
                relative flex items-center px-5 py-3.5 cursor-pointer transition-colors border-l-4
                ${isActive
                  ? 'bg-blue-800 text-white border-blue-500'
                  : 'border-transparent text-white hover:bg-blue-700'}
                ${isOpen ? 'gap-3' : 'justify-center'}
              `}
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {item.icon}
              </div>
              {isOpen && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                  {item.hasNotification && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                </div>
              )}
              {!isOpen && item.hasNotification && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute ml-4 -mt-4" />
              )}
            </div>
          );
        })}

        {showActiveFeatures && (
          <div className={`mt-4 pt-3 border-t border-blue-700 ${isOpen ? 'px-3' : 'px-1'}`}>
            {isOpen && (
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                Active Features
              </p>
            )}
            <div className="flex flex-col gap-1">
              {/* CRM SSO coming soon (matches learner) */}
              <div
                className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium min-h-[40px] text-blue-100/80 ${
                  isOpen ? 'justify-between px-3 py-2' : 'justify-center px-0 py-2'
                }`}
                title={isOpen ? 'CRM — Coming soon' : 'CRM'}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">
                    <PeopleAlt fontSize="inherit" />
                  </span>
                  {isOpen && <span className="truncate">CRM</span>}
                </span>
                {isOpen && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400 flex-shrink-0">
                    Soon
                  </span>
                )}
              </div>

              {infinitWizardFeatures.map((item) => {
                const isBusy = featureLoading === item.slug;
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => openFeatureDashboard(item.slug)}
                    disabled={!!featureLoading}
                    className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium text-left min-h-[40px] transition-all disabled:opacity-60 text-white hover:bg-blue-700 ${
                      isOpen ? 'justify-between px-3 py-2' : 'justify-center px-0 py-2'
                    } ${isBusy ? 'bg-blue-800' : ''}`}
                    title={
                      isOpen
                        ? `Open ${item.label} (signed in automatically)`
                        : `Open ${item.label}`
                    }
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">{item.icon}</span>
                      {isOpen && (
                        <span className="truncate">
                          {isBusy ? 'Opening…' : item.label}
                        </span>
                      )}
                    </span>
                    {isOpen && (
                      <CheckCircle
                        className="text-green-400 flex-shrink-0"
                        style={{ fontSize: 18 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Footer - User Profile & Logout */}
      <div className={`
        flex-shrink-0 p-5 border-t border-blue-700 flex items-center
        ${isOpen ? 'gap-3' : 'justify-center'}
      `}>
        <div
          onClick={handleUserClick}
          className={`
            flex items-center gap-3 flex-1 min-w-0 cursor-pointer
            ${!isOpen && 'justify-center p-2'}
          `}
        >
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Person className="w-5 h-5" />
          </div>
          {isOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-white/80 truncate">{user.role}</p>
            </div>
          )}
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-white hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0"
          title="Logout"
        >
          <Logout className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
