'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  TrendingUp,
  Users,
  Clock,
  Activity,
  Globe,
  Monitor,
  Smartphone,
  Zap,
  MousePointer,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatCard from './StatCard';
import EngagementCard from './EngagementCard';
import PieChartCard from './PieChartCard';
import PageVisitsTable from './PageVisitsTable';
import DateRangeFilter from './DateRangeFilter';
import {
  getGoogleAnalytics,
  fetchClarityData,
  formatTime,
  calculatePercentages,
} from '@/services/googleAnalytics.service';

interface AnalyticsData {
  stats: {
    totalSessions: number;
    botSessions: number;
    distinctUsers: number;
    pagesPerSession: number;
    totalTimeSeconds: number;
    activeTime: number;
    avgScrollDepth: number;
  };
  engagement: {
    deadClicks: number;
    rageClicks: number;
    quickBackClicks: number;
    scriptErrors: number;
  };
  browsers: Array<{ name: string; value: number }>;
  devices: Array<{ name: string; value: number }>;
  operatingSystems: Array<{ name: string; value: number }>;
  countries: Array<{ name: string; value: number }>;
  referrers: Array<{ name: string; value: number }>;
  pageVisits: Array<{ url: string; visits: number }>;
}

const GoogleAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalyticsData = async (start?: string, end?: string) => {
    try {
      setIsLoading(true);

      const fromDate = start || dateRange.startDate;
      const toDate = end || dateRange.endDate;

      const result = await getGoogleAnalytics(fromDate, toDate, 'custom');

      if (result?.transformed) {
        setAnalyticsData(result.transformed);
        toast.success('Analytics data loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    setDateRange({ startDate: start, endDate: end });
    loadAnalyticsData(start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateChange = (start: string, end: string) => {
    setDateRange({ startDate: start, endDate: end });
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const result = await fetchClarityData();

      if (result?.success) {
        toast.success(result.message || 'Data refreshed successfully');
        await loadAnalyticsData();
      }
    } catch (error: unknown) {
      console.error('Failed to refresh:', error);
      const message = error instanceof Error ? error.message : 'Failed to refresh data';
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="px-1 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Web Traffic & Behavior</h3>
          <p className="text-sm text-slate-500">Complete overview of web traffic and behavior via Microsoft Clarity</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-initial">
            <DateRangeFilter
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={handleDateChange}
              onApply={() => loadAnalyticsData()}
            />
          </div>
          <button
            onClick={handleRefresh}
            className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            disabled={isLoading || isRefreshing}
            title="Fetch fresh data from Clarity API"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !analyticsData && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-sm text-slate-500">Loading analytics data...</p>
          </div>
        </div>
      )}

      {!isLoading && !analyticsData && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-sm text-slate-500 mb-4">No analytics data available</p>
            <button
              onClick={() => loadAnalyticsData()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load Data
            </button>
          </div>
        </div>
      )}

      {analyticsData && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Sessions"
              value={analyticsData.stats.totalSessions.toLocaleString()}
              subtitle={`Bot Sessions: ${analyticsData.stats.botSessions.toLocaleString()}`}
              icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
            />
            <StatCard
              title="Distinct Users"
              value={analyticsData.stats.distinctUsers.toLocaleString()}
              subtitle={`${analyticsData.stats.pagesPerSession} Pages/Session`}
              icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
            />
            <StatCard
              title="Total Time"
              value={formatTime(analyticsData.stats.totalTimeSeconds)}
              subtitle={`Active: ${formatTime(analyticsData.stats.activeTime)}`}
              icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />}
            />
            <StatCard
              title="Avg Scroll Depth"
              value={`${analyticsData.stats.avgScrollDepth}%`}
              subtitle="User engagement score"
              icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <PieChartCard title="Browsers" data={calculatePercentages(analyticsData.browsers)} icon={<Globe className="w-4 h-4 sm:w-5 sm:h-5" />} />
            <PieChartCard title="Devices" data={calculatePercentages(analyticsData.devices)} icon={<Monitor className="w-4 h-4 sm:w-5 sm:h-5" />} />
            <PieChartCard title="Operating Systems" data={calculatePercentages(analyticsData.operatingSystems)} icon={<Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />} />
            <PieChartCard title="Top Countries" data={calculatePercentages(analyticsData.countries)} icon={<Globe className="w-4 h-4 sm:w-5 sm:h-5" />} />
          </div>

          <div className="mb-6">
            <PieChartCard title="Top Referrers" data={calculatePercentages(analyticsData.referrers)} icon={<TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />} />
          </div>

          <PageVisitsTable data={analyticsData.pageVisits} />
        </>
      )}
    </div>
  );
};

export default GoogleAnalyticsDashboard;
