import { DEFAULT_TIMEZONE } from '../constants/timezone';

const TIMEZONE_ALIASES: Record<string, string> = {
  'Australia/Auckland': 'Pacific/Auckland',
  UK: 'Europe/London',
  GB: 'Europe/London',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Europe/London',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central European Standard Time': 'Europe/Berlin',
};

export function resolveMeetingTimezone(timezone?: string | null): string {
  const value = timezone?.trim();
  if (!value) {
    return DEFAULT_TIMEZONE;
  }

  return TIMEZONE_ALIASES[value] ?? value;
}

export function meetingDisplayTimezone(
  meetingTimezone: string | null | undefined,
  displayTimezone: string
): string {
  return resolveMeetingTimezone(meetingTimezone || displayTimezone);
}

export function minutesFromMidnightInTimezone(iso: string, timeZone: string): number {
  const parts = getZonedParts(iso, timeZone);
  return parts.hour * 60 + parts.minute;
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getZonedParts(iso: string, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(new Date(iso));

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Mon';

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour') % 24,
    minute: value('minute'),
    weekday: WEEKDAY_INDEX[weekday] ?? 1,
  };
}

export function formatYmdInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function ymdToDate(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfWeekYmd(ymd: string, timeZone: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = getZonedParts(probe.toISOString(), timeZone).weekday;
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addDaysToYmd(ymd, -daysFromMonday);
}

export function zonedDayKey(iso: string, timeZone: string): string {
  const parts = getZonedParts(iso, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function ymdFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatTimeInTimezone(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateInTimezone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  return new Date(iso).toLocaleDateString('en-GB', { timeZone, ...options });
}

export function formatDateTimeInTimezone(iso: string, timeZone: string): string {
  return `${formatDateInTimezone(iso, timeZone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${formatTimeInTimezone(iso, timeZone)}`;
}

export function todayYmdInTimezone(timeZone: string): string {
  return formatYmdInTimezone(new Date(), timeZone);
}

export function startOfMonthYmd(ymd: string): string {
  const [year, month] = ymd.split('-');
  return `${year}-${month}-01`;
}

export function isTodayYmd(ymd: string, timeZone: string): boolean {
  return ymd === todayYmdInTimezone(timeZone);
}

export function formatWeekRangeYmd(startYmd: string, endYmd: string, timeZone: string): string {
  const formatPart = (value: string, withYear: boolean) => {
    const [year, month, day] = value.split('-').map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return probe.toLocaleDateString('en-GB', {
      timeZone,
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  };

  return `${formatPart(startYmd, false)} – ${formatPart(endYmd, true)}`;
}

export function formatWeekdayShortYmd(ymd: string, timeZone: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return probe.toLocaleDateString('en-GB', { timeZone, weekday: 'short' });
}

export function dayOfMonthYmd(ymd: string): number {
  return Number(ymd.split('-')[2]);
}

export function getCalendarRangeFromYmd(
  anchorYmd: string,
  viewMode: 'day' | 'week' | 'month',
  timeZone: string
): { from: string; to: string; timezone: string } {
  if (viewMode === 'day') {
    return { from: anchorYmd, to: anchorYmd, timezone: timeZone };
  }

  if (viewMode === 'month') {
    const monthStart = startOfMonthYmd(anchorYmd);
    const [year, month] = monthStart.split('-').map(Number);
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEnd = addDaysToYmd(nextMonth, -1);
    return { from: monthStart, to: monthEnd, timezone: timeZone };
  }

  const weekStart = startOfWeekYmd(anchorYmd, timeZone);
  const weekEnd = addDaysToYmd(weekStart, 6);
  return { from: weekStart, to: weekEnd, timezone: timeZone };
}

export function buildCalendarDayYmds(
  anchorYmd: string,
  viewMode: 'day' | 'week' | 'month',
  timeZone: string
): string[] {
  if (viewMode === 'day') {
    return [anchorYmd];
  }

  if (viewMode === 'month') {
    const monthStart = startOfMonthYmd(anchorYmd);
    const gridStart = startOfWeekYmd(monthStart, timeZone);
    return Array.from({ length: 42 }, (_, index) => addDaysToYmd(gridStart, index));
  }

  const weekStart = startOfWeekYmd(anchorYmd, timeZone);
  return Array.from({ length: 7 }, (_, index) => addDaysToYmd(weekStart, index));
}

/** @deprecated Use getCalendarRangeFromYmd with a YMD anchor in the display timezone. */
export function getCalendarRange(
  anchor: Date,
  viewMode: 'day' | 'week' | 'month',
  timeZone: string
): { from: string; to: string; timezone: string } {
  return getCalendarRangeFromYmd(formatYmdInTimezone(anchor, timeZone), viewMode, timeZone);
}

/** @deprecated Use buildCalendarDayYmds with a YMD anchor in the display timezone. */
export function buildCalendarDays(
  anchor: Date,
  viewMode: 'day' | 'week' | 'month',
  timeZone: string
): Date[] {
  const anchorYmd = formatYmdInTimezone(anchor, timeZone);
  return buildCalendarDayYmds(anchorYmd, viewMode, timeZone).map(ymdToDate);
}

/** @deprecated Use startOfWeekYmd(todayYmdInTimezone(timeZone), timeZone) instead. */
export function startOfWeekInTimezone(date: Date, timeZone: string): Date {
  const weekStartYmd = startOfWeekYmd(formatYmdInTimezone(date, timeZone), timeZone);
  return ymdToDate(weekStartYmd);
}
