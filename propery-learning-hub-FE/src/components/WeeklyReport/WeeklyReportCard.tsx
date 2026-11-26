// components/WeeklyReport/WeeklyReportCard.tsx

'use client';

import React from 'react';
import {
  School,
  PlayCircleOutline,
  CalendarToday,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
  AccessTime,
  Videocam,
  Web,
  Person,
} from '@mui/icons-material';
import { WeeklyReport } from '../../services/weeklyReportService';

interface WeeklyReportCardProps {
  report: WeeklyReport;
  showUserInfo?: boolean;
  compact?: boolean;
}

const WeeklyReportCard: React.FC<WeeklyReportCardProps> = ({ 
  report, 
  showUserInfo = false,
  compact = false 
}) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="text-emerald-500 text-sm" />;
      case 'down':
        return <TrendingDownIcon className="text-red-500 text-sm" />;
      default:
        return <RemoveIcon className="text-gray-400 text-sm" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-slate-500">
              {new Date(report.week_start).toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
              })} - {new Date(report.week_end).toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric' 
              })}
            </div>
            {showUserInfo && report.user && (
              <div className="text-sm font-semibold text-slate-800 mt-1">
                {report.user.name}
              </div>
            )}
          </div>
          <div className="px-2 py-1 bg-blue-50 rounded-lg text-xs font-semibold text-blue-900">
            Week {report.week_number}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-blue-900">
              {report.current_week.courses_completed}
            </div>
            <div className="text-xs text-slate-500">Courses</div>
            <div className={`text-xs flex items-center justify-center gap-1 ${getTrendColor(report.comparison.courses_completed.trend)}`}>
              {getTrendIcon(report.comparison.courses_completed.trend)}
              {report.comparison.courses_completed.change}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {report.current_week.lessons_completed}
            </div>
            <div className="text-xs text-slate-500">Lessons</div>
            <div className={`text-xs flex items-center justify-center gap-1 ${getTrendColor(report.comparison.lessons_completed.trend)}`}>
              {getTrendIcon(report.comparison.lessons_completed.trend)}
              {report.comparison.lessons_completed.change}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-900">
              {report.current_week.watch_time}
            </div>
            <div className="text-xs text-slate-500">Time</div>
            <div className={`text-xs flex items-center justify-center gap-1 ${getTrendColor(report.comparison.watch_time.trend)}`}>
              {getTrendIcon(report.comparison.watch_time.trend)}
              {report.comparison.watch_time.change}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">
              Weekly Report
            </h3>
            <span className="px-2 py-1 bg-blue-50 rounded-lg text-xs font-semibold text-blue-900">
              Week {report.week_number}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {new Date(report.week_start).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })} - {new Date(report.week_end).toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </p>
        </div>
        {showUserInfo && report.user && (
          <div className="flex items-center gap-2">
            <Person className="text-slate-400 text-sm" />
            <span className="text-sm font-medium text-slate-700">{report.user.name}</span>
          </div>
        )}
      </div>

      {/* Status Message */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-900">{report.status_message}</p>
      </div>

      {/* Current Week Stats */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">This Week</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-900">
              {report.current_week.courses_completed}
            </div>
            <div className="text-xs text-slate-600">Courses Completed</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-900">
              {report.current_week.lessons_completed}
            </div>
            <div className="text-xs text-slate-600">Lessons Completed</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-900">
              {report.current_week.watch_time}
            </div>
            <div className="text-xs text-slate-600">Time Spent</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-900">
              {report.current_week.meetings_attended + report.current_week.webinars_attended}
            </div>
            <div className="text-xs text-slate-600">Sessions Attended</div>
          </div>
        </div>
      </div>

      {/* Comparison with Previous Week */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Compared to Previous Week</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Courses</span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(report.comparison.courses_completed.trend)}`}>
                {getTrendIcon(report.comparison.courses_completed.trend)}
                {report.comparison.courses_completed.change}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {report.previous_week.courses_completed} last week
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Lessons</span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(report.comparison.lessons_completed.trend)}`}>
                {getTrendIcon(report.comparison.lessons_completed.trend)}
                {report.comparison.lessons_completed.change}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {report.previous_week.lessons_completed} last week
            </div>
          </div>
          <div className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Time</span>
              <span className={`flex items-center gap-1 text-sm font-semibold ${getTrendColor(report.comparison.watch_time.trend)}`}>
                {getTrendIcon(report.comparison.watch_time.trend)}
                {report.comparison.watch_time.change}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {report.previous_week.watch_time} last week
            </div>
          </div>
        </div>
      </div>

      {/* Next Week Goals */}
      {report.next_week_goals && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg">🎯</span>
            <div>
              <div className="text-sm font-semibold text-amber-800">Goals for Next Week</div>
              <p className="text-sm text-amber-700">{report.next_week_goals}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReportCard;