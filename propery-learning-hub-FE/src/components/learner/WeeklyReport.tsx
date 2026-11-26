// components/learner/WeeklyReports

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowBack,
  CalendarToday,
  Refresh,
  TrendingUp,
  Person,
  School,
  PlayCircleOutline,
  AccessTime,
  Videocam,
  Web,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import weeklyReportService, { WeeklyReport } from '@/services/weeklyReportService';
import WeeklyReportCard from '@/components/WeeklyReport/WeeklyReportCard';

const WeeklyReportsPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentReport, setCurrentReport] = useState<WeeklyReport | null>(null);
  const [allReports, setAllReports] = useState<WeeklyReport[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [showAllReports, setShowAllReports] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Load current report
      try {
        const current = await weeklyReportService.getCurrentReport();
        if (current) {
          setCurrentReport(current);
          setSelectedReport(current);
          setSelectedWeek(current.week_start);
        } else {
          setError('No report available for this week yet. Check back on Saturday.');
        }
      } catch (err: any) {
        // Check if it's a 404 or empty response
        if (err?.response?.status === 404 || err?.message?.includes('404')) {
          setError('No report available for this week yet. Check back on Saturday.');
        } else if (err?.response?.status === 204 || err?.message?.includes('204')) {
          setError('No content available. Please try again later.');
        } else {
          console.error('Error loading current report:', err);
          setError('Failed to load current report. Please try again.');
        }
      }

      // Load all reports (last 10)
      try {
        const response = await weeklyReportService.getAllReports(1);
        // Check if response has data property and it's an array
        if (response && response.data && Array.isArray(response.data)) {
          setAllReports(response.data);
        } else if (Array.isArray(response)) {
          // If response is directly an array
          setAllReports(response);
        } else {
          setAllReports([]);
        }
      } catch (err) {
        console.error('Error loading all reports:', err);
        // Don't set error for all reports if current report loaded successfully
        setAllReports([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
      toast.success('Reports refreshed!');
    } catch (err) {
      toast.error('Failed to refresh reports.');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleSelectWeek = useCallback(async (weekStart: string) => {
    if (weekStart === selectedWeek) return;
    
    try {
      setLoading(true);
      const report = await weeklyReportService.getReportForWeek(weekStart);
      if (report) {
        setSelectedReport(report);
        setSelectedWeek(weekStart);
      } else {
        toast.error('No report found for selected week.');
      }
    } catch (err) {
      console.error('Error loading week report:', err);
      toast.error('Failed to load report for selected week.');
    } finally {
      setLoading(false);
    }
  }, [selectedWeek]);

  const formatWeekLabel = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    return `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  if (loading && !currentReport) {
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
              onClick={() => router.push('/learn/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowBack className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Weekly Reports</h1>
              <p className="text-sm text-slate-500">Track your learning progress week by week</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-all disabled:opacity-70"
          >
            <Refresh className={`text-base ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            {error}
            <button
              onClick={handleRefresh}
              className="ml-3 text-blue-900 font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Current Week Report */}
        {currentReport && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarToday className="text-blue-900 text-lg" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">This Week</h2>
              
            </div>
            <WeeklyReportCard report={currentReport} />
          </div>
        )}

        {/* Week Selector */}
        {allReports.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <TrendingUp className="text-slate-600 text-lg" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">Previous Weeks</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {allReports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleSelectWeek(report.week_start)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedWeek === report.week_start
                      ? 'bg-blue-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {formatWeekLabel(report.week_start)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Week Report */}
        {selectedReport && selectedWeek !== (currentReport?.week_start) && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                <CalendarToday className="text-slate-600 text-lg" />
              </div>
              <h2 className="text-lg font-bold text-slate-800">
                {formatWeekLabel(selectedWeek)}
              </h2>
            </div>
            <WeeklyReportCard report={selectedReport} />
          </div>
        )}

        {/* Summary Statistics */}
        {currentReport && (
          <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Your Learning Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {currentReport.current_week.courses_completed}
                </div>
                <div className="text-xs text-slate-500">Courses Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {currentReport.current_week.lessons_completed}
                </div>
                <div className="text-xs text-slate-500">Lessons Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {currentReport.current_week.watch_time}
                </div>
                <div className="text-xs text-slate-500">Time Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {currentReport.current_week.meetings_attended + currentReport.current_week.webinars_attended}
                </div>
                <div className="text-xs text-slate-500">Sessions Attended</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyReportsPage;