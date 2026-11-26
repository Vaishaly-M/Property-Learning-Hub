'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp,
  People,
  OndemandVideo,
  Visibility,
  Download,
  Download as DownloadIcon,
  Refresh,
  Contacts,
  CardMembership,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import analyticsService, { AnalyticsData } from '../../services/analyticsService';

const timeRanges = [
  { key: '7d' as const, label: '7D' },
  { key: '30d' as const, label: '30D' },
  { key: '90d' as const, label: '90D' },
  { key: '1y' as const, label: '1Y' },
];

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await analyticsService.getAnalytics(timeRange));
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!data) return;
    analyticsService.exportCsv(data);
    toast.success('Report exported');
  };

  const engagementGradient = data?.content_engagement
    .filter((s) => s.percentage > 0)
    .reduce((acc, slice, i, arr) => {
      const start = arr.slice(0, i).reduce((sum, s) => sum + s.percentage, 0);
      const end = start + slice.percentage;
      return acc + `${slice.color} ${start}% ${end}%${i < arr.length - 1 ? ', ' : ''}`;
    }, '') || '#e2e8f0 0% 100%';

  const statCards = data ? [
    { label: 'Active Users', ...data.stats.active_users, icon: <People className="text-blue-500" />, bgColor: 'bg-blue-50' },
    { label: 'Content Views', ...data.stats.content_views, icon: <Visibility className="text-green-500" />, bgColor: 'bg-green-50' },
    { label: 'Video Watch Time', ...data.stats.video_watch_time, icon: <OndemandVideo className="text-amber-500" />, bgColor: 'bg-amber-50' },
    { label: 'Document Downloads', ...data.stats.document_downloads, icon: <Download className="text-violet-500" />, bgColor: 'bg-violet-50' },
  ] : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Analytics Dashboard</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="bg-slate-100 rounded-lg p-1 flex gap-1 justify-center sm:justify-start">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                  timeRange === range.key ? 'bg-white text-blue-500 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 border rounded-lg text-slate-500 hover:text-blue-600" title="Refresh">
            <Refresh className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            disabled={!data}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : !data ? (
          <p className="text-center py-20 text-slate-400">Unable to load analytics data</p>
        ) : (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-8">
              {statCards.map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                    {stat.icon}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 font-medium mb-1">{stat.label}</div>
                  <div className="text-lg sm:text-2xl font-bold text-slate-800 mb-1">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                  
                </div>
              ))}
            </div>

            {/* CRM summary */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">CRM Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Total Contacts', value: data.crm_summary.total_contacts, icon: <Contacts className="w-4 h-4 text-blue-500" /> },
                  { label: 'New Contacts', value: data.crm_summary.new_contacts, icon: <People className="w-4 h-4 text-green-500" /> },
                  { label: 'Active Members', value: data.crm_summary.active_memberships, icon: <CardMembership className="w-4 h-4 text-purple-500" /> },
                  { label: 'Leads', value: data.crm_summary.leads, icon: <TrendingUp className="w-4 h-4 text-amber-500" /> },
                  { label: 'Course Sales', value: data.crm_summary.course_sales, icon: <OndemandVideo className="w-4 h-4 text-teal-500" /> },
                  { label: 'Revenue', value: `£${data.crm_summary.total_revenue.toLocaleString()}`, icon: <TrendingUp className="w-4 h-4 text-rose-500" /> },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
                    <div className="mb-2">{item.icon}</div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className="text-lg font-bold text-slate-800">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">User Growth</h3>
                <div className="h-56 sm:h-64">
                  {data.user_growth.length > 0 ? (
                    <div className="h-full flex items-end gap-1 px-1 overflow-x-auto">
                      {data.user_growth.map((point, index) => {
                        const maxValue = Math.max(...data.user_growth.map(p => p.count));
                        const heightPercent = maxValue > 0 ? (point.count / maxValue) * 85 : 0;
                        
                        return (
                          <div key={index} className="flex-1 min-w-[30px] flex flex-col items-center gap-1 h-full justify-end">
                            <div
                              className="w-full bg-blue-500 rounded-t transition-all"
                              style={{ 
                                height: `${Math.max(heightPercent, 4)}%`,
                                opacity: 0.6 + (index * 0.05)
                              }}
                              title={`${point.label}: ${point.count}`}
                            />
                            <span className="text-[10px] text-slate-400 truncate w-full text-center">{point.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">No growth data</div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">Content Engagement</h3>
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="w-36 h-36 sm:w-44 sm:h-44 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(${engagementGradient})` }}
                  />
                  <div className="w-full space-y-2">
                    {data.content_engagement.filter((s) => s.value > 0).map((slice) => (
                      <div key={slice.label} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: slice.color }} />
                          <span className="text-slate-600">{slice.label}</span>
                        </div>
                        <span className="font-medium">{slice.value.toLocaleString()} ({slice.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">Top Performing Content</h3>
                {data.top_content.length === 0 ? (
                  <p className="text-center py-8 text-slate-400">No published content yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead className="border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600">Content</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600">Type</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600">Views</th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-slate-600">Completion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.top_content.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 font-medium text-sm text-slate-800 max-w-[200px] truncate">{item.title}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                item.type === 'Video' ? 'bg-blue-50 text-blue-800' : 'bg-violet-50 text-violet-800'
                              }`}>{item.type}</span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-sm">{item.views.toLocaleString()}</td>
                            <td className="py-2 px-3">
                              <div className="text-sm mb-1">{item.completion}%</div>
                              <div className="h-1.5 bg-slate-200 rounded overflow-hidden w-20">
                                <div
                                  className={`h-full rounded ${item.completion > 70 ? 'bg-green-500' : item.completion > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${item.completion}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4">User Activity</h3>
                <div className="space-y-1">
                  {data.user_activity.map((item, index) => (
                    <div key={item.metric} className={`p-3 ${index < data.user_activity.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-slate-500">{item.metric}</div>
                          <div className="text-base font-bold text-slate-800">
                            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                          </div>
                        </div>
                       
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;