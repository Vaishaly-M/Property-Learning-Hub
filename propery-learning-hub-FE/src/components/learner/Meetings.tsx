// components/learner/LearnerMeetings.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarToday,
  VideoCall,
  PlayCircle,
  Schedule,
  Group,
  AccessTime,
  CheckCircle,
  PersonAdd,
  Cancel,
  ChevronLeft,
  ChevronRight,
  People,
} from '@mui/icons-material';
import { Video, X } from 'lucide-react';
import learnerMeetingService, {
  Meeting,
} from '../../services/learnerMeetingService';
import LearnerPlatformMeetingsPanel from './LearnerPlatformMeetingsPanel';
import { useQueryClient } from '@tanstack/react-query';
import {
  MY_MEETINGS_LIST_PARAMS,
  upsertMyMeetingsCache,
  useCancelMeeting,
  useMyMeetings,
} from '../../hooks/usePlatformMeetings';
import {
  MEETING_TYPE_LABELS,
  getMeetingJoinUrl,
  getMeetingProviderLabel,
  getProviderInviteLabel,
  isActivePlatformMeeting,
  type PlatformMeeting,
} from '../../types/platformMeetings';
import {
  formatDateTimeInTimezone,
  formatTimeInTimezone,
  resolveMeetingTimezone,
  zonedDayKey,
} from '../../utils/meetingTimezone';
import toast from 'react-hot-toast';

// ─── Date helpers ────────────────────────────────────────────────────────────

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

const isToday = (date: Date): boolean => {
  const t = new Date();
  return (
    date.getDate() === t.getDate() &&
    date.getMonth() === t.getMonth() &&
    date.getFullYear() === t.getFullYear()
  );
};

const subMonths = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setMonth(r.getMonth() - n);
  return r;
};

const addMonths = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};

// ─── Platform meeting calendar helpers ───────────────────────────────────────

function platformMeetingDayKeys(meeting: PlatformMeeting): string[] {
  const keys = new Set<string>();
  const meetingTimezone = resolveMeetingTimezone(meeting.timezone);

  if (meeting.local_date) {
    keys.add(meeting.local_date);
  }

  if (meeting.start_time) {
    const startDate = new Date(meeting.start_time);
    if (!Number.isNaN(startDate.getTime())) {
      keys.add(zonedDayKey(meeting.start_time, meetingTimezone));

      try {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTimezone) {
          keys.add(zonedDayKey(meeting.start_time, browserTimezone));
        }
      } catch {
        // Ignore environments without Intl timezone support.
      }
    }
  }

  return [...keys];
}

function platformMeetingMatchesDay(
  meeting: PlatformMeeting,
  dateStr: string,
  options?: { includeCompleted?: boolean }
): boolean {
  const includeCompleted = options?.includeCompleted ?? false;

  if (!includeCompleted && !isActivePlatformMeeting(meeting.status)) {
    return false;
  }

  if (includeCompleted && isActivePlatformMeeting(meeting.status)) {
    return false;
  }

  return platformMeetingDayKeys(meeting).includes(dateStr);
}

