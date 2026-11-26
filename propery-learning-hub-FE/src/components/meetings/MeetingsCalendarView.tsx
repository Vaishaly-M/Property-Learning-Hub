'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Video, X, CalendarClock } from 'lucide-react';
import type { PlatformMeeting, AvailabilitySlot } from '../../types/platformMeetings';
import { isActivePlatformMeeting, getMeetingJoinUrl, getMeetingProviderLabel, getAllMeetingParticipants } from '../../types/platformMeetings';
import { DEFAULT_TIMEZONE } from '../../constants/timezone';
import AvailabilityCalendar from './AvailabilityCalendar';
import {
  addDaysToYmd,
  buildCalendarDayYmds,
  dayOfMonthYmd,
  formatDateInTimezone,
  formatTimeInTimezone,
  formatWeekRangeYmd,
  formatWeekdayShortYmd,
  isTodayYmd,
  resolveMeetingTimezone,
  meetingDisplayTimezone,
  minutesFromMidnightInTimezone,
  startOfMonthYmd,
  startOfWeekYmd,
  todayYmdInTimezone,
  zonedDayKey,
} from '../../utils/meetingTimezone';

export type CalendarViewMode = 'day' | 'week' | 'month';

const HOUR_START = 8;
const HOUR_END = 18;
const HOUR_HEIGHT = 56;

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  scheduled: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
  booked: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900' },
  rescheduled: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900' },
  completed: { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-700' },
  cancelled: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700 line-through' },
};

function formatTime(iso: string, timeZone: string): string {
  return formatTimeInTimezone(iso, timeZone);
}

function getMeetingDayKey(meeting: PlatformMeeting, displayTimezone: string): string {
  const timeZone = meetingDisplayTimezone(meeting.timezone, displayTimezone);
  return meeting.local_date ?? zonedDayKey(meeting.start_time, timeZone);
}

