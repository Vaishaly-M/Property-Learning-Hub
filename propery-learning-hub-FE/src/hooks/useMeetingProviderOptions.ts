'use client';

import { useEffect, useMemo } from 'react';
import { useAvailability } from './usePlatformMeetings';
import { DEFAULT_TIMEZONE } from '../constants/timezone';
import type { MeetingProvider } from '../types/platformMeetings';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useMeetingProviderOptions(timezone: string = DEFAULT_TIMEZONE) {
  const { data } = useAvailability(todayIso(), timezone);

  return useMemo(() => {
    const providers = (data?.meeting_providers?.length ? data.meeting_providers : ['teams']) as MeetingProvider[];

    return {
      providers,
      defaultProvider: (data?.default_meeting_provider ?? 'teams') as MeetingProvider,
      zoomEnabled: data?.zoom_enabled ?? providers.includes('zoom'),
      showSelector: providers.length > 1,
    };
  }, [data]);
}

/** Keeps meetingProvider valid when Zoom is disabled server-side. */
export function useSyncedMeetingProvider(
  meetingProvider: MeetingProvider,
  setMeetingProvider: (value: MeetingProvider) => void,
  timezone?: string,
) {
  const { providers, defaultProvider } = useMeetingProviderOptions(timezone);

  useEffect(() => {
    if (!providers.includes(meetingProvider)) {
      setMeetingProvider(defaultProvider);
    }
  }, [providers, defaultProvider, meetingProvider, setMeetingProvider]);
}
