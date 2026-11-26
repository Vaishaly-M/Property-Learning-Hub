export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
}

export type MeetingProvider = 'teams' | 'zoom';

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  slot_duration_minutes: number;
  working_hours: { start: string; end: string };
  meeting_types: string[];
  meeting_providers?: MeetingProvider[];
  default_meeting_provider?: MeetingProvider;
  zoom_enabled?: boolean;
  slots: AvailabilitySlot[];
  synced_from?: string;
  synced_at?: string;
}

export interface MeetingParticipant {
  name: string;
  email: string;
}

export interface PlatformMeeting {
  id: number;
  uuid?: string;
  user_id: number | null;
  booking_type?: 'public' | 'learner' | 'mentor';
  name: string;
  email: string;
  phone?: string | null;
  participants?: MeetingParticipant[];
  all_participants?: MeetingParticipant[];
  meeting_type: string;
  meeting_type_label: string;
  meeting_provider?: MeetingProvider;
  meeting_provider_label?: string;
  event_id: string | null;
  teams_join_url: string | null;
  provider_join_url?: string | null;
  join_url?: string | null;
  start_time: string;
  end_time: string;
  local_date?: string;
  local_start_time?: string;
  local_end_time?: string;
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled' | 'booked';
  public_status?: string;
  notes: string | null;
  timezone: string;
  reschedule_url?: string | null;
  cancel_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BookMeetingPayload {
  name?: string;
  email?: string;
  phone?: string;
  meeting_type: string;
  topic?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  notes?: string;
  participants?: MeetingParticipant[];
  meeting_provider?: MeetingProvider;
}

export interface PaginatedMeetings {
  data: PlatformMeeting[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const MEETING_TYPE_LABELS: Record<string, string> = {
  discovery_call: 'Discovery Call',
  // Legacy alias — display only for older bookings.
  strategy_call: 'Strategy Call',
  mentorship_session: 'Mentorship Session',
  property_consultation: 'Property Consultation',
  general_inquiry: 'General Inquiry',
};

/** Types shown in the Book Meeting dropdown (excludes legacy aliases). */
export const BOOKABLE_MEETING_TYPES: Array<keyof typeof MEETING_TYPE_LABELS> = [
  'discovery_call',
  'mentorship_session',
  'property_consultation',
  'general_inquiry',
];

const ACTIVE_MEETING_STATUSES = new Set(['scheduled', 'rescheduled', 'booked']);

export function isActivePlatformMeeting(status: string): boolean {
  return ACTIVE_MEETING_STATUSES.has(status);
}

export function getMeetingJoinUrl(meeting: Pick<PlatformMeeting, 'join_url' | 'provider_join_url' | 'teams_join_url'>): string | null {
  return meeting.join_url ?? meeting.provider_join_url ?? meeting.teams_join_url ?? null;
}

export function getMeetingProviderLabel(meeting: Pick<PlatformMeeting, 'meeting_provider' | 'meeting_provider_label'>): string {
  if (meeting.meeting_provider_label) return meeting.meeting_provider_label;
  return meeting.meeting_provider === 'zoom' ? 'Zoom' : 'Microsoft Teams';
}

export function getProviderInviteLabel(provider?: MeetingProvider): string {
  return provider === 'zoom' ? 'Zoom' : 'Microsoft Teams';
}

export function getAllMeetingParticipants(
  meeting: Pick<PlatformMeeting, 'name' | 'email' | 'participants' | 'all_participants'>
): MeetingParticipant[] {
  if (meeting.all_participants?.length) {
    return meeting.all_participants;
  }

  const primary: MeetingParticipant = { name: meeting.name, email: meeting.email };
  const extras = meeting.participants ?? [];
  const seen = new Set([meeting.email.toLowerCase()]);

  return [
    primary,
    ...extras.filter((participant) => {
      const email = participant.email.toLowerCase();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    }),
  ];
}
