'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CalendarPlus, List, Settings2, Loader2 } from 'lucide-react';
import MyMeetingsTable from './MyMeetingsTable';
import AvailabilitySettingsPanel from './AvailabilitySettingsPanel';
import AvailabilityBlocksPanel from './AvailabilityBlocksPanel';
import AdminMicrosoftConnect from './AdminMicrosoftConnect';
import MeetingBookingForm from './MeetingBookingForm';
import MeetingsCalendarView, { type CalendarViewMode } from './MeetingsCalendarView';
import { useAdminMeetings, useCancelMeeting, useRescheduleMeeting } from '../../hooks/usePlatformMeetings';
import { DEFAULT_TIMEZONE } from '../../constants/timezone';
import { getCalendarRangeFromYmd, startOfWeekYmd, todayYmdInTimezone } from '../../utils/meetingTimezone';
import api from '../../services/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { getProviderInviteLabel, type PlatformMeeting } from '../../types/platformMeetings';

const TABS = [
  { id: 'bookings', label: 'All Bookings', icon: List },
  { id: 'book', label: 'Book Meeting', icon: CalendarPlus },
  { id: 'settings', label: 'Settings', icon: Settings2 },
] as const;

type TabId = (typeof TABS)[number]['id'];

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Rescheduled', value: 'rescheduled' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const;

function isValidTab(tab: string | null): tab is TabId {
  return TABS.some((t) => t.id === tab);
}

export default function MeetingsHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { admin } = useAdminAuth();
  const tabParam = searchParams.get('tab');
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : 'bookings';

  const setTab = (tab: TabId) => {
    router.replace(`/admin/sessions?tab=${tab}`, { scroll: false });
  };

  const [statusFilter, setStatusFilter] = useState('');
  const [displayMode, setDisplayMode] = useState<'calendar' | 'table'>('calendar');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [displayTimezone, setDisplayTimezone] = useState(DEFAULT_TIMEZONE);
  const [anchorYmd, setAnchorYmd] = useState(() =>
    startOfWeekYmd(todayYmdInTimezone(DEFAULT_TIMEZONE), DEFAULT_TIMEZONE)
  );

  useEffect(() => {
    api
      .get('/admin/availability-settings')
      .then((res) => {
        const body = res as unknown as { data?: { timezone?: string } };
        if (body.data?.timezone) {
          setDisplayTimezone(body.data.timezone);
          setAnchorYmd(startOfWeekYmd(todayYmdInTimezone(body.data.timezone), body.data.timezone));
        }
      })
      .catch(() => {
        // Keep default timezone when settings cannot be loaded.
      });
  }, []);

  const adminRange = useMemo(
    () => getCalendarRangeFromYmd(anchorYmd, viewMode, displayTimezone),
    [anchorYmd, viewMode, displayTimezone]
  );

  const adminQueryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      per_page: 100,
      from: adminRange.from,
      to: adminRange.to,
      timezone: adminRange.timezone,
    };
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [statusFilter, adminRange]);

  const { data: adminData, isLoading: adminLoading, isFetching: adminFetching } =
    useAdminMeetings(adminQueryParams);

  const cancelMeeting = useCancelMeeting();
  const rescheduleMeeting = useRescheduleMeeting();

  const currentUser = useMemo(
    () =>
      admin
        ? {
            name: `${admin.first_name} ${admin.last_name}`.trim() || admin.email,
            email: admin.email,
          }
        : undefined,
    [admin?.first_name, admin?.last_name, admin?.email],
  );

  const handleBooked = (meeting: PlatformMeeting) => {
    const attendeeCount = meeting.all_participants?.length ?? 1;
    toast.success(
      `Meeting booked successfully for ${attendeeCount} participant${attendeeCount === 1 ? '' : 's'}! ` +
        `${getProviderInviteLabel(meeting.meeting_provider)} invites and confirmation emails have been sent.`
    );
    setTab('bookings');
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await cancelMeeting.mutateAsync(id);
      toast.success('Meeting cancelled.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel meeting.');
    }
  };

  const handleReschedule = async (
    id: number,
    payload: { start_time: string; end_time: string; timezone: string }
  ) => {
    try {
      await rescheduleMeeting.mutateAsync({ id, ...payload });
      toast.success('Meeting rescheduled. Updated invites sent to all participants.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to reschedule meeting.');
      throw error;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
        <p className="text-slate-600 mt-1">
          View all bookings, schedule sessions, and manage calendar settings.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === id
                ? 'border-blue-900 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    statusFilter === filter.value
                      ? 'bg-blue-900 text-white border-blue-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setDisplayMode('calendar')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  displayMode === 'calendar'
                    ? 'bg-blue-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className={`px-3 py-1.5 text-sm font-medium ${
                  displayMode === 'table'
                    ? 'bg-blue-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Table
              </button>
            </div>
          </div>

          {adminLoading && !adminData ? (
            <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading bookings...
            </div>
          ) : displayMode === 'calendar' ? (
            <div className={adminFetching ? 'opacity-60 pointer-events-none transition-opacity' : ''}>
              <MeetingsCalendarView
                meetings={adminData?.data ?? []}
                anchorYmd={anchorYmd}
                onAnchorChange={setAnchorYmd}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
                rescheduling={rescheduleMeeting.isPending}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                showViewModeToggle
                showParticipant
                displayTimezone={displayTimezone}
              />
            </div>
          ) : (
            <MyMeetingsTable
              meetings={adminData?.data ?? []}
              onCancel={handleCancel}
              displayTimezone={displayTimezone}
            />
          )}
        </div>
      )}

      {activeTab === 'book' && (
        <div className="max-w-2xl">
          <MeetingBookingForm
            variant="authenticated"
            timezone={displayTimezone}
            currentUser={currentUser}
            onBooked={handleBooked}
          />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-4xl">
          <AdminMicrosoftConnect />
          <AvailabilitySettingsPanel />
          <AvailabilityBlocksPanel />
        </div>
      )}
    </div>
  );
}
