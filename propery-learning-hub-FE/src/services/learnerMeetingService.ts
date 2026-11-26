// services/learner/learnerMeetingService.ts
import api from './api';

export type MeetingType = 'one-on-one' | 'group' | 'team';
export type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'confirmed' | 'declined' | 'attended' | 'no-show';
export type RegistrationStatus = 'registered' | 'cancelled';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface MeetingParticipant {
  id: number;
  meeting_id: number;
  user_id: number;
  user?: User;
  role: string;
  status: ParticipantStatus;
  invited_at?: string;
  responded_at?: string;
  joined_at?: string;
}

export interface MeetingRegistration {
  id: number;
  meeting_id: number;
  learner_id: number;
  status: RegistrationStatus;
  registration_notes?: string;
  rejection_reason?: string;
  registered_at?: string;
  approved_at?: string;
  rejected_at?: string;
  meeting?: Meeting;
}

export interface Meeting {
  id: number;
  instructor_id: number;
  instructor?: User;
  title: string;
  description?: string;
  type: MeetingType;
  date: string;
  time: string;
  duration: number;
  status: MeetingStatus;
  meeting_link?: string;
  waiting_room: boolean;
  allow_recording: boolean;
  recording_url?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  participants?: MeetingParticipant[];
  participants_count?: number;
  // Appended by backend per-learner
  my_participant_status?: ParticipantStatus | null;
  my_registration_status?: RegistrationStatus | null;
  can_join?: boolean;
  is_full?: boolean;
}

export interface MeetingIndexParams {
  status?: 'upcoming' | 'completed' | 'in-progress';
  search?: string;
  per_page?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

const BASE = '/learner/meetings';

const learnerMeetingService = {
  /**
   * Get meetings the learner has been invited to.
   */
  getMeetings(params: MeetingIndexParams = {}): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    return api.get(BASE, { params });
  },

  /**
   * Alias — same as getMeetings.
   */
  getInvitedMeetings(params: MeetingIndexParams = {}): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    return api.get(`${BASE}/invited`, { params });
  },

  getMeeting(id: number): Promise<ApiResponse<Meeting>> {
    return api.get(`${BASE}/${id}`);
  },

  // ---- Registration ----

  /**
   * Register for a meeting (creates a pending registration awaiting instructor approval).
   */
  register(meetingId: number, registrationNotes?: string): Promise<ApiResponse<MeetingRegistration>> {
    return api.post(`${BASE}/${meetingId}/register`, {
      registration_notes: registrationNotes || undefined,
    });
  },

  /**
   * Cancel own registration.
   */
  cancelRegistration(meetingId: number): Promise<ApiResponse<null>> {
    return api.delete(`${BASE}/${meetingId}/register`);
  },

  /**
   * Get the learner's own registration history.
   */
  getMyRegistrations(params?: {
    status?: RegistrationStatus;
    per_page?: number;
    page?: number;
  }): Promise<ApiResponse<PaginatedResponse<MeetingRegistration>>> {
    return api.get(`${BASE}/my-registrations`, { params });
  },

  // ---- Participant actions ----

  /**
   * Get the join link for a confirmed meeting (records joined_at).
   */
  joinMeeting(meetingId: number): Promise<ApiResponse<{ meeting_link: string; meeting: Meeting }>> {
    return api.post(`${BASE}/${meetingId}/join`);
  },

  /**
   * Confirm attendance to a pending invitation.
   */
  confirmAttendance(meetingId: number): Promise<ApiResponse<null>> {
    return api.post(`${BASE}/${meetingId}/confirm`);
  },

  /**
   * Decline a pending invitation.
   */
  declineInvitation(meetingId: number): Promise<ApiResponse<null>> {
    return api.post(`${BASE}/${meetingId}/decline`);
  },
};

export default learnerMeetingService;