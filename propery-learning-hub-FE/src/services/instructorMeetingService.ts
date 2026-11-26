// services/instructorMeetingService.ts
import api from './api';

export type MeetingType = 'one-on-one' | 'group' | 'team';
export type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'confirmed' | 'declined' | 'attended' | 'no-show';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

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
  left_at?: string;
  duration_attended: number;
}

export interface MeetingRegistration {
  id: number;
  meeting_id: number;
  learner_id: number;
  learner?: User;
  status: RegistrationStatus;
  registration_notes?: string;
  rejection_reason?: string;
  registered_at?: string;
  approved_at?: string;
  rejected_at?: string;
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
  zoom_meeting_id?: string;
  zoom_password?: string;
  waiting_room: boolean;
  allow_recording: boolean;
  recording_url?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  participants?: MeetingParticipant[];
  participants_count?: number;
  registrations?: MeetingRegistration[];
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  type: MeetingType;
  date: string;
  time: string;
  duration: number;
  meeting_link?: string;
  waiting_room?: boolean;
  allow_recording?: boolean;
  participant_ids?: number[];
}

export type UpdateMeetingPayload = Partial<CreateMeetingPayload>;

export interface MeetingIndexParams {
  status?: MeetingStatus | 'all';
  search?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

export interface DashboardStats {
  meetings: {
    total: number;
    upcoming: number;
    in_progress: number;
    completed: number;
    cancelled: number;
  };
  total_participants: number;
  pending_registrations: number;
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

// Response shape for user search (used when adding participants)
export interface UserSearchParams {
  search?: string;
  role?: string;
  per_page?: number;
  page?: number;
}

const BASE = '/instructor/meetings';

const instructorMeetingService = {
  // Dashboard stats
  getStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get(`${BASE}/stats`);
  },

  // CRUD
  getMeetings(params: MeetingIndexParams = {}): Promise<ApiResponse<PaginatedResponse<Meeting>>> {
    return api.get(BASE, { params });
  },

  createMeeting(payload: CreateMeetingPayload): Promise<ApiResponse<Meeting>> {
    return api.post(BASE, payload);
  },

  getMeeting(id: number): Promise<ApiResponse<Meeting>> {
    return api.get(`${BASE}/${id}`);
  },

  updateMeeting(id: number, payload: UpdateMeetingPayload): Promise<ApiResponse<Meeting>> {
    return api.put(`${BASE}/${id}`, payload);
  },

  deleteMeeting(id: number): Promise<ApiResponse<null>> {
    return api.delete(`${BASE}/${id}`);
  },

  // Status transitions
  startMeeting(id: number): Promise<ApiResponse<Meeting>> {
    return api.post(`${BASE}/${id}/start`);
  },

  completeMeeting(id: number): Promise<ApiResponse<Meeting>> {
    return api.post(`${BASE}/${id}/complete`);
  },

  cancelMeeting(id: number): Promise<ApiResponse<Meeting>> {
    return api.post(`${BASE}/${id}/cancel`);
  },

  // Participants
  getParticipants(
    meetingId: number,
    params?: { per_page?: number; page?: number }
  ): Promise<ApiResponse<PaginatedResponse<MeetingParticipant>>> {
    return api.get(`${BASE}/${meetingId}/participants`, { params });
  },

  addParticipants(meetingId: number, participantIds: number[]): Promise<ApiResponse<MeetingParticipant[]>> {
    return api.post(`${BASE}/${meetingId}/participants`, { participant_ids: participantIds });
  },

  removeParticipant(meetingId: number, userId: number): Promise<ApiResponse<null>> {
    return api.delete(`${BASE}/${meetingId}/participants/${userId}`);
  },

  updateParticipantStatus(
    meetingId: number,
    userId: number,
    status: 'confirmed' | 'declined'
  ): Promise<ApiResponse<MeetingParticipant>> {
    return api.patch(`${BASE}/${meetingId}/participants/${userId}/status`, { status });
  },

  // Registrations
  getRegistrations(
    meetingId: number,
    params?: { status?: RegistrationStatus; per_page?: number; page?: number }
  ): Promise<ApiResponse<PaginatedResponse<MeetingRegistration>>> {
    return api.get(`${BASE}/${meetingId}/registrations`, { params });
  },

  approveRegistration(meetingId: number, registrationId: number): Promise<ApiResponse<MeetingRegistration>> {
    return api.post(`${BASE}/${meetingId}/registrations/${registrationId}/approve`);
  },

  rejectRegistration(
    meetingId: number,
    registrationId: number,
    reason?: string
  ): Promise<ApiResponse<MeetingRegistration>> {
    return api.post(`${BASE}/${meetingId}/registrations/${registrationId}/reject`, { reason });
  },

  bulkApproveRegistrations(meetingId: number, registrationIds: number[]): Promise<ApiResponse<null>> {
    return api.post(`${BASE}/${meetingId}/registrations/bulk-approve`, {
      registration_ids: registrationIds,
    });
  },

  /**
   * Search users to add as participants.
   * Hits the shared /users endpoint (adjust path to match your actual API).
   */
  searchUsers(params: UserSearchParams = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    return api.get('/users', { params });
  },
};

export default instructorMeetingService;