function sortPlatformMeetings(meetings: PlatformMeeting[]): PlatformMeeting[] {
  return [...meetings].sort(
    (left, right) =>
      new Date(left.start_time).getTime() - new Date(right.start_time).getTime()
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

const LearnerMeetings: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'in-progress' | 'completed'>('upcoming');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [registrationNotes, setRegistrationNotes] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const {
    data: platformData,
    refetch: refetchPlatformMeetings,
    isFetching: platformFetching,
    isLoading: platformLoading,
  } = useMyMeetings(MY_MEETINGS_LIST_PARAMS);
  const cancelPlatformMeeting = useCancelMeeting();
  const platformMeetings = platformData?.data ?? [];

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'in-progress') {
      void refetchPlatformMeetings();
    }
  }, [activeTab, refetchPlatformMeetings]);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadMeetings = useCallback(async () => {
    try {
      const res = await learnerMeetingService.getMeetings({ status: activeTab, per_page: 50 });
      if (res.success && res.data) setMeetings(res.data.data);
    } catch (err) {
      console.error('Error loading meetings:', err);
    }
  }, [activeTab]);

  const loadAllMeetingsForCalendar = useCallback(async () => {
    try {
      // Fetch upcoming + in-progress for calendar display (no status filter → default)
      const res = await learnerMeetingService.getMeetings({ per_page: 200 });
      if (res.success && res.data) setAllMeetings(res.data.data);
    } catch (err) {
      console.error('Error loading calendar meetings:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLegacyLoading(true);
      await Promise.all([loadMeetings(), loadAllMeetingsForCalendar(), refetchPlatformMeetings()]);
      setLegacyLoading(false);
    };
    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    void loadAllMeetingsForCalendar();
  }, [platformMeetings, loadAllMeetingsForCalendar]);

  const refreshAll = async () => {
    await Promise.all([loadMeetings(), loadAllMeetingsForCalendar(), refetchPlatformMeetings()]);
  };

  const handleCancelPlatformMeeting = async (id: number) => {
    if (!window.confirm('Cancel this meeting with the admin?')) return;
    try {
      await cancelPlatformMeeting.mutateAsync(id);
      toast.success('Meeting cancelled.');
      await refetchPlatformMeetings();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel meeting.');
    }
  };

  const handlePlatformMeetingBooked = async (meeting: PlatformMeeting) => {
    const normalizedMeeting: PlatformMeeting = {
      ...meeting,
      status: meeting.status || 'booked',
    };

    upsertMyMeetingsCache(queryClient, normalizedMeeting, MY_MEETINGS_LIST_PARAMS);

    if (normalizedMeeting.start_time) {
      const startDate = new Date(normalizedMeeting.start_time);
      if (!Number.isNaN(startDate.getTime())) {
        setCurrentMonth(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
      }
    }

    setCalendarRevision((value) => value + 1);
    await refetchPlatformMeetings();
    await Promise.all([loadAllMeetingsForCalendar(), loadMeetings()]);
    toast.success(
      `Meeting booked! Check your email for the ${getProviderInviteLabel(meeting.meeting_provider)} invite.`
    );
  };

  const upcomingPlatformMeetings = useMemo(
    () =>
      sortPlatformMeetings(
        platformMeetings.filter((meeting) => isActivePlatformMeeting(meeting.status))
      ),
    [platformMeetings]
  );

  const platformMeetingsForTab = useMemo(() => {
    const now = nowTick;
    if (activeTab === 'upcoming') {
      return sortPlatformMeetings(
        platformMeetings.filter((meeting) => {
          if (!isActivePlatformMeeting(meeting.status)) return false;
          return new Date(meeting.end_time).getTime() >= now &&
            new Date(meeting.start_time).getTime() > now;
        })
      );
    }
    if (activeTab === 'completed') {
      return sortPlatformMeetings(
        platformMeetings.filter(
          (meeting) =>
            meeting.status === 'completed' ||
            meeting.status === 'cancelled' ||
            (isActivePlatformMeeting(meeting.status) &&
              new Date(meeting.end_time).getTime() < now)
        )
      );
    }
    // Live now
    return sortPlatformMeetings(
      platformMeetings.filter((meeting) => {
        if (!isActivePlatformMeeting(meeting.status)) return false;
        const start = new Date(meeting.start_time).getTime();
        const end = new Date(meeting.end_time).getTime();
        return start <= now && end >= now;
      })
    );
  }, [activeTab, platformMeetings, nowTick]);

  // Include admin/platform bookings in Upcoming, Live, and Completed tab lists.
  const platformMeetingsForList = platformMeetingsForTab;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleJoinMeeting = async (meeting: Meeting) => {
    try {
      const res = await learnerMeetingService.joinMeeting(meeting.id);
      if (res.success && res.data?.meeting_link) {
        window.open(res.data.meeting_link, '_blank');
      } else {
        alert(res.message || 'Meeting link is not available');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to join meeting');
    }
  };

  const handleConfirmAttendance = async (meetingId: number) => {
    try {
      const res = await learnerMeetingService.confirmAttendance(meetingId);
      if (res.success) {
        await refreshAll();
        alert('Attendance confirmed!');
      } else {
        alert(res.message || 'Failed to confirm attendance');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to confirm attendance');
    }
  };

  const handleDeclineInvitation = async (meetingId: number) => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) return;
    try {
      const res = await learnerMeetingService.declineInvitation(meetingId);
      if (res.success) {
        await refreshAll();
        alert('Invitation declined');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to decline invitation');
    }
  };

  const handleRegister = async () => {
    if (!selectedMeeting) return;
    try {
      const res = await learnerMeetingService.register(selectedMeeting.id, registrationNotes);
      if (res.success) {
        await refreshAll();
        setShowRegisterModal(false);
        setRegistrationNotes('');
        toast.success('Successfully registered for the meeting!');
      } else {
        alert(res.message || 'Failed to register');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to register');
    }
  };

  const handleCancelRegistration = async (meetingId: number) => {
    if (!window.confirm('Are you sure you want to cancel your registration?')) return;
    try {
      const res = await learnerMeetingService.cancelRegistration(meetingId);
      if (res.success) {
        await refreshAll();
        alert('Registration cancelled');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel registration');
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getMeetingIcon = (type: string) => {
    if (type === 'one-on-one') return <PersonAdd style={{ fontSize: '16px' }} />;
    if (type === 'group' || type === 'team') return <Group style={{ fontSize: '16px' }} />;
    return <VideoCall style={{ fontSize: '16px' }} />;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'one-on-one') return '1:1 Meeting';
    if (type === 'group') return 'Group Session';
    if (type === 'team') return 'Team Meeting';
    return 'Meeting';
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-1 rounded-full text-xs font-semibold';
    if (status === 'scheduled') return `${base} bg-blue-100 text-blue-800`;
    if (status === 'in-progress') return `${base} bg-green-100 text-green-800 animate-pulse`;
    if (status === 'completed') return `${base} bg-slate-100 text-slate-800`;
    if (status === 'cancelled') return `${base} bg-red-100 text-red-800`;
    return base;
  };

  const getParticipantStatusBadge = (status?: string | null) => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-semibold';
    if (status === 'confirmed') return `${base} bg-green-100 text-green-800`;
    if (status === 'pending') return `${base} bg-yellow-100 text-yellow-800`;
    if (status === 'declined') return `${base} bg-red-100 text-red-800`;
    if (status === 'attended') return `${base} bg-purple-100 text-purple-800`;
    return null;
  };

  const getRegistrationStatusBadge = (status?: string | null) => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-semibold';
    if (status === 'registered') return `${base} bg-green-100 text-green-800`;
    if (status === 'cancelled') return `${base} bg-gray-100 text-gray-800`;
    return null;
  };

  // ── Calendar ─────────────────────────────────────────────────────────────────

  const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const getMeetingsForDay = (day: number) => {
    const y = currentMonth.getFullYear();
    const m = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${y}-${m}-${dd}`;

    const instructorMeetings = allMeetings
      .filter(
        (meeting) =>
          meeting.date === dateStr
          && (meeting.status === 'scheduled' || meeting.status === 'in-progress')
      )
      .map((meeting) => ({
        id: `legacy-${meeting.id}`,
        time: meeting.time,
        title: meeting.title,
        status: meeting.status,
        source: 'instructor' as const,
      }));

    const adminMeetings = platformMeetings
      .filter((meeting) => platformMeetingMatchesDay(meeting, dateStr))
      .map((meeting) => ({
        id: `platform-${meeting.id}`,
        time: formatTimeInTimezone(
          meeting.start_time,
          resolveMeetingTimezone(meeting.timezone)
        ),
        title: MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type_label,
        status: meeting.status === 'booked' ? 'scheduled' : meeting.status,
        source: 'admin' as const,
      }));

    return [...instructorMeetings, ...adminMeetings];
  };

  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const DAYS = ['S','M','T','W','T','F','S'];

  const PlatformMeetingListCard = ({ meeting }: { meeting: PlatformMeeting }) => {
    const isActive = isActivePlatformMeeting(meeting.status);
    const typeLabel = MEETING_TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type_label;
    const joinUrl = getMeetingJoinUrl(meeting);
    const providerLabel = getMeetingProviderLabel(meeting);
    const when = formatDateTimeInTimezone(
      meeting.start_time,
      resolveMeetingTimezone(meeting.timezone)
    );

    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
              <VideoCall style={{ fontSize: '16px' }} />
              Admin Session
            </span>
            <span className={getStatusBadge(isActive ? 'scheduled' : meeting.status === 'completed' ? 'completed' : 'cancelled')}>
              {isActive ? 'Upcoming' : meeting.status === 'completed' ? 'Completed' : 'Cancelled'}
            </span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>{typeLabel}</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <CalendarToday style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{when}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {joinUrl && isActive && (
              <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)',
                  color: 'white',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Video style={{ width: 14, height: 14 }} />
                Join {providerLabel}
              </a>
            )}
            {isActive && (
              <button
                type="button"
                onClick={() => handleCancelPlatformMeeting(meeting.id)}
                disabled={cancelPlatformMeeting.isPending}
                style={{
                  padding: '10px 16px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <X style={{ width: 14, height: 14 }} />
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Meeting Card ─────────────────────────────────────────────────────────────

  const MeetingCard = ({ meeting }: { meeting: Meeting }) => {
    const isMeetingToday = isToday(new Date(meeting.date));
    const isRegistered = meeting.my_registration_status === 'registered';
    const isConfirmedParticipant = meeting.my_participant_status === 'confirmed';
    
    // Can join if: (registered OR confirmed participant) AND meeting is in-progress OR (scheduled AND today)
    const canJoin = 
      (isRegistered || isConfirmedParticipant) && 
      (meeting.status === 'in-progress' || (meeting.status === 'scheduled' && isMeetingToday));
    
    const ps = meeting.my_participant_status;
    const rs = meeting.my_registration_status;
    const psBadge = getParticipantStatusBadge(ps);
    const rsBadge = getRegistrationStatusBadge(rs);

    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          marginBottom: '20px',
          transition: 'all 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            background:
              meeting.status === 'scheduled'
                ? 'linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%)'
                : meeting.status === 'completed'
                ? 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)'
                : 'linear-gradient(135deg,#f0fdf4 0%,#f8fafc 100%)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '500', color: '#475569' }}>
              {getMeetingIcon(meeting.type)}
              {getTypeLabel(meeting.type)}
            </span>
            <span className={getStatusBadge(meeting.status)}>
              {meeting.status === 'scheduled'
                ? 'Upcoming'
                : meeting.status === 'in-progress'
                ? 'Live Now'
                : meeting.status === 'completed'
                ? 'Completed'
                : 'Cancelled'}
            </span>
            {ps && psBadge && (
              <span className={psBadge}>
                {ps === 'confirmed' ? 'Confirmed' : ps === 'pending' ? 'Pending Response' : ps === 'declined' ? 'Declined' : 'Attended'}
              </span>
            )}
            {rs === 'registered' && rsBadge && (
              <span className={rsBadge}>
                Registered
              </span>
            )}
            {isMeetingToday && meeting.status === 'scheduled' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: '9999px', fontSize: '11px', fontWeight: '600' }}>
                <CalendarToday style={{ fontSize: '12px' }} /> Today
              </span>
            )}
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>{meeting.title}</h3>
          {meeting.description && (
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>{meeting.description}</p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <CalendarToday style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{formatDate(meeting.date)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <AccessTime style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{meeting.time} · {meeting.duration} min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <VideoCall style={{ fontSize: '14px', color: '#1e3a8a' }} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>
                {meeting.meeting_link ? 'Online Meeting' : 'No link yet'}
              </span>
            </div>
          </div>

          {/* Host + participant count */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <PersonAdd style={{ fontSize: '14px' }} />
              Host: {meeting.instructor
                ? `${meeting.instructor.first_name} ${meeting.instructor.last_name}`
                : 'Instructor'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#f8fafc', borderRadius: '9999px', width: 'fit-content' }}>
              <People style={{ fontSize: '12px', color: '#64748b' }} />
              <span style={{ fontSize: '12px', color: '#64748b' }}>{meeting.participants_count ?? 0} participants</span>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            {/* Join button for registered or confirmed participants */}
            {canJoin && (
              <button
                onClick={() => handleJoinMeeting(meeting)}
                style={{
                  flex: 1, background: 'linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)',
                  color: 'white', padding: '10px 16px', borderRadius: '12px',
                  fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <VideoCall style={{ fontSize: '14px' }} /> Join Meeting
              </button>
            )}

            {/* Pending invitation — confirm / decline */}
            {ps === 'pending' && meeting.status === 'scheduled' && (
              <>
                <button
                  onClick={() => handleConfirmAttendance(meeting.id)}
                  style={{
                    flex: 1, background: '#22c55e', color: 'white',
                    padding: '10px 16px', borderRadius: '12px', fontSize: '13px',
                    fontWeight: '600', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <CheckCircle style={{ fontSize: '14px' }} /> Confirm Attendance
                </button>
                <button
                  onClick={() => handleDeclineInvitation(meeting.id)}
                  style={{
                    flex: 1, background: '#ef4444', color: 'white',
                    padding: '10px 16px', borderRadius: '12px', fontSize: '13px',
                    fontWeight: '600', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  <Cancel style={{ fontSize: '14px' }} /> Decline
                </button>
              </>
            )}

            {/* Register button - show if not registered and not a participant */}
            {!isRegistered && !ps && meeting.status === 'scheduled' && (
              <button
                onClick={() => { setSelectedMeeting(meeting); setShowRegisterModal(true); }}
                style={{
                  flex: 1, background: '#8b5cf6', color: 'white',
                  padding: '10px 16px', borderRadius: '12px', fontSize: '13px',
                  fontWeight: '600', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <PersonAdd style={{ fontSize: '14px' }} /> Register for Meeting
              </button>
            )}

            {/* Cancel registration button */}
            {isRegistered && meeting.status === 'scheduled' && (
              <button
                onClick={() => handleCancelRegistration(meeting.id)}
                style={{
                  padding: '10px 16px', background: '#fef2f2', color: '#dc2626',
                  borderRadius: '12px', fontSize: '13px', fontWeight: '600',
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <Cancel style={{ fontSize: '14px' }} /> Cancel Registration
              </button>
            )}

            {/* Watch recording */}
            {meeting.status === 'completed' && meeting.recording_url && (
              <button
                onClick={() => window.open(meeting.recording_url, '_blank')}
                style={{
                  flex: 1, background: '#f1f5f9', color: '#475569',
                  padding: '10px 16px', borderRadius: '12px', fontSize: '13px',
                  fontWeight: '600', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                <PlayCircle style={{ fontSize: '14px' }} /> Watch Recording
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Register Modal ──────────────────────────────────────────────────────────

  const RegisterModal = () => {
    if (!selectedMeeting) return null;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
        }}
      >
        <div style={{ background: 'white', borderRadius: '24px', maxWidth: '450px', width: '100%', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '64px', height: '64px', background: '#ede9fe', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}
            >
              <PersonAdd style={{ fontSize: '28px', color: '#8b5cf6' }} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
              Register for Meeting
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b' }}>{selectedMeeting.title}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              Once registered, you'll be able to join the meeting
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => { setShowRegisterModal(false); setRegistrationNotes(''); }}
              style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', borderRadius: '12px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%)',
                color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                border: 'none', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <PersonAdd style={{ fontSize: '14px' }} /> Register Now
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '32px', background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '32px', fontWeight: '700',
            background: 'linear-gradient(135deg,#0f172a 0%,#334155 100%)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
          }}
        >
          My Meetings
        </h1>
        <p style={{ color: '#64748b', marginTop: '4px' }}>
          View invited sessions, book admin meetings, and join on Teams.
        </p>
      </div>

      <LearnerPlatformMeetingsPanel
        meetings={platformMeetings}
        isLoading={platformLoading}
        isFetching={platformFetching}
        onMeetingBooked={handlePlatformMeetingBooked}
        onCancelMeeting={handleCancelPlatformMeeting}
        cancelling={cancelPlatformMeeting.isPending}
      />

      {/* Calendar + instructor sessions */}
      <div className="mb-3">
        <p className="text-sm font-semibold text-slate-700">Calendar</p>
        <p className="text-xs text-slate-500 mt-1">
          Purple entries are admin sessions (booked by you or scheduled for you). Blue entries are instructor group invitations.
          Join admin sessions from <span className="font-medium">Sessions with Admin</span> above.
        </p>
      </div>

      {/* Calendar */}
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', overflow: 'hidden', opacity: platformFetching ? 0.7 : 1 }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#0f172a' }}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date())}
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '500', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}
            >
              Today
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { fn: () => setCurrentMonth((p) => subMonths(p, 1)), Icon: ChevronLeft },
              { fn: () => setCurrentMonth((p) => addMonths(p, 1)), Icon: ChevronRight },
            ].map(({ fn, Icon }, i) => (
              <button
                key={i}
                onClick={fn}
                style={{ padding: '8px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <Icon style={{ fontSize: '18px', color: '#475569' }} />
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #e2e8f0' }}>
          {DAYS.map((d, i) => (
            <div key={i} style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
              {d}
            </div>
          ))}
        </div>

        <div key={`calendar-${calendarRevision}-${platformMeetings.length}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
            <div key={`e-${i}`} style={{ minHeight: '90px', padding: '8px', background: '#fafbfc', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }} />
          ))}
          {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1).map((day) => {
            const today = new Date();
            const isT =
              day === today.getDate() &&
              currentMonth.getMonth() === today.getMonth() &&
              currentMonth.getFullYear() === today.getFullYear();
            const dayMeetings = getMeetingsForDay(day);
            return (
              <div
                key={day}
                style={{
                  minHeight: '90px', padding: '8px',
                  borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                  background: isT ? '#eff6ff' : 'white',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: isT ? '700' : '500', color: isT ? '#1e3a8a' : '#0f172a', marginBottom: '6px' }}>
                  {day}
                  {isT && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#1e3a8a' }}>Today</span>}
                </div>
                {dayMeetings.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    style={{
                      fontSize: '11px', padding: '3px 6px', marginBottom: '3px',
                      background: m.status === 'in-progress' ? '#dcfce7' : '#dbeafe',
                      color: m.status === 'in-progress' ? '#166534' : '#1e3a8a',
                      borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    title={`${m.time} ${m.title}`}
                  >
                    {m.time} {m.title}
                    {m.status === 'in-progress' && ' 🔴'}
                  </div>
                ))}
                {dayMeetings.length > 2 && (
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    +{dayMeetings.length - 2} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'upcoming' as const, label: 'Upcoming', Icon: Schedule },
          { id: 'in-progress' as const, label: 'Live Now', Icon: VideoCall },
          { id: 'completed' as const, label: 'Completed', Icon: CheckCircle },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '500',
              background: activeTab === id ? '#1e3a8a' : 'white',
              color: activeTab === id ? 'white' : '#64748b',
              border: activeTab === id ? 'none' : '1px solid #e2e8f0',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <Icon style={{ fontSize: '14px' }} /> {label}
          </button>
        ))}
      </div>

      {/* Meetings list */}
      {legacyLoading && platformMeetingsForList.length === 0 && meetings.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
          <div>Loading meetings…</div>
        </div>
      ) : platformMeetingsForList.length > 0 || meetings.length > 0 ? (
        <>
          {platformMeetingsForList.map((meeting) => (
            <PlatformMeetingListCard key={`platform-${meeting.id}`} meeting={meeting} />
          ))}
          {meetings.map((m) => <MeetingCard key={m.id} meeting={m} />)}
        </>
      ) : (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '48px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <VideoCall style={{ fontSize: '40px', color: '#94a3b8' }} />
          </div>
          <p style={{ color: '#64748b', marginBottom: '8px' }}>No {activeTab.replace('-', ' ')} meetings found</p>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>
            {activeTab === 'upcoming' || activeTab === 'in-progress'
              ? 'Upcoming and live lists show instructor invitations only. Admin sessions (including admin invitations) are managed in Sessions with Admin above.'
              : 'Completed admin sessions and instructor meetings appear here.'}
          </p>
        </div>
      )}

      {showRegisterModal && <RegisterModal />}
    </div>
  );
};

export default LearnerMeetings;