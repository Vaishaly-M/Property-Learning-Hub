import api from './api';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from './mediaUploadService';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type WebinarStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type WebinarCategory = 'market' | 'investment' | 'tax' | 'legal' | 'beginner';
export type WebinarLevel = 'beginner' | 'intermediate' | 'advanced';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'registered' | 'cancelled' | 'waitlisted';
export type RecordingAccessStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export type ParticipantType = 'my_learners' | 'all_learners' | 'all_others';

export interface LearningObjective {
  id: number;
  webinar_id: number;
  objective: string;
  sort_order: number;
}

export interface WebinarTag {
  id: number;
  webinar_id: number;
  tag: string;
}

export interface Learner {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface WebinarRegistration {
  id: number;
  webinar_id: number;
  learner_id: number;
  learner?: Learner;
  status: RegistrationStatus;
  attended: boolean;
  watch_time?: number;
  payment_status?: string;
  payment_reference?: string;
  amount_paid?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  joined_at?: string;
  left_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WebinarRecordingAccess {
  id: number;
  webinar_id: number;
  learner_id: number;
  learner?: Learner;
  status: RecordingAccessStatus;
  request_message?: string;
  rejection_reason?: string;
  approved_at?: string;
  rejected_at?: string;
  expires_at?: string;
  download_count: number;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PastRecording {
  id: number;
  instructor_id: number;
  title: string;
  description: string;
  video_path: string;
  video_url: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  recorded_at: string;
  duration: number;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Webinar {
  id: number;
  instructor_id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  category: WebinarCategory;
  level: WebinarLevel;
  price: string;
  max_attendees: number;
  participant_type: ParticipantType;
  status: WebinarStatus;
  live_link?: string;
  replay_link?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  recording_path?: string;
  recording_url?: string;
  recording_original_name?: string;
  recording_size?: number;
  recording_mime_type?: string;
  materials_url?: string;
  avg_watch_time?: string;
  engagement_rate?: string;
  satisfaction_score?: string;
  peak_attendees?: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  learning_objectives?: LearningObjective[];
  tags?: WebinarTag[];
  registrations?: WebinarRegistration[];
  registrations_count?: number;
  // Zoom Webinar integration fields
  zoom_webinar_id?: string | null;
  zoom_join_url?: string | null;
  zoom_start_url?: string | null;
  zoom_uuid?: string | null;
  zoom_password?: string | null;
  zoom_registration_url?: string | null;
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

// ─────────────────────────────────────────────
// Request payloads
// ─────────────────────────────────────────────

export interface CreateWebinarPayload {
  title: string;
  description: string;
  date: string;
  time: string;
  duration: 30 | 45 | 60 | 90 | 120;
  category: WebinarCategory;
  level: WebinarLevel;
  price: number;
  max_attendees: number;
  participant_type: ParticipantType;
  live_link?: string;
  learning_objectives?: string[];
  tags?: string[];
  thumbnail?: File;
  participate_email?: string;
}

export type UpdateWebinarPayload = Partial<CreateWebinarPayload>;

export interface WebinarIndexParams {
  status?: WebinarStatus | 'all';
  search?: string;
  per_page?: number;
  page?: number;
}

export interface RegistrationIndexParams {
  status?: RegistrationStatus;
  per_page?: number;
  page?: number;
}

export interface RecordingAccessIndexParams {
  status?: RecordingAccessStatus;
  per_page?: number;
  page?: number;
}

export interface MarkAttendancePayload {
  attended: boolean;
  watch_time?: number;
}

export interface ApproveRecordingAccessPayload {
  expires_days?: number;
}

export interface RejectRegistrationPayload {
  reason?: string;
}

export interface RejectRecordingAccessPayload {
  reason?: string;
}

export interface BulkApprovePayload {
  registration_ids: number[];
}

export interface DashboardStats {
  webinars: {
    total: number;
    upcoming: number;
    live: number;
    completed: number;
    cancelled: number;
  };
  registrations: {
    total: number;
    approved: number;
    attended: number;
  };
  pending_recording_requests: number;
}

export interface WebinarAnalytics {
  total_registered: number;
  total_attended: number;
  attendance_rate: number;
  avg_watch_time: number;
  content_retention: number;
  peak_attendees?: number;
  engagement_rate?: string;
  satisfaction_score?: string;
  recording: {
    total_requests: number;
    approved_requests: number;
    pending_requests: number;
    total_downloads: number;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function buildWebinarFormData(payload: Record<string, unknown>): Promise<FormData> {
  const fd = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;

    if (key === 'thumbnail' && value instanceof File) {
      await appendMediaToFormData(fd, value, MEDIA_UPLOAD_PRESETS.webinarThumbnail);
    } else if (value instanceof File) {
      fd.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (item !== undefined && item !== null) {
          fd.append(`${key}[${idx}]`, String(item));
        }
      });
    } else {
      fd.append(key, String(value));
    }
  }

  return fd;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

const BASE = '/instructor/webinars';

const webinarService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────

  getStats(): Promise<ApiResponse<DashboardStats>> {
    return api.get(`${BASE}/stats`);
  },

  // ── CRUD ───────────────────────────────────────────────────────────────────

  getWebinars(
    params: WebinarIndexParams = {}
  ): Promise<ApiResponse<PaginatedResponse<Webinar>>> {
    return api.get(BASE, { params });
  },

  async createWebinar(
    payload: CreateWebinarPayload
  ): Promise<ApiResponse<Webinar>> {
    const fd = await buildWebinarFormData(payload as unknown as Record<string, unknown>);
    return api.post(BASE, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getWebinar(id: number): Promise<ApiResponse<Webinar>> {
    return api.get(`${BASE}/${id}`);
  },

  async updateWebinar(
    id: number,
    payload: UpdateWebinarPayload
  ): Promise<ApiResponse<Webinar>> {
    const fd = await buildWebinarFormData(payload as unknown as Record<string, unknown>);
    fd.append('_method', 'PUT');
    return api.post(`${BASE}/${id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteWebinar(id: number): Promise<ApiResponse<null>> {
    return api.delete(`${BASE}/${id}`);
  },

  // ── Status transitions ──────────────────────────────────────────────────────

  startWebinar(id: number): Promise<ApiResponse<Webinar>> {
    return api.post(`${BASE}/${id}/start`);
  },

  completeWebinar(id: number): Promise<ApiResponse<Webinar>> {
    return api.post(`${BASE}/${id}/complete`);
  },

  cancelWebinar(id: number): Promise<ApiResponse<Webinar>> {
    return api.post(`${BASE}/${id}/cancel`);
  },

  // ── Analytics ──────────────────────────────────────────────────────────────

  getWebinarAnalytics(id: number): Promise<ApiResponse<WebinarAnalytics>> {
    return api.get(`${BASE}/${id}/analytics`);
  },

  // ── Registrations ──────────────────────────────────────────────────────────

  getRegistrations(
    webinarId: number,
    params: RegistrationIndexParams = {}
  ): Promise<ApiResponse<PaginatedResponse<WebinarRegistration>>> {
    return api.get(`${BASE}/${webinarId}/registrations`, { params });
  },

  approveRegistration(
    webinarId: number,
    registrationId: number
  ): Promise<ApiResponse<WebinarRegistration>> {
    return api.post(`${BASE}/${webinarId}/registrations/${registrationId}/approve`);
  },

  rejectRegistration(
    webinarId: number,
    registrationId: number,
    payload: RejectRegistrationPayload = {}
  ): Promise<ApiResponse<WebinarRegistration>> {
    return api.post(
      `${BASE}/${webinarId}/registrations/${registrationId}/reject`,
      payload
    );
  },

  bulkApproveRegistrations(
    webinarId: number,
    payload: BulkApprovePayload
  ): Promise<ApiResponse<null>> {
    return api.post(`${BASE}/${webinarId}/registrations/bulk-approve`, payload);
  },

  markAttendance(
    webinarId: number,
    registrationId: number,
    payload: MarkAttendancePayload
  ): Promise<ApiResponse<WebinarRegistration>> {
    return api.patch(
      `${BASE}/${webinarId}/registrations/${registrationId}/attendance`,
      payload
    );
  },

  exportRegistrants(webinarId: number): Promise<Blob> {
    return api.get(`${BASE}/${webinarId}/registrations/export`, {
      responseType: 'blob',
    });
  },

  sendReminders(webinarId: number): Promise<ApiResponse<null>> {
    return api.post(`${BASE}/${webinarId}/send-reminders`);
  },

  // ── Recording management ───────────────────────────────────────────────────

  async uploadRecording(
    webinarId: number,
    file: File,
    onUploadProgress?: (percent: number) => void
  ): Promise<ApiResponse<{ recording_original_name: string; recording_size: number }>> {
    const fd = new FormData();
    await appendMediaToFormData(fd, file, {
      ...MEDIA_UPLOAD_PRESETS.webinarRecording,
      onProgress: onUploadProgress,
    });
    return api.post(`${BASE}/${webinarId}/recording`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (e) => {
            if (e.total) {
              onUploadProgress(Math.round((e.loaded * 100) / e.total));
            }
          }
        : undefined,
    });
  },

  deleteRecording(webinarId: number): Promise<ApiResponse<null>> {
    return api.delete(`${BASE}/${webinarId}/recording`);
  },

  streamRecording(
    webinarId: number
  ): Promise<ApiResponse<{ stream_url: string; expires_in: number }>> {
    return api.get(`${BASE}/${webinarId}/recording/stream`);
  },

  // ── Recording access requests ──────────────────────────────────────────────

  getRecordingAccessRequests(
    webinarId: number,
    params: RecordingAccessIndexParams = {}
  ): Promise<ApiResponse<PaginatedResponse<WebinarRecordingAccess>>> {
    return api.get(`${BASE}/${webinarId}/recording-access`, { params });
  },

  approveRecordingAccess(
    webinarId: number,
    accessId: number,
    payload: ApproveRecordingAccessPayload = {}
  ): Promise<ApiResponse<WebinarRecordingAccess>> {
    return api.post(
      `${BASE}/${webinarId}/recording-access/${accessId}/approve`,
      payload
    );
  },

  rejectRecordingAccess(
    webinarId: number,
    accessId: number,
    payload: RejectRecordingAccessPayload = {}
  ): Promise<ApiResponse<WebinarRecordingAccess>> {
    return api.post(
      `${BASE}/${webinarId}/recording-access/${accessId}/reject`,
      payload
    );
  },

  revokeRecordingAccess(
    webinarId: number,
    accessId: number
  ): Promise<ApiResponse<null>> {
    return api.post(
      `${BASE}/${webinarId}/recording-access/${accessId}/revoke`
    );
  },

  // ── Past Recordings ─────────────────────────────────────────────────────────

  getPastRecordings(): Promise<ApiResponse<PastRecording[]>> {
    return api.get(`${BASE}/past-recordings`);
  },

  async uploadPastRecording(
    payload: {
      title: string;
      description: string;
      recorded_at: string;
      duration: number;
      video: File;
      thumbnail?: File;
    },
    onUploadProgress?: (percent: number) => void
  ): Promise<ApiResponse<PastRecording>> {
    const fd = new FormData();
    fd.append('title', payload.title);
    fd.append('description', payload.description);
    fd.append('recorded_at', payload.recorded_at);
    fd.append('duration', String(payload.duration ?? ''));
    await appendMediaToFormData(fd, payload.video, {
      ...MEDIA_UPLOAD_PRESETS.pastRecordingVideo,
      onProgress: onUploadProgress,
    });
    if (payload.thumbnail) {
      await appendMediaToFormData(fd, payload.thumbnail, MEDIA_UPLOAD_PRESETS.webinarThumbnail);
    }
    
    return api.post(`${BASE}/past-recordings`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (e) => {
            if (e.total) {
              onUploadProgress(Math.round((e.loaded * 100) / e.total));
            }
          }
        : undefined,
    });
  },

  deletePastRecording(id: number): Promise<ApiResponse<null>> {
    return api.delete(`${BASE}/past-recordings/${id}`);
  },
};

export default webinarService;