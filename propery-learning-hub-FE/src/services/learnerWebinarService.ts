import api from './api';
import { downloadAuthenticatedFile } from '../utils/downloadFile';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ─────────────────────────────────────────────
// Types (shared with instructor side)
// ─────────────────────────────────────────────

export type WebinarStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type WebinarCategory = 'market' | 'investment' | 'tax' | 'legal' | 'beginner';
export type WebinarLevel = 'beginner' | 'intermediate' | 'advanced';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'registered' | 'cancelled' | 'waitlisted';
export type RecordingAccessStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

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

export interface Instructor {
  id: number;
  first_name: string;
  last_name: string;
}

export interface Webinar {
  id: number;
  instructor_id: number;
  instructor?: Instructor;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  category: WebinarCategory;
  level: WebinarLevel;
  price: string;
  max_attendees: number;
  status: WebinarStatus;
  live_link?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  recording_path?: string;
  recording_url?: string;
  recording_original_name?: string;
  created_at: string;
  updated_at: string;
  learning_objectives?: LearningObjective[];
  tags?: WebinarTag[];
  total_registrations?: number;
  // Appended by backend for current learner
  my_registration_status?: RegistrationStatus | null;
  my_registration?: WebinarRegistration | null;
  my_recording_access?: WebinarRecordingAccess | null;
  is_full?: boolean;
  has_recording?: boolean;
  can_join_live?: boolean;
}

export interface WebinarRegistration {
  id: number;
  webinar_id: number;
  learner_id: number;
  status: RegistrationStatus;
  attended: boolean;
  watch_time?: number;
  payment_status?: string;
  amount_paid?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  webinar?: Webinar;
}

export interface WebinarRecordingAccess {
  id: number;
  webinar_id: number;
  learner_id: number;
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

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface WebinarPaymentIntent {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  formatted_amount: string;
  publishable_key: string;
}

export interface RegistrationFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  experience_level: string;
  expectations: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface WebinarIndexParams {
  status?: WebinarStatus | 'all';
  category?: WebinarCategory;
  level?: WebinarLevel;
  search?: string;
  price_type?: 'free' | 'paid';
  per_page?: number;
  page?: number;
}

export interface RegistrationIndexParams {
  status?: RegistrationStatus;
  per_page?: number;
  page?: number;
}

export interface CancelRegistrationResult {
  refunded: boolean;
  refund_amount?: string;
  formatted_amount?: string;
  currency?: string;
  already_refunded?: boolean;
}

// ─────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────

const BASE = '/learner/webinars';

const learnerWebinarService = {
  // ── Browse ─────────────────────────────────────────────────────────────────

  getWebinars(
    params: WebinarIndexParams = {}
  ): Promise<ApiResponse<PaginatedResponse<Webinar>>> {
    return api.get(BASE, { params });
  },

  getWebinar(id: number): Promise<ApiResponse<Webinar & {
    my_registration: WebinarRegistration | null;
    my_recording_access: WebinarRecordingAccess | null;
    is_full: boolean;
    has_recording: boolean;
  }>> {
    return api.get(`${BASE}/${id}`);
  },

  // ── My Registrations ───────────────────────────────────────────────────────

  getMyRegistrations(
    params: RegistrationIndexParams = {}
  ): Promise<ApiResponse<PaginatedResponse<WebinarRegistration>>> {
    return api.get(`${BASE}/my-registrations`, { params });
  },

  register(webinarId: number, paymentIntentId?: string): Promise<ApiResponse<WebinarRegistration>> {
    return api.post(`${BASE}/${webinarId}/register`, paymentIntentId ? { payment_intent_id: paymentIntentId } : {});
  },

  createRegistrationPaymentIntent(webinarId: number): Promise<ApiResponse<{
    client_secret: string;
    payment_intent_id: string;
    amount: number;
    currency: string;
    formatted_amount: string;
    publishable_key: string;
  }>> {
    return api.post(`${BASE}/${webinarId}/payment-intent`);
  },

  cancelRegistration(webinarId: number): Promise<ApiResponse<CancelRegistrationResult>> {
    return api.delete(`${BASE}/${webinarId}/register`);
  },

  joinLiveWebinar(webinarId: number): Promise<ApiResponse<{ live_link: string; attended: boolean }>> {
    return api.post(`${BASE}/${webinarId}/join`, {});
  },

  // ── Recording Access ───────────────────────────────────────────────────────

  getMyRecordingAccess(
    webinarId: number
  ): Promise<ApiResponse<WebinarRecordingAccess | null>> {
    return api.get(`${BASE}/${webinarId}/recording-access`);
  },

  requestRecordingAccess(
    webinarId: number,
    message?: string
  ): Promise<ApiResponse<WebinarRecordingAccess>> {
    return api.post(`${BASE}/${webinarId}/recording-access/request`, { message });
  },

  downloadRecording(webinarId: number, fileName?: string): Promise<void> {
    return downloadAuthenticatedFile(
      `${API_BASE}${BASE}/${webinarId}/recording/download`,
      fileName
    );
  },

  streamRecording(
    webinarId: number
  ): Promise<ApiResponse<{ stream_url: string; expires_in: number }>> {
    return api.get(`${BASE}/${webinarId}/recording/stream`);
  },
};

export default learnerWebinarService;