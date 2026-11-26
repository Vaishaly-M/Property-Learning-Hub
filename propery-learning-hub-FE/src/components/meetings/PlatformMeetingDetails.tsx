'use client';

import { Loader2 } from 'lucide-react';
import { useMeeting, useCancelMeeting } from '../../hooks/usePlatformMeetings';
import MeetingConfirmationCard from './MeetingConfirmationCard';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { getAllMeetingParticipants } from '../../types/platformMeetings';

export default function PlatformMeetingDetails({
  meetingId,
  backPath = '/dashboard/my-meetings',
}: {
  meetingId: number;
  backPath?: string;
}) {
  const router = useRouter();
  const { data: meeting, isLoading, isError } = useMeeting(meetingId);
  const cancelMeeting = useCancelMeeting();

  const handleCancel = async () => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await cancelMeeting.mutateAsync(meetingId);
      toast.success('Meeting cancelled.');
      router.push(backPath);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel meeting.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading meeting...
      </div>
    );
  }

  if (isError || !meeting) {
    return <p className="text-red-600 py-8 text-center">Meeting not found.</p>;
  }

  const attendees = getAllMeetingParticipants(meeting);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{meeting.meeting_type_label}</h1>
        <p className="text-slate-500 capitalize mt-1">Status: {meeting.status}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border p-4 sm:col-span-2">
          <p className="text-slate-500">
            {attendees.length === 1 ? 'Participant' : `Participants (${attendees.length})`}
          </p>
          <div className="mt-2 space-y-2">
            {attendees.map((participant) => (
              <div key={participant.email}>
                <p className="font-medium">{participant.name}</p>
                <p className="text-slate-500 text-xs">{participant.email}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-slate-500">Timezone</p>
          <p className="font-medium">{meeting.timezone}</p>
        </div>
      </div>

      {meeting.notes && (
        <div className="rounded-lg border p-4">
          <p className="text-slate-500 text-sm mb-1">Notes</p>
          <p className="text-slate-800">{meeting.notes}</p>
        </div>
      )}

      <MeetingConfirmationCard meeting={meeting} />

      {meeting.status !== 'cancelled' && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelMeeting.isPending}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel Meeting
        </button>
      )}
    </div>
  );
}
