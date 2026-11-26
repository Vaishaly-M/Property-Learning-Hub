'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import MeetingConfirmationCard from '../../../../components/meetings/MeetingConfirmationCard';
import AvailabilityCalendar from '../../../../components/meetings/AvailabilityCalendar';
import type { AvailabilitySlot } from '../../../../types/platformMeetings';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function ManageMeetingContent({ uuid }: { uuid: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const action = searchParams.get('action');
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [mode, setMode] = useState<'view' | 'reschedule'>(action === 'cancel' ? 'view' : 'view');

  const load = async () => {
    const res = await axios.get(`${API_URL}/public/meetings/${uuid}`, { params: { token } });
    setMeeting(res.data.data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => toast.error('Invalid or expired meeting link.'));
  }, [uuid, token]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await axios.put(`${API_URL}/public/meetings/${uuid}/cancel`, null, { params: { token } });
      toast.success('Meeting cancelled.');
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel.');
    }
  };

  const handleReschedule = async () => {
    if (!selectedSlot) {
      toast.error('Select a new time slot.');
      return;
    }
    try {
      const res = await axios.put(
        `${API_URL}/public/meetings/${uuid}/reschedule`,
        {
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          timezone: meeting.timezone,
        },
        { params: { token } }
      );
      setMeeting(res.data.data);
      setMode('view');
      toast.success('Meeting rescheduled. Updated invites sent to all participants.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reschedule.');
    }
  };

  if (loading) return <p className="text-slate-500 py-12 text-center">Loading...</p>;
  if (!meeting) return <p className="text-red-600 py-12 text-center">Meeting not found.</p>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Manage Your Meeting</h1>

      {meeting.status === 'cancelled' ? (
        <p className="text-slate-600">This meeting has been cancelled.</p>
      ) : (
        <>
          <MeetingConfirmationCard meeting={meeting} />

          {mode === 'reschedule' ? (
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Select a new time</h2>
              <AvailabilityCalendar
                timezone={meeting.timezone}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
              <div className="flex gap-2">
                <button onClick={handleReschedule} className="px-4 py-2 bg-blue-900 text-white rounded-lg">
                  Confirm Reschedule
                </button>
                <button onClick={() => setMode('view')} className="px-4 py-2 border rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setMode('reschedule')} className="px-4 py-2 border border-amber-200 text-amber-800 rounded-lg">
                Reschedule
              </button>
              <button onClick={handleCancel} className="px-4 py-2 border border-red-200 text-red-700 rounded-lg">
                Cancel Meeting
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ManageMeetingPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = use(params);
  return (
    <Suspense fallback={<div className="py-12 text-center">Loading...</div>}>
      <ManageMeetingContent uuid={uuid} />
    </Suspense>
  );
}
