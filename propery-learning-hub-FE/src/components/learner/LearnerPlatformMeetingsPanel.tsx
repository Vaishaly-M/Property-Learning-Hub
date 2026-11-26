'use client';

import { useState } from 'react';
import { CalendarPlus, Loader2, Video, X } from 'lucide-react';
import MeetingBookingForm from '../meetings/MeetingBookingForm';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  MEETING_TYPE_LABELS,
  isActivePlatformMeeting,
  getMeetingJoinUrl,
  getMeetingProviderLabel,
  type PlatformMeeting,
} from '../../types/platformMeetings';
import { formatDateTimeInTimezone, resolveMeetingTimezone } from '../../utils/meetingTimezone';

function formatMeetingWhen(meeting: PlatformMeeting): string {
  return formatDateTimeInTimezone(
    meeting.start_time,
    resolveMeetingTimezone(meeting.timezone)
  );
}

export function PlatformMeetingCard({
  meeting,
  onCancel,
  cancelling,
}: {
  meeting: PlatformMeeting;
  onCancel: (id: number) => void;
  cancelling: boolean;
}) {
  const isActive = isActivePlatformMeeting(meeting.status);
  const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type_label;
  const joinUrl = getMeetingJoinUrl(meeting);
  const providerLabel = getMeetingProviderLabel(meeting);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 truncate">{typeLabel}</p>
        <p className="text-sm text-slate-600 mt-0.5">{formatMeetingWhen(meeting)}</p>
        <p className="text-xs text-slate-500 mt-1 capitalize">Status: {meeting.status}</p>
        {(meeting.participants?.length ?? 0) > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            +{meeting.participants!.length} additional participant
            {meeting.participants!.length === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {joinUrl && isActive && (
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
          >
            <Video className="w-4 h-4" />
            Join {providerLabel}
          </a>
        )}
        {isActive && (
          <button
            type="button"
            onClick={() => onCancel(meeting.id)}
            disabled={cancelling}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export type LearnerPlatformMeetingsPanelProps = {
  meetings: PlatformMeeting[];
  isLoading?: boolean;
  isFetching?: boolean;
  onMeetingBooked: (meeting: PlatformMeeting) => void;
  onCancelMeeting: (id: number) => void;
  cancelling?: boolean;
};

export default function LearnerPlatformMeetingsPanel({
  meetings,
  isLoading = false,
  isFetching = false,
  onMeetingBooked,
  onCancelMeeting,
  cancelling = false,
}: LearnerPlatformMeetingsPanelProps) {
  const { admin } = useAdminAuth();
  const [showBookForm, setShowBookForm] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const currentUser = admin
    ? {
        name: `${admin.first_name} ${admin.last_name}`.trim() || admin.email,
        email: admin.email,
      }
    : undefined;

  const upcoming = meetings.filter((meeting) => {
    if (!isActivePlatformMeeting(meeting.status)) return false;
    const endTime = new Date(meeting.end_time).getTime();
    if (isNaN(endTime)) return true;
    return endTime > Date.now();
  });

  const handleBooked = (meeting: PlatformMeeting) => {
    setShowBookForm(false);
    onMeetingBooked(meeting);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sessions with Admin</h2>
          <p className="text-sm text-slate-500">
            Meetings you book and admin-scheduled consultations. Join or cancel here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBookForm((v) => !v)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
        >
          <CalendarPlus className="w-4 h-4" />
          {showBookForm ? 'Hide booking form' : 'Book meeting'}
        </button>
      </div>

      {showBookForm && (
        <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/50">
          <MeetingBookingForm
            variant="authenticated"
            currentUser={currentUser}
            onBooked={handleBooked}
            compact
          />
        </div>
      )}

      <div className="px-5 py-4 space-y-3">
        {isLoading && meetings.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading your bookings...
          </div>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No admin sessions booked yet. Click &quot;Book meeting&quot; to schedule one.
          </p>
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity space-y-3' : 'space-y-3'}>
            {upcoming.map((meeting) => (
              <PlatformMeetingCard
                key={meeting.id}
                meeting={meeting}
                onCancel={onCancelMeeting}
                cancelling={cancelling}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
