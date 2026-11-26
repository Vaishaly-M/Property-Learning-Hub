'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAvailability } from '../../hooks/usePlatformMeetings';
import TimeSlotPicker from './TimeSlotPicker';
import type { AvailabilitySlot } from '../../types/platformMeetings';
import { DEFAULT_TIMEZONE } from '../../constants/timezone';
import { todayYmdInTimezone } from '../../utils/meetingTimezone';

interface AvailabilityCalendarProps {
  timezone?: string;
  selectedSlot?: AvailabilitySlot | null;
  onSelectSlot?: (slot: AvailabilitySlot | null) => void;
  onTimezoneResolved?: (timezone: string) => void;
}

export default function AvailabilityCalendar({
  timezone = DEFAULT_TIMEZONE,
  selectedSlot,
  onSelectSlot,
  onTimezoneResolved,
}: AvailabilityCalendarProps) {
  const [date, setDate] = useState(() => todayYmdInTimezone(timezone));
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useAvailability(date, timezone);

  useEffect(() => {
    if (data?.timezone) {
      onTimezoneResolved?.(data.timezone);
    }
  }, [data?.timezone, onTimezoneResolved]);

  useEffect(() => {
    setDate(todayYmdInTimezone(timezone));
  }, [timezone]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Select date</label>
          <input
            type="date"
            value={date}
            min={todayYmdInTimezone(timezone)}
            onChange={(e) => {
              setDate(e.target.value);
              onSelectSlot?.(null);
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Sync Outlook
        </button>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>
            Working hours: {data.working_hours.start} – {data.working_hours.end} ({data.timezone})
          </span>
          {data.synced_from === 'microsoft_graph' && (
            <span className="text-green-700">
              Live from Outlook/Teams
              {data.synced_at
                ? ` · ${new Date(data.synced_at).toLocaleTimeString()}`
                : dataUpdatedAt
                  ? ` · ${new Date(dataUpdatedAt).toLocaleTimeString()}`
                  : ''}
            </span>
          )}
        </div>
      )}

      <TimeSlotPicker
        slots={data?.slots ?? []}
        isLoading={isLoading}
        isError={isError}
        selectedStart={selectedSlot?.start}
        onSelect={(slot) => onSelectSlot?.(slot)}
      />
    </div>
  );
}
