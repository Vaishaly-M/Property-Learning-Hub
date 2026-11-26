'use client';

import Link from 'next/link';
import { Calendar, Video } from 'lucide-react';
import type { MentorSession } from '../../types/microsoft';

interface SessionListProps {
  sessions: MentorSession[];
  role: 'mentor' | 'student' | 'admin';
  detailsBasePath?: string;
  onCancel?: (id: number) => void;
  onReschedule?: (id: number) => void;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-green-100 text-green-800',
  rescheduled: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-slate-100 text-slate-700',
};

export default function SessionList({ sessions, role, detailsBasePath, onCancel, onReschedule }: SessionListProps) {
  const detailsPath =
    detailsBasePath ??
    (role === 'student' ? '/learn/sessions' : role === 'admin' ? '/admin/sessions' : '/instructor/sessions');

  if (sessions.length === 0) {
    return <p className="text-slate-500 py-8 text-center">No sessions found.</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{session.subject}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[session.status]}`}>
                  {session.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(session.start_time).toLocaleString()} – {new Date(session.end_time).toLocaleTimeString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {role === 'admin' ? (
                  <>
                    Mentor: {session.mentor?.name ?? session.mentor_id}
                    {session.mentor?.email ? ` (${session.mentor.email})` : ''}
                    <br />
                    Student: {session.student?.name ?? session.student_id}
                    {session.student?.email ? ` (${session.student.email})` : ''}
                  </>
                ) : role === 'mentor' ? (
                  `Student: ${session.student?.name ?? session.student_id}`
                ) : (
                  `Mentor: ${session.mentor?.name ?? session.mentor_id}`
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`${detailsPath}/${session.id}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Details
              </Link>
              {session.join_url && session.status !== 'cancelled' && (
                <a
                  href={session.join_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-blue-900 text-white hover:bg-blue-800"
                >
                  <Video className="w-4 h-4" />
                  Join Teams
                </a>
              )}
              {(role === 'mentor' || role === 'admin') && session.status !== 'cancelled' && (
                <>
                  {onReschedule && (
                    <button
                      onClick={() => onReschedule(session.id)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      Reschedule
                    </button>
                  )}
                  {onCancel && (
                    <button
                      onClick={() => onCancel(session.id)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      Cancel
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