function getEventStyle(meeting: PlatformMeeting, displayTimezone: string) {
  const timeZone = meetingDisplayTimezone(meeting.timezone, displayTimezone);
  const startMinutes = minutesFromMidnightInTimezone(meeting.start_time, timeZone);
  const endMinutes = minutesFromMidnightInTimezone(meeting.end_time, timeZone);
  const gridStart = HOUR_START * 60;
  const gridEnd = HOUR_END * 60;

  const clampedStart = Math.max(startMinutes, gridStart);
  const clampedEnd = Math.min(endMinutes, gridEnd);

  if (clampedEnd <= gridStart || clampedStart >= gridEnd) {
    return null;
  }

  const top = ((clampedStart - gridStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT, 28);

  return { top, height };
}

interface MeetingsCalendarViewProps {
  meetings: PlatformMeeting[];
  anchorYmd: string;
  onAnchorChange: (ymd: string) => void;
  onCancel?: (id: number) => void;
  onReschedule?: (
    id: number,
    payload: { start_time: string; end_time: string; timezone: string }
  ) => Promise<void>;
  rescheduling?: boolean;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
  showViewModeToggle?: boolean;
  showParticipant?: boolean;
  displayTimezone?: string;
}

function MeetingDetailPanel({
  selected,
  onClose,
  onCancel,
  onReschedule,
  rescheduling = false,
  showParticipant,
  displayTimezone,
}: {
  selected: PlatformMeeting;
  onClose: () => void;
  onCancel?: (id: number) => void;
  onReschedule?: (
    id: number,
    payload: { start_time: string; end_time: string; timezone: string }
  ) => Promise<void>;
  rescheduling?: boolean;
  showParticipant?: boolean;
  displayTimezone: string;
}) {
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const timeZone = meetingDisplayTimezone(selected.timezone, displayTimezone);
  const joinUrl = getMeetingJoinUrl(selected);
  const providerLabel = getMeetingProviderLabel(selected);
  const attendees = getAllMeetingParticipants(selected);

  const handleConfirmReschedule = async () => {
    if (!onReschedule || !selectedSlot) return;

    await onReschedule(selected.id, {
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      timezone: timeZone,
    });
    setRescheduleMode(false);
    setSelectedSlot(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sticky top-4 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{selected.meeting_type_label}</h3>
          <p className="text-xs capitalize text-slate-500 mt-0.5">{selected.status}</p>
        </div>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100">
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {showParticipant && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-2">
          <p className="text-slate-500 text-xs">
            {attendees.length === 1 ? 'Participant' : `Participants (${attendees.length})`}
          </p>
          {attendees.map((participant) => (
            <div key={participant.email}>
              <p className="font-medium text-slate-900">{participant.name}</p>
              <p className="text-slate-600 text-xs">{participant.email}</p>
            </div>
          ))}
          {selected.phone && <p className="text-slate-600 text-xs pt-1">Phone: {selected.phone}</p>}
        </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500 text-xs">Date</p>
          <p className="font-medium text-slate-900">
            {formatDateInTimezone(selected.start_time, timeZone)}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-slate-500 text-xs">Time</p>
          <p className="font-medium text-slate-900">
            {formatTime(selected.start_time, timeZone)} – {formatTime(selected.end_time, timeZone)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{timeZone}</p>
        </div>
      </div>

      {selected.notes && !rescheduleMode && (
        <div className="text-sm">
          <p className="text-slate-500 text-xs mb-1">Notes</p>
          <p className="text-slate-700">{selected.notes}</p>
        </div>
      )}

      {rescheduleMode ? (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-900">Select a new date and time</p>
          <p className="text-xs text-slate-500">
            All participants will receive an email with the updated schedule and join link.
          </p>
          <AvailabilityCalendar
            timezone={timeZone}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || rescheduling}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              <CalendarClock className="w-4 h-4" />
              {rescheduling ? 'Saving...' : 'Confirm Reschedule'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRescheduleMode(false);
                setSelectedSlot(null);
              }}
              disabled={rescheduling}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
      <div className="flex flex-col gap-2 pt-2">
        {joinUrl && isActivePlatformMeeting(selected.status) && (
          <a
            href={joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800"
          >
            <Video className="w-4 h-4" />
            Join {providerLabel}
          </a>
        )}
        {onReschedule && isActivePlatformMeeting(selected.status) && (
          <button
            type="button"
            onClick={() => setRescheduleMode(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-amber-200 text-amber-800 text-sm hover:bg-amber-50"
          >
            <CalendarClock className="w-4 h-4" />
            Reschedule
          </button>
        )}
        {onCancel && isActivePlatformMeeting(selected.status) && (
          <button
            type="button"
            onClick={() => onCancel(selected.id)}
            className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
          >
            Cancel Meeting
          </button>
        )}
      </div>
      )}
    </div>
  );
}

export default function MeetingsCalendarView({
  meetings,
  anchorYmd,
  onAnchorChange,
  onCancel,
  onReschedule,
  rescheduling = false,
  viewMode = 'week',
  onViewModeChange,
  showViewModeToggle = false,
  showParticipant = false,
  displayTimezone = DEFAULT_TIMEZONE,
}: MeetingsCalendarViewProps) {
  const [selected, setSelected] = useState<PlatformMeeting | null>(null);

  useEffect(() => {
    if (!selected) return;
    const updated = meetings.find((meeting) => meeting.id === selected.id);
    if (updated) {
      setSelected(updated);
    }
  }, [meetings, selected?.id]);

  const dayYmds = useMemo(
    () => buildCalendarDayYmds(anchorYmd, viewMode, displayTimezone),
    [anchorYmd, viewMode, displayTimezone]
  );

  const hours = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i),
    []
  );

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, PlatformMeeting[]>();

    dayYmds.forEach((ymd) => {
      map.set(ymd, []);
    });

    meetings.forEach((meeting) => {
      const dayKey = getMeetingDayKey(meeting, displayTimezone);
      if (map.has(dayKey)) {
        map.get(dayKey)?.push(meeting);
      }
    });

    return map;
  }, [meetings, dayYmds, displayTimezone]);

  const monthAnchorYmd = startOfMonthYmd(anchorYmd);
  const colCount = viewMode === 'day' ? 1 : 7;

  const headerLabel = useMemo(() => {
    if (viewMode === 'day') {
      const [year, month, day] = anchorYmd.split('-').map(Number);
      const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return probe.toLocaleDateString('en-GB', {
        timeZone: displayTimezone,
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    if (viewMode === 'month') {
      const [year, month] = monthAnchorYmd.split('-').map(Number);
      const probe = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
      return probe.toLocaleDateString('en-GB', {
        timeZone: displayTimezone,
        month: 'long',
        year: 'numeric',
      });
    }
    return formatWeekRangeYmd(dayYmds[0], dayYmds[dayYmds.length - 1], displayTimezone);
  }, [viewMode, anchorYmd, monthAnchorYmd, dayYmds, displayTimezone]);

  const navigatePrev = () => {
    if (viewMode === 'day') onAnchorChange(addDaysToYmd(anchorYmd, -1));
    else if (viewMode === 'month') {
      const [year, month] = monthAnchorYmd.split('-').map(Number);
      const prev = month === 1 ? `${year - 1}-12-01` : `${year}-${String(month - 1).padStart(2, '0')}-01`;
      onAnchorChange(prev);
    } else onAnchorChange(addDaysToYmd(anchorYmd, -7));
  };

  const navigateNext = () => {
    if (viewMode === 'day') onAnchorChange(addDaysToYmd(anchorYmd, 1));
    else if (viewMode === 'month') {
      const [year, month] = monthAnchorYmd.split('-').map(Number);
      const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
      onAnchorChange(next);
    } else onAnchorChange(addDaysToYmd(anchorYmd, 7));
  };

  const goToday = () => {
    const today = todayYmdInTimezone(displayTimezone);
    if (viewMode === 'day') onAnchorChange(today);
    else if (viewMode === 'month') onAnchorChange(startOfMonthYmd(today));
    else onAnchorChange(startOfWeekYmd(today, displayTimezone));
  };

  const handleCancel = (id: number) => {
    onCancel?.(id);
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={navigatePrev}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={navigateNext}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {showViewModeToggle && onViewModeChange && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-0 sm:ml-2">
              {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  className={`px-3 py-1.5 text-sm font-medium capitalize ${
                    viewMode === mode
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-700">
          {headerLabel}
          <span className="block text-xs font-normal text-slate-500 mt-0.5">{displayTimezone}</span>
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {viewMode === 'month' ? (
          <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                <div key={label} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {dayYmds.map((ymd) => {
                const dayMeetings = meetingsByDay.get(ymd) ?? [];
                const inMonth = ymd.startsWith(monthAnchorYmd.slice(0, 7));
                const isToday = isTodayYmd(ymd, displayTimezone);

                return (
                  <div
                    key={ymd}
                    className={`min-h-[88px] p-2 border-b border-r border-slate-100 text-left ${
                      !inMonth ? 'bg-slate-50/50 text-slate-400' : ''
                    } ${isToday ? 'bg-blue-50/40' : ''}`}
                  >
                    <span
                      className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? 'bg-blue-900 text-white' : ''
                      }`}
                    >
                      {dayOfMonthYmd(ymd)}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayMeetings.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelected(m)}
                          className="w-full text-left text-[10px] truncate px-1 py-0.5 rounded bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors"
                        >
                          {formatTime(m.start_time, meetingDisplayTimezone(m.timezone, displayTimezone))}{' '}
                          {m.meeting_type_label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={viewMode === 'day' ? 'min-w-[320px]' : 'min-w-[720px]'}>
              <div
                className={`grid border-b border-slate-200 bg-slate-50`}
                style={{ gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}
              >
                <div />
                {dayYmds.map((ymd) => {
                  const isToday = isTodayYmd(ymd, displayTimezone);
                  return (
                    <div
                      key={ymd}
                      className={`px-2 py-3 text-center border-l border-slate-200 ${isToday ? 'bg-blue-50' : ''}`}
                    >
                      {viewMode !== 'day' && (
                        <p className="text-xs text-slate-500 uppercase">
                          {formatWeekdayShortYmd(ymd, displayTimezone)}
                        </p>
                      )}
                      <p
                        className={`text-lg font-semibold mt-0.5 ${
                          isToday ? 'text-blue-900' : 'text-slate-800'
                        }`}
                      >
                        {dayOfMonthYmd(ymd)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid relative"
                style={{ gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}
              >
                <div className="border-r border-slate-100">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="relative border-b border-slate-100 text-[10px] text-slate-400 pr-1 text-right"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      <span className="absolute -top-2 right-1">
                        {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                      </span>
                    </div>
                  ))}
                </div>

                {dayYmds.map((ymd) => {
                  const dayMeetings = meetingsByDay.get(ymd) ?? [];
                  const isToday = isTodayYmd(ymd, displayTimezone);

                  return (
                    <div
                      key={ymd}
                      className={`relative border-l border-slate-100 ${isToday ? 'bg-blue-50/30' : ''}`}
                      style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}
                    >
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-b border-slate-100"
                          style={{ top: (hour - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        />
                      ))}

                      {dayMeetings.map((meeting) => {
                        const style = getEventStyle(meeting, displayTimezone);
                        if (!style) return null;

                        const statusStyle = STATUS_STYLES[meeting.status] ?? STATUS_STYLES.scheduled;
                        const isSelected = selected?.id === meeting.id;

                        return (
                          <button
                            key={meeting.id}
                            type="button"
                            onClick={() => setSelected(meeting)}
                            className={`absolute left-1 right-1 rounded-md border-l-4 px-1.5 py-1 text-left overflow-hidden shadow-sm transition-all ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text} ${
                              isSelected ? 'ring-2 ring-blue-500 z-10' : 'hover:brightness-95'
                            }`}
                            style={{ top: style.top, height: style.height, minHeight: 28 }}
                          >
                            <p className="text-[11px] font-semibold truncate leading-tight">
                              {showParticipant ? meeting.name : meeting.meeting_type_label}
                            </p>
                            <p className="text-[10px] opacity-80 truncate">
                              {formatTime(meeting.start_time, meetingDisplayTimezone(meeting.timezone, displayTimezone))} –{' '}
                              {formatTime(meeting.end_time, meetingDisplayTimezone(meeting.timezone, displayTimezone))}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="w-full lg:w-80 flex-shrink-0">
          {selected ? (
            <MeetingDetailPanel
              selected={selected}
              onClose={() => setSelected(null)}
              onCancel={onCancel ? handleCancel : undefined}
              onReschedule={onReschedule}
              rescheduling={rescheduling}
              showParticipant={showParticipant}
              displayTimezone={displayTimezone}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Select a meeting on the calendar to view details and join link.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use YMD-based navigation helpers from meetingTimezone instead. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** @deprecated Use addDaysToYmd instead. */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
