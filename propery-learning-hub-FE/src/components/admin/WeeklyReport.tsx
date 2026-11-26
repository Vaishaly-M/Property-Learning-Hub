// components/admin/WeeklyReport.tsx

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Person,
  School,
  AccessTime,
  CalendarToday,
  Search,
  Refresh,
  ArrowBack,
  ExpandMore,
  ExpandLess,
  Download,
  FilterList,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

import weeklyReportService, { AdminAllUsersReport } from '@/services/weeklyReportService';
import WeeklyReportCard from '@/components/WeeklyReport/WeeklyReportCard';

interface UserReportDetail {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  current_week: {
    week_start: string;
    week_end: string;
    courses_enrolled: number;
    courses_completed: number;
    lessons_completed: number;
    watch_time_hours: number;
    watch_time_formatted: string;
    meetings_attended: number;
    webinars_attended: number;
  };
  previous_week: {
    week_start: string;
    week_end: string;
    courses_enrolled: number;
    courses_completed: number;
    lessons_completed: number;
    watch_time_formatted: string;
    meetings_attended: number;
    webinars_attended: number;
  };
  comparison: {
    courses_completed: {
      change: string;
      trend: 'up' | 'down' | 'same';
    };
    lessons_completed: {
      change: string;
      trend: 'up' | 'down' | 'same';
    };
    watch_time: {
      change: string;
      trend: 'up' | 'down' | 'same';
    };
  };
  status_message: string;
  next_week_goals: string;
}

// Helper function to get week start (Saturday)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // Get to Saturday (6)
  const diff = (day >= 6) ? day - 6 : day + 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function to format week label
const formatWeekLabel = (weekStart: Date): string => {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  
  const startStr = weekStart.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });
  const endStr = end.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });
  
  return `${startStr} - ${endStr}`;
};

// Helper to get week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / 86400000 + startOfYear.getDay() + 1) / 7);
};

const AdminWeeklyReportsPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminAllUsersReport | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userReport, setUserReport] = useState<UserReportDetail | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    // Default to current week's Saturday
    const today = new Date();
    return getWeekStart(today);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<'courses' | 'lessons' | 'time'>('courses');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  const loadData = useCallback(async (weekStart: Date) => {
    try {
      setLoading(true);
      setError('');

      // Format date for API
      const dateStr = weekStart.toISOString().split('T')[0];
      
      console.log('Loading admin reports for week:', dateStr);
      const reportData = await weeklyReportService.getAllUsersReports(dateStr);
      console.log('Admin report data:', reportData);
      setData(reportData);
      
      // Clear selected user if data changes
      setSelectedUserId(null);
      setUserReport(null);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err?.message || 'Failed to load reports.');
      
      if (err?.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (err?.response?.status === 403) {
        setError('You do not have permission to view admin reports.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUserReport = useCallback(async (userId: number, weekStart: Date) => {
    try {
      const dateStr = weekStart.toISOString().split('T')[0];
      console.log('Loading user report for user:', userId);
      const report = await weeklyReportService.getUserReport(userId, dateStr);
      console.log('User report:', report);
      setUserReport(report);
      setSelectedUserId(userId);
      // Auto-expand the selected user
      setExpandedUsers(prev => new Set([...prev, userId]));
    } catch (err: any) {
      console.error('Error loading user report:', err);
      toast.error(err?.message || 'Failed to load user report.');
    }
  }, []);

  useEffect(() => {
    loadData(selectedWeekStart);
  }, [selectedWeekStart, loadData]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData(selectedWeekStart);
      toast.success('Reports refreshed!');
    } catch (err) {
      toast.error('Failed to refresh.');
    } finally {
      setRefreshing(false);
    }
  }, [selectedWeekStart, loadData]);

  const toggleUserExpand = useCallback((userId: number) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleViewUserReport = useCallback(async (userId: number) => {
    if (selectedUserId === userId && userReport) {
      // If already selected, just toggle expansion
      toggleUserExpand(userId);
      return;
    }
    await loadUserReport(userId, selectedWeekStart);
  }, [selectedUserId, userReport, loadUserReport, selectedWeekStart, toggleUserExpand]);

  const handlePreviousWeek = useCallback(() => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedWeekStart(getWeekStart(newDate));
  }, [selectedWeekStart]);

  const handleNextWeek = useCallback(() => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedWeekStart(getWeekStart(newDate));
  }, [selectedWeekStart]);

  const handleToday = useCallback(() => {
    const today = new Date();
    setSelectedWeekStart(getWeekStart(today));
  }, []);

  const getSortedReports = useCallback(() => {
    if (!data?.user_reports) return [];

    const sorted = [...data.user_reports];
    sorted.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;
      
      switch (sortBy) {
        case 'courses':
          aVal = a.courses_completed;
          bVal = b.courses_completed;
          break;
        case 'lessons':
          aVal = a.lessons_completed;
          bVal = b.lessons_completed;
          break;
        case 'time':
          // Parse watch time string to seconds for comparison
          const parseTime = (time: string) => {
            const hours = parseInt(time.match(/(\d+)h/)?.[1] || '0');
            const minutes = parseInt(time.match(/(\d+)m/)?.[1] || '0');
            return hours * 3600 + minutes * 60;
          };
          aVal = parseTime(a.watch_time_formatted);
          bVal = parseTime(b.watch_time_formatted);
          break;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return sorted;
  }, [data?.user_reports, sortBy, sortOrder]);

  const filteredReports = useMemo(() => {
    const reports = getSortedReports();
    if (!searchTerm) return reports;
    
    return reports.filter(report =>
      report.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user_email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [getSortedReports, searchTerm]);

  const getTrendIcon = (change: string) => {
    if (change.startsWith('+')) {
      return <TrendingUp className="text-emerald-500 text-sm" />;
    }
    if (change.startsWith('-')) {
      return <TrendingDown className="text-red-500 text-sm" />;
    }
    return null;
  };

  const getTrendColor = (change: string) => {
    if (change.startsWith('+')) return 'text-emerald-600';
    if (change.startsWith('-')) return 'text-red-600';
    return 'text-gray-500';
  };

  const getStatusColor = (status: string) => {
    if (status.includes('Amazing') || status.includes('great')) return 'text-emerald-600';
    if (status.includes('quiet')) return 'text-amber-600';
    return 'text-blue-600';
  };

  const handleExportCSV = useCallback(() => {
    if (!data?.user_reports) return;
    
    const headers = ['User', 'Email', 'Courses Completed', 'Lessons Completed', 'Watch Time', 'Meetings', 'Webinars', 'Status'];
    const rows = data.user_reports.map(report => [
      report.user_name,
      report.user_email,
      report.courses_completed,
      report.lessons_completed,
      report.watch_time_formatted,
      report.meetings_attended,
      report.webinars_attended,
      report.status_message.replace(/[^a-zA-Z0-9 ]/g, '')
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-reports-week-${getWeekNumber(selectedWeekStart)}-${selectedWeekStart.getFullYear()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully!');
  }, [data, selectedWeekStart]);

  if (loading && !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-800 mb-2">Loading reports...</div>
          <div className="text-sm text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowBack className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Weekly Reports</h1>
              <p className="text-sm text-slate-500">Monitor learner progress across the platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all"
            >
              <Download className="text-base" />
              Export CSV
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-all disabled:opacity-70"
            >
              <Refresh className={`text-base ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CalendarToday className="text-blue-900 text-xl" />
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Week {getWeekNumber(selectedWeekStart)}, {selectedWeekStart.getFullYear()}
                </h3>
                <p className="text-sm text-slate-500">
                  {formatWeekLabel(selectedWeekStart)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousWeek}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Previous week"
              >
                <ChevronLeft className="text-slate-600" />
              </button>
              <button
                onClick={handleToday}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={handleNextWeek}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Next week"
              >
                <ChevronRight className="text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
            <button
              onClick={handleRefresh}
              className="ml-3 text-blue-900 font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Person className="text-blue-900" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{data.aggregated.total_users}</div>
                  <div className="text-xs text-slate-500">Total Users</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <School className="text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{data.aggregated.total_courses_completed}</div>
                  <div className="text-xs text-slate-500">Courses Completed</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <AccessTime className="text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{data.aggregated.avg_watch_time_minutes}m</div>
                  <div className="text-xs text-slate-500">Avg Watch Time</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <CalendarToday className="text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{data.aggregated.reports_generated}</div>
                  <div className="text-xs text-slate-500">Reports Generated</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Performers */}
        {data?.aggregated?.top_performers && data.aggregated.top_performers.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4">🏆 Top Performers This Week</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">User</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Courses</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Lessons</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Watch Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.aggregated.top_performers.map((performer, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-slate-200 text-slate-600' :
                          index === 2 ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-50 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{performer.user_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-blue-900">{performer.courses_completed}</td>
                      <td className="py-3 px-4 text-center">{performer.lessons_completed}</td>
                      <td className="py-3 px-4 text-center">{performer.watch_time_hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <FilterList className="text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="courses">Sort by Courses</option>
                <option value="lessons">Sort by Lessons</option>
                <option value="time">Sort by Time</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </button>
            </div>
          </div>
        </div>

        {/* User Reports List */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No Reports Found</h3>
              <p className="text-slate-500">
                {searchTerm ? 'No users match your search criteria.' : 'No reports available for this week.'}
              </p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div key={report.user_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* User Header - Clickable to expand/collapse */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleViewUserReport(report.user_id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Person className="text-blue-900 text-lg" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{report.user_name}</div>
                          <div className="text-sm text-slate-500">{report.user_email}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-blue-900">{report.courses_completed}</div>
                        <div className="text-xs text-slate-500">Courses</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-900">{report.lessons_completed}</div>
                        <div className="text-xs text-slate-500">Lessons</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-900">{report.watch_time_formatted}</div>
                        <div className="text-xs text-slate-500">Time</div>
                      </div>
                      <div className="text-center">
                        <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(report.courses_completed_change)}`}>
                          {getTrendIcon(report.courses_completed_change)}
                          {report.courses_completed_change}
                        </span>
                        <div className="text-xs text-slate-500">Change</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${getStatusColor(report.status_message)} line-clamp-1 max-w-xs`}>
                        {report.status_message}
                      </span>
                      {expandedUsers.has(report.user_id) ? (
                        <ExpandLess className="text-slate-400" />
                      ) : (
                        <ExpandMore className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded User Detail */}
                {expandedUsers.has(report.user_id) && userReport && selectedUserId === report.user_id && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Current Week Stats */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Current Week</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-600">Courses Completed</span>
                            <span className="text-lg font-bold text-blue-900">
                              {userReport.current_week.courses_completed}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-600">Lessons Completed</span>
                            <span className="text-lg font-bold text-blue-900">
                              {userReport.current_week.lessons_completed}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-600">Watch Time</span>
                            <span className="text-lg font-bold text-blue-900">
                              {userReport.current_week.watch_time_formatted}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-600">Meetings Attended</span>
                            <span className="text-lg font-bold text-blue-900">
                              {userReport.current_week.meetings_attended}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="text-sm text-slate-600">Webinars Attended</span>
                            <span className="text-lg font-bold text-blue-900">
                              {userReport.current_week.webinars_attended}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Comparison & Goals */}
                      <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">Compared to Previous Week</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="text-sm text-slate-600">Courses</span>
                              <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(userReport.comparison.courses_completed.change)}`}>
                                {getTrendIcon(userReport.comparison.courses_completed.change)}
                                {userReport.comparison.courses_completed.change}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="text-sm text-slate-600">Lessons</span>
                              <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(userReport.comparison.lessons_completed.change)}`}>
                                {getTrendIcon(userReport.comparison.lessons_completed.change)}
                                {userReport.comparison.lessons_completed.change}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="text-sm text-slate-600">Watch Time</span>
                              <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(userReport.comparison.watch_time.change)}`}>
                                {getTrendIcon(userReport.comparison.watch_time.change)}
                                {userReport.comparison.watch_time.change}
                              </span>
                            </div>
                          </div>
                        </div>

                        {userReport.status_message && (
                          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                            <p className="text-sm text-blue-900">💬 {userReport.status_message}</p>
                          </div>
                        )}

                        {userReport.next_week_goals && (
                          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                            <p className="text-sm text-amber-800">🎯 {userReport.next_week_goals}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminWeeklyReportsPage;