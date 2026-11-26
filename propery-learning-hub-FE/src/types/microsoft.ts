export interface MicrosoftAccount {
  id: number;
  email: string;
  display_name: string | null;
  microsoft_user_id: string;
  expires_at: string;
  connected: boolean;
  connected_at: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  label: string;
}

export interface MentorSession {
  id: number;
  mentor_id: number;
  student_id: number;
  event_id: string | null;
  meeting_id: string | null;
  join_url: string | null;
  subject: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'cancelled' | 'completed' | 'rescheduled';
  timezone: string;
  mentor?: { id: number; name: string; email: string };
  student?: { id: number; name: string; email: string };
  created_at?: string;
  updated_at?: string;
}

export interface CreateSessionPayload {
  mentor_id?: number;
  student_id?: number;
  subject: string;
  description?: string;
  start_time: string;
  end_time: string;
  timezone?: string;
}

export interface UpdateSessionPayload {
  subject?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
}

export interface PaginatedSessions {
  data: MentorSession[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
