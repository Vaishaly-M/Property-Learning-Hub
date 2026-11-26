'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import MeetingsCalendarView from '../../../components/meetings/MeetingsCalendarView';
import { DEFAULT_TIMEZONE } from '../../../constants/timezone';
import { useCancelMeeting, useMyMeetings } from '../../../hooks/usePlatformMeetings';
import platformMeetingService from '../../../services/platformMeetingService';
import { getCalendarRangeFromYmd, startOfWeekYmd, todayYmdInTimezone } from '../../../utils/meetingTimezone';

export default function MyMeetingsPage() {
  const [displayTimezone, setDisplayTimezone] = useState(DEFAULT_TIMEZONE);
  const [anchorYmd, setAnchorYmd] = useState(() =>
    startOfWeekYmd(todayYmdInTimezone(DEFAULT_TIMEZONE), DEFAULT_TIMEZONE)
  );

  useEffect(() => {
    platformMeetingService
      .getPlatformTimezone()
      .then((timezone) => {
        setDisplayTimezone(timezone);
        setAnchorYmd(startOfWeekYmd(todayYmdInTimezone(timezone), timezone));
      })
      .catch(() => {
        // Keep default timezone when settings cannot be loaded.
      });
  }, []);

  const queryParams = useMemo(() => {
    const range = getCalendarRangeFromYmd(anchorYmd, 'week', displayTimezone);
    return { from: range.from, to: range.to, timezone: range.timezone, per_page: 100 };
  }, [anchorYmd, displayTimezone]);

  const { data, isLoading, isFetching } = useMyMeetings(queryParams);
  const cancelMeeting = useCancelMeeting();

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await cancelMeeting.mutateAsync(id);
      toast.success('Meeting cancelled.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel meeting.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Meetings</h1>
          <p className="text-slate-600">Calendar view of your booked sessions with the platform admin.</p>
        </div>
        <Link
          href="/dashboard/book-meeting"
          className="inline-flex justify-center px-4 py-2 rounded-lg bg-blue-900 text-white font-medium hover:bg-blue-800"
        >
          Book Meeting
        </Link>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading calendar...
        </div>
      ) : (
        <div className={isFetching ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
          <MeetingsCalendarView
            meetings={data?.data ?? []}
            anchorYmd={anchorYmd}
            onAnchorChange={setAnchorYmd}
            onCancel={handleCancel}
            displayTimezone={displayTimezone}
          />
        </div>
      )}
    </div>
  );
}
