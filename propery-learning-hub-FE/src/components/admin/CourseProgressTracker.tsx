'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, HourglassEmpty, Person, Search } from '@mui/icons-material';
import { contentService } from '../../services/contentService';

interface CourseProgressTrackerProps {
  courseId: string;
  courseTitle?: string;
}

const CourseProgressTracker: React.FC<CourseProgressTrackerProps> = ({ courseId, courseTitle }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await contentService.getCourseProgress(courseId, {
      search: search.trim() || undefined,
      status: status === 'all' ? undefined : status,
      per_page: 50,
    });
    if (res.success) {
      setRows(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta || null);
    }
    setLoading(false);
  }, [courseId, search, status]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const summary = meta?.summary;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800">Learner Progress</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Track course and module completion{courseTitle ? ` for ${courseTitle}` : ''}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search learner…"
              className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Enrolled', value: summary.enrolled },
            { label: 'In Progress', value: summary.in_progress },
            { label: 'Completed', value: summary.completed },
            { label: 'Avg Progress', value: `${summary.avg_progress}%` },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{card.label}</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{card.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading progress…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No enrollments found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const open = expanded === row.enrollmentId;
              return (
                <div key={row.enrollmentId}>
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : row.enrollmentId)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Person className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{row.user?.name || 'Learner'}</div>
                      <div className="text-xs text-slate-500 truncate">{row.user?.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">{row.progress}%</div>
                      <div className="text-[11px] text-slate-500 capitalize flex items-center gap-1 justify-end">
                        {row.status === 'completed' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <HourglassEmpty className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        {row.status?.replace('_', ' ')}
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 bg-slate-50/80">
                      <div className="text-xs text-slate-500 mb-2">
                        Content: {row.completedItems ?? row.completedLessons}/{row.totalItems ?? row.totalVideos} · Videos: {row.completedVideos}/{row.totalVideos}
                      </div>
                      <div className="space-y-2">
                        {(row.modules || []).map((m: any) => (
                          <div key={m.moduleId} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium text-slate-800">
                                {m.order}. {m.title}
                              </div>
                              <div className={`text-xs font-bold ${m.isCompleted ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {m.progress}%{m.isCompleted ? ' · Done' : ''}
                              </div>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${m.isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, m.progress || 0)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseProgressTracker;
