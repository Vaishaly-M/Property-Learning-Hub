'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession, useCancelSession, useUpdateSession } from '../../hooks/useSessions';
import TeamsMeetingCard from './TeamsMeetingCard';
import CalendarAvailability from './CalendarAvailability';
import toast from 'react-hot-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface SessionDetailsProps {
  sessionId: number;
}

export default function SessionDetails({ sessionId }: SessionDetailsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin } = useAdminAuth();
  const { data: session, isLoading, isError } = useSession(sessionId);
  const cancelSession = useCancelSession();
  const updateSession = useUpdateSession();

  const canManage =
    admin?.role === 'admin' ||
    (admin?.role === 'instructor' && session?.mentor_id === Number(admin.id));

  const showReschedule = canManage && searchParams.get('reschedule') === '1';
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  const sessionsPath =
    admin?.role === 'learner'
      ? '/learn/sessions'
      : admin?.role === 'admin'
        ? '/admin/sessions'
        : '/instructor/sessions';

  const handleCancel = async () => {
    if (!window.confirm('Cancel this session?')) return;
    try {
      await cancelSession.mutateAsync({ id: sessionId });
      toast.success('Session cancelled.');
      router.push(sessionsPath);
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel session.');
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot || !session) return;

    try {
      await updateSession.mutateAsync({
        id: sessionId,
        payload: {
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          timezone: session.timezone,
        },
      });
      toast.success('Session rescheduled.');
      router.push(sessionsPath);
    } catch (error: any) {
      toast.error(error.message || 'Failed to reschedule session.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading session...
      </div>
    );
  }

  if (isError || !session) {
    return <p className="text-red-600 py-8 text-center">Session not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{session.subject}</h1>
        <p className="text-slate-500 capitalize mt-1">Status: {session.status}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border p-4">
          <p className="text-slate-500">Start</p>
          <p className="font-medium">{new Date(session.start_time).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-slate-500">End</p>
          <p className="font-medium">{new Date(session.end_time).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-slate-500">Mentor</p>
          <p className="font-medium">{session.mentor?.name}</p>
          {session.mentor?.email && (
            <p className="text-slate-500 text-xs mt-1">{session.mentor.email}</p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-slate-500">Student</p>
          <p className="font-medium">{session.student?.name}</p>
          {session.student?.email && (
            <p className="text-slate-500 text-xs mt-1">{session.student.email}</p>
          )}
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-slate-500">Timezone</p>
          <p className="font-medium">{session.timezone}</p>
        </div>
      </div>

      {admin?.role === 'admin' && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
          <h2 className="font-semibold text-slate-900">Meeting Integration Details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-slate-500">Outlook Event ID</p>
              <p className="font-mono text-xs break-all">{session.event_id ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Teams Meeting ID</p>
              <p className="font-mono text-xs break-all">{session.meeting_id ?? '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Session ID</p>
              <p className="font-medium">{session.id}</p>
            </div>
            <div>
              <p className="text-slate-500">Booked</p>
              <p className="font-medium">
                {session.created_at ? new Date(session.created_at).toLocaleString() : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {session.description && (
        <div className="rounded-lg border p-4">
          <p className="text-slate-500 text-sm mb-1">Description</p>
          <p className="text-slate-800">{session.description}</p>
        </div>
      )}

      <TeamsMeetingCard session={session} />

      {showReschedule && session.status !== 'cancelled' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
          <h2 className="font-semibold text-slate-900">Reschedule Session</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New date</label>
            <input
              type="date"
              value={rescheduleDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setRescheduleDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          {rescheduleDate && (
            <CalendarAvailability
              mentorId={session.mentor_id}
              date={rescheduleDate}
              timezone={session.timezone}
              selectedSlot={selectedSlot?.start}
              onSelectSlot={setSelectedSlot}
            />
          )}
          <button
            onClick={handleReschedule}
            disabled={!selectedSlot || updateSession.isPending}
            className="px-4 py-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {updateSession.isPending ? 'Saving...' : 'Confirm Reschedule'}
          </button>
        </div>
      )}

      {canManage && session.status !== 'cancelled' && (
        <button
          onClick={handleCancel}
          disabled={cancelSession.isPending}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel Session
        </button>
      )}
    </div>
  );
}
