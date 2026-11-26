'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dashboard as DashboardIcon,
  People,
  Videocam,
  Event,
  Email,
  CardMembership,
  School,
} from '@mui/icons-material';

const crmNav = [
  { label: 'Dashboard', path: '/admin/crm', icon: <DashboardIcon className="w-4 h-4" />, exact: true },
  { label: 'Contacts', path: '/admin/crm/contacts', icon: <People className="w-4 h-4" /> },
  { label: 'Memberships', path: '/admin/crm/memberships', icon: <CardMembership className="w-4 h-4" /> },
  { label: 'Courses', path: '/admin/crm/courses', icon: <School className="w-4 h-4" /> },
  { label: 'Webinars', path: '/admin/crm/webinars', icon: <Videocam className="w-4 h-4" /> },
  { label: 'Events', path: '/admin/crm/events', icon: <Event className="w-4 h-4" /> },
  { label: 'Communications', path: '/admin/crm/communications', icon: <Email className="w-4 h-4" /> },
];

interface CrmLayoutProps {
  children: ReactNode;
  pageTitle: string;
  actions?: ReactNode;
}

const CrmLayout: React.FC<CrmLayoutProps> = ({ children, pageTitle, actions }) => {
  const pathname = usePathname();

  const isActive = (item: typeof crmNav[0]) => {
    if (item.exact) return pathname === item.path;
    return pathname === item.path || pathname.startsWith(item.path + '/');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Freedom Property Academy CRM</h1>
        </div>
        {actions}
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {crmNav.map((item) => (
          <a
            key={item.path}
            href={item.path}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive(item)
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-blue-600'
            }`}
          >
            {item.icon}
            {item.label}
          </a>
        ))}
      </nav>

      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">{pageTitle}</h2>
        {children}
      </div>
    </div>
  );
};

export default CrmLayout;
