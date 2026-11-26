//app/components/admin/AdminDashboard.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  People, OndemandVideo, Description, TrendingUp,
  Analytics, Email, ArrowUpward, ArrowDownward,
  PlayCircle, BusinessCenter, LocationOn, MoreVert, Visibility,
} from '@mui/icons-material';
import adminDashboardService, { DashboardData, TopContentItem } from '../../services/adminDashboardService';

const ADMIN_OPEN_CONTENT_KEY = 'admin_open_content';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

const AdminDashboard: React.FC = () => {
  const router      = useRouter();
  const { admin }   = useAdminAuth();
  const isInstructor = admin?.role === 'instructor';

  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [range, setRange]     = useState<'7days' | '30days' | '90days' | '1year'>('30days');
  const [openDealMenuId, setOpenDealMenuId] = useState<number | string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [range]);

  useEffect(() => {
    if (openDealMenuId === null) return;

    const closeMenu = () => setOpenDealMenuId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [openDealMenuId]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminDashboardService.getDashboard(range);
      if (res.success) setData(res.data);
      else setError('Failed to load dashboard data');
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Paths resolve correctly for both roles
  const basePath = isInstructor ? '/instructor' : '/admin';

  const formatDealPrice = (price: string | number | null | undefined) => {
    if (price == null || price === '') return '—';
    if (typeof price === 'string') {
      const trimmed = price.trim();
      const normalized = trimmed.replace(/^\$+/, '£');
      if (normalized.startsWith('£')) return normalized;
      const num = Number(normalized.replace(/[^0-9.-]/g, ''));
      if (!Number.isFinite(num)) return normalized;
      return `£${num.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
    }
    return `£${price.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  };

  const openDealEditor = (dealId: number | string) => {
    setOpenDealMenuId(null);
    router.push(`${basePath}/deal-marketplace?edit=${dealId}`);
  };
  const openContentItem = (item: TopContentItem) => {
    sessionStorage.setItem(
      'admin_open_content',
      JSON.stringify({
        id: String(item.id),
        courseId: item.course_id ? String(item.course_id) : null,
        type: item.type,
      })
    );
    router.push(`${basePath}/content`);
  };

  const statsCards = data
    ? [
        {
          icon:     <People className="text-blue-500" />,
          value:    data.stats.total_users.value.toLocaleString(),
          label:    isInstructor ? 'My Students' : 'Total Users',
          bgColor:  'bg-blue-50',
          onClick:  () => router.push(isInstructor ? `${basePath}/dashboard` : `${basePath}/users`),
        },
        {
          icon:    <OndemandVideo className="text-emerald-500" />,
          value:   data.stats.video_content.value.toLocaleString(),
          label:   'Video Content',
          bgColor: 'bg-emerald-50',
          onClick: () => router.push(`${basePath}/content`),
        },
        {
          icon:    <Description className="text-amber-500" />,
          value:   data.stats.documents.value.toLocaleString(),
          label:   'Documents',
          bgColor: 'bg-amber-50',
          onClick: () => router.push(`${basePath}/content`),
        },
        {
          icon:    <TrendingUp className="text-purple-500" />,
          value:   data.stats.active_deals.value.toLocaleString(),
          label:   'Active Deals',
          bgColor: 'bg-purple-50',
          onClick: () => router.push(`${basePath}/deal-marketplace`),
        },
      ]
    : [];

  const keyMetrics = data
    ? [
        { label: 'Active Courses',  value: data.key_metrics.active_courses.toString() },
        { label: 'New Users (24h)', value: data.key_metrics.new_users_24h.toString() },
        { label: 'Active Deals',    value: data.key_metrics.active_deals.toString() },
      ]
    : [];

  const quickActions = [
    {
      icon:        <OndemandVideo />,
      label:       'Add New Video',
      color:       'text-blue-500',
      bgColor:     'bg-blue-50',
      borderColor: 'border-blue-300',
      onClick:     () => router.push(`${basePath}/content`),
    },
    {
      icon:        <Description />,
      label:       'Upload Document',
      color:       'text-emerald-500',
      bgColor:     'bg-emerald-50',
      borderColor: 'border-emerald-300',
      onClick:     () => router.push(`${basePath}/content`),
    },
    {
      icon:        <Email />,
      label:       'Send Announcement',
      color:       'text-amber-500',
      bgColor:     'bg-amber-50',
      borderColor: 'border-amber-300',
      onClick:     () => router.push(`${basePath}/communications`),
    },
    {
      icon:        <Analytics />,
      label:       'View Reports',
      color:       'text-purple-500',
      bgColor:     'bg-purple-50',
      borderColor: 'border-purple-300',
      onClick:     () => router.push(`${basePath}/analytics`),
    },
  ];

  return (
    <div className="px-1 sm:px-4 md:px-6 py-4 sm:py-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back{admin ? `, ${admin.first_name}` : ''}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening with your {isInstructor ? 'courses' : 'platform'} today.
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as typeof range)}
          className="px-4 py-2 text-sm border text-gray-600 border-slate-300 rounded-lg bg-white focus:border-blue-500 outline-none"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="1year">Last year</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={loadDashboard} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
                <Skeleton className="w-12 h-12 mb-4" />
                <Skeleton className="w-24 h-7 mb-2" />
                <Skeleton className="w-20 h-4" />
              </div>
            ))
          : statsCards.map((stat, i) => (
              <div
                key={i}
                onClick={stat.onClick}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200"
              >
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
                <p className="text-sm text-slate-500 font-medium mt-1">{stat.label}</p>
              </div>
            ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Key Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-7">
          <h3 className="text-lg font-bold text-slate-800 mb-5">Key Metrics</h3>
          {loading
            ? Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-100">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-12 h-4" />
                </div>
              ))
            : keyMetrics.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0"
                >
                  <span className="text-sm text-slate-500">{m.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{m.value}</span>
                </div>
              ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-7">
          <h3 className="text-lg font-bold text-slate-800 mb-5">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`${action.bgColor} ${action.borderColor} ${action.color} border rounded-xl p-4 font-semibold text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col items-center gap-2`}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Top Performing Content */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-800">Top Performing Content</h3>
            <button
              onClick={() => router.push(`${basePath}/content`)}
              className="text-blue-500 text-sm font-semibold hover:text-blue-600"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4">
                  <Skeleton className="w-full h-5 mb-3" />
                  <Skeleton className="w-full h-4 mb-2" />
                  <Skeleton className="w-16 h-4" />
                </div>
              ))}
            </div>
          ) : data?.top_content.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No content yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data?.top_content.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {item.type === 'video'
                        ? <PlayCircle className="text-blue-500" />
                        : <Description className="text-amber-500" />}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        item.type === 'video'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.type === 'video' ? 'Video' : 'Doc'}
                      </span>
                    </div>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                      item.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {item.trend === 'up'
                        ? <ArrowUpward style={{ fontSize: 12 }} />
                        : <ArrowDownward style={{ fontSize: 12 }} />}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2">{item.title}</p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Visibility style={{ fontSize: 12 }} />
                      {item.views > 999 ? `${(item.views / 1000).toFixed(1)}k` : item.views}
                    </span>
                    <button
                      onClick={() => {
                        sessionStorage.setItem(
                          ADMIN_OPEN_CONTENT_KEY,
                          JSON.stringify({
                            id: String(item.id),
                            courseId: item.course_id ? String(item.course_id) : null,
                            type: item.type,
                            view: true,
                          })
                        );
                        router.push(`${basePath}/content`);
                      }}
                      className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded px-3 py-1 hover:bg-blue-100"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Deals */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-7">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-800">Recent Deals</h3>
            <button
              onClick={() => router.push(`${basePath}/deal-marketplace`)}
              className="text-blue-500 text-sm font-semibold hover:text-blue-600"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-lg p-4">
                  <Skeleton className="w-full h-5 mb-3" />
                  <Skeleton className="w-32 h-4 mb-2" />
                  <Skeleton className="w-20 h-6" />
                </div>
              ))}
            </div>
          ) : data?.recent_deals.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No published deals yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.recent_deals.map((deal) => (
                <div
                  key={deal.id}
                  className="relative bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-800 flex-1 pr-2 line-clamp-2">
                      {deal.title}
                    </p>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDealMenuId((prev) => (prev === deal.id ? null : deal.id));
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200/80"
                        title="Deal options"
                        aria-haspopup="menu"
                        aria-expanded={openDealMenuId === deal.id}
                      >
                        <MoreVert style={{ fontSize: 16 }} />
                      </button>
                      {openDealMenuId === deal.id && (
                        <div
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-20 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => openDealEditor(deal.id)}
                          >
                            Manage deal
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                              setOpenDealMenuId(null);
                              router.push(`${basePath}/deal-marketplace`);
                            }}
                          >
                            Open marketplace
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                    <LocationOn style={{ fontSize: 12 }} />
                    <span className="truncate">{deal.location}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold text-blue-900">
                      {formatDealPrice(deal.price)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Visibility style={{ fontSize: 12 }} />
                      {deal.views}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDealEditor(deal.id)}
                    className="w-full bg-blue-500 text-white text-sm font-semibold rounded-lg py-2 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <BusinessCenter style={{ fontSize: 14 }} />
                    Manage
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;