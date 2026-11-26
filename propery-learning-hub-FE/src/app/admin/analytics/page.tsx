'use client';

import { useState } from 'react';
import AnalyticsDashboard from '../../../components/admin/AnalyticsDashboard';
import GoogleAnalyticsDashboard from '../../../components/google-analytics/GoogleAnalyticsDashboard';
import { useAdminAuth } from '../../../context/AdminAuthContext';

const tabs = [
  { id: 'platform', label: 'Platform Analytics', description: 'Users, content, CRM performance' },
  { id: 'web-traffic', label: 'Google Analytics', description: 'Complete overview of web traffic and behavior' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function AnalyticsPage() {
  const { admin } = useAdminAuth();
  const isPlatformAdmin = admin?.role === 'admin' || admin?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<TabId>('platform');
  const visibleTabs = isPlatformAdmin ? tabs : tabs.filter((tab) => tab.id === 'platform');
  const currentTab = visibleTabs.find((t) => t.id === activeTab) ?? visibleTabs[0];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">{currentTab.label}</h2>
        <p className="text-sm text-slate-500 mt-1">{currentTab.description}</p>

        {visibleTabs.length > 1 && (
          <div className="mt-4 bg-slate-100 rounded-lg p-1 flex gap-1 w-full sm:w-auto">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'platform' && <AnalyticsDashboard />}
      {activeTab === 'web-traffic' && isPlatformAdmin && <GoogleAnalyticsDashboard />}
    </div>
  );
}
