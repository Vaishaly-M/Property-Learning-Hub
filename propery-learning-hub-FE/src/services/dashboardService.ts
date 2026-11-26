// services/dashboardService.ts
//
// Wraps every learner-dashboard API endpoint.
// Uses the shared axios instance from services/api.ts (with auto-token + 401 redirect).

import api from './api';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from './mediaUploadService';
import { infinitWizardService } from './infinitWizardService';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardData {
  stats: DashboardStats;
  videoLessons: VideoLesson[];
  upcomingMeetings: UpcomingMeeting[];
  upcomingWebinars: UpcomingWebinar[];
  recentDeals: RecentDeal[];
  contractTemplates: ContractTemplatePreview[];
  notifications: NotificationItem[];
  quickStats: QuickStats;
}

export interface DashboardStats {
  courseProgress: StatCard;
  meetingsBooked: StatCard;
  savedDeals: StatCard;
  notifications: StatCard & { unread: number };
}

export interface StatCard {
  value: string;
  raw: number;
  trend: string;
  label: string;
}

export interface QuickStats {
  latestVideoLessons: number;
  upcomingWebinars: number;
  newDeals: number;
  contractTemplates: number;
}

// In dashboardService.ts, update the VideoLesson interface:
export interface VideoLesson {
  id: number;
  title: string;
  instructor: string;
  duration: string | number | null;
  progress: number;
  category: string;
  thumbnail: string;
  courseId: number | null;
  courseTitle: string | null;
  contentId?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  // Add these for API compatibility
  url?: string;
  file_url?: string;
  video_file?: string;
  media_url?: string;
  thumbnail_url?: string;
  image?: string;
  image_url?: string;
  course_id?: number | null;
}

export interface UpcomingMeeting {
  id: number;
  title: string;
  date: string;
  time: string;
  type: string;
  status: string;
}

export interface UpcomingWebinar {
  id: number;
  title: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  category: string;
  level: string;
  instructor: string;
  registrationStatus?: string | null;
  paymentStatus?: string | null;
  amountPaid?: string | number | null;
  rejectionReason?: string | null;
  price?: number;
}

export interface RecentDeal {
  id: number;
  title: string;
  location: string;
  price: string;
  roi: string;
  capRate: string;
  status: string;
  propertyType: string;
  featured: boolean;
  saved?: boolean;
}

export interface ContractTemplatePreview {
  id: number;
  name: string;
  description: string;
  price: number;
  purchased: boolean;
  popular: boolean;
  hasFile: boolean;
  category: string;
}

export interface NotificationItem {
  id: string | number;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'course' | 'webinar' | 'deal' | 'system';
  link?: string | null;
}

export interface LearnerProfile {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string | null;
  bio: string | null;
  timezone: string | null;
  website: string | null;
  linkedin: string | null;
  role: string;
  rawRole: string;
  avatarUrl: string | null;
  joinedAt: string;
  settings?: {
    email_notifications: boolean;
    theme: string;
    language: string;
  };
}

export interface LearningStats {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalLessonsCompleted: number;
  totalWatchHours: number;
  webinarsAttended: number;
  meetingsAttended: number;
  streakDays: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const dashboardService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────

  /** Full aggregated dashboard payload (one request). */
  async getDashboard(): Promise<DashboardData> {
    const res: any = await api.get('/learner/dashboard');
    if (res?.success && res?.data) {
      return res.data as DashboardData;
    }
    if (res?.data) {
      return res.data as DashboardData;
    }
    throw new Error(res?.message || 'Failed to load dashboard data.');
  },

  /** Stat cards only — lightweight polling endpoint. */
  async getStats(): Promise<DashboardStats> {
    const res: any = await api.get('/learner/dashboard/stats');
    return res.data as DashboardStats;
  },

  /** Notification / updates feed. */
  async getActivity(): Promise<NotificationItem[]> {
    const res: any = await api.get('/learner/dashboard/activity');
    return (res.data ?? []) as NotificationItem[];
  },

  /**
   * Open InfinitWizard: creates/activates IW account for this learner,
   * assigns VIP, returns auto-login redirect URL + Passport access_token
   * (used for one-click Invoice / CRM / InfinitDoc SSO).
   */
  async openInfinitWizard(): Promise<{
    redirect_url: string;
    access_token: string;
    email: string;
    created: boolean;
  }> {
    return infinitWizardService.openAsLearner();
  },

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(): Promise<LearnerProfile> {
    const res: any = await api.get('/learner/profile');
    return res.data as LearnerProfile;
  },

  async updateProfile(payload: Partial<LearnerProfile>): Promise<LearnerProfile> {
    const res: any = await api.put('/learner/profile', payload);
    return res.data as LearnerProfile;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const form = new FormData();
    await appendMediaToFormData(form, file, MEDIA_UPLOAD_PRESETS.avatar);
    const res: any = await api.post('/learner/profile/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { avatarUrl: res.avatarUrl };
  },

  async changePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }): Promise<void> {
    await api.put('/learner/profile/password', payload);
  },

  async getLearningStats(): Promise<LearningStats> {
    const res: any = await api.get('/learner/profile/learning-stats');
    return res.data as LearningStats;
  },

  // ── Notifications ──────────────────────────────────────────────────────────

  async getNotifications(params?: { unread?: boolean; per_page?: number; page?: number }) {
    const res: any = await api.get('/learner/notifications', { params });
    return res;
  },

  async getUnreadCount(): Promise<number> {
    const res: any = await api.get('/learner/notifications/unread-count');
    return res.data?.count ?? 0;
  },

  async markNotificationRead(id: string | number): Promise<void> {
    await api.post(`/learner/notifications/${id}/read`);
  },

  async markAllNotificationsRead(syntheticIds: string[] = []): Promise<void> {
    await api.post('/learner/notifications/mark-all-read', {
      synthetic_ids: syntheticIds,
    });
  },

  async deleteNotification(id: string | number): Promise<void> {
    await api.delete(`/learner/notifications/${id}`);
  },

  // ── Deals (favorites) ──────────────────────────────────────────────────────

  async getFavoriteDeals(params?: { search?: string; per_page?: number; page?: number }) {
    const res: any = await api.get('/learner/deals/favorites', { params });
    return res;
  },

  async toggleDealFavorite(dealId: number): Promise<{ saved: boolean }> {
    const res: any = await api.post(`/learner/deals/${dealId}/favorite`);
    const saved = res?.data?.saved ?? res?.saved;
    return { saved: Boolean(saved) };
  },

  async getDealFavoriteStatus(dealId: number): Promise<{ saved: boolean }> {
    const res: any = await api.get(`/learner/deals/${dealId}/favorite/status`);
    return res.data;
  },

  // ── Courses ────────────────────────────────────────────────────────────────

  async getMyCourses(params?: { status?: string; sort?: string; order?: string }) {
    const res: any = await api.get('/learner/courses/my-enrollments', { params });
    return res.data;
  },

  async enrollInCourse(courseId: number) {
    const res: any = await api.post(`/learner/courses/${courseId}/enroll`);
    return res.data;
  },

  async updateLessonProgress(
    courseId: number,
    lessonId: number,
    payload: { watch_time: number; total_duration?: number }
  ) {
    const res: any = await api.post(
      `/learner/courses/${courseId}/lessons/${lessonId}/progress`,
      payload
    );
    return res.data;
  },

  async completeLesson(courseId: number, lessonId: number) {
    const res: any = await api.post(
      `/learner/courses/${courseId}/lessons/${lessonId}/complete`
    );
    return res.data;
  },

  // ── Content / Videos ──────────────────────────────────────────────────────────

async getVideoUrl(
  contentId: number
): Promise<{ video_url: string; thumbnail_url?: string | null }> {
  const res: any = await api.get(
    `/learner/content/${contentId}/video-url`
  );

  const payload = res?.data?.video_url
    ? res.data
    : res?.data?.data?.video_url
      ? res.data.data
      : res;

  if (!payload?.video_url) {
    throw new Error(
      res?.message ||
      res?.data?.message ||
      'Video URL was not returned by the server.'
    );
  }

  return {
    video_url: payload.video_url,
    thumbnail_url: payload.thumbnail_url ?? null,
  };
},

  // ── Meetings ───────────────────────────────────────────────────────────────

  async getMyMeetingRegistrations(params?: { status?: string; per_page?: number }) {
    const res: any = await api.get('/learner/meetings/my-registrations', { params });
    return res.data;
  },

  async registerForMeeting(meetingId: number, notes?: string) {
    const res: any = await api.post(`/learner/meetings/${meetingId}/register`, {
      registration_notes: notes,
    });
    return res.data;
  },

  async cancelMeetingRegistration(meetingId: number) {
    const res: any = await api.delete(`/learner/meetings/${meetingId}/register`);
    return res.data;
  },

  async joinMeeting(meetingId: number): Promise<{ meeting_link: string }> {
    const res: any = await api.post(`/learner/meetings/${meetingId}/join`);
    return res.data;
  },

  // ── Webinars ───────────────────────────────────────────────────────────────

  async getMyWebinarRegistrations(params?: { status?: string; per_page?: number }) {
    const res: any = await api.get('/learner/webinars/my-registrations', { params });
    return res.data;
  },

  async registerForWebinar(webinarId: number) {
    const res: any = await api.post(`/learner/webinars/${webinarId}/register`);
    return res.data;
  },

  async cancelWebinarRegistration(webinarId: number) {
    const res: any = await api.delete(`/learner/webinars/${webinarId}/register`);
    return res.data;
  },

  async requestRecordingAccess(webinarId: number, message?: string) {
    const res: any = await api.post(`/learner/webinars/${webinarId}/recording/request`, {
      message,
    });
    return res.data;
  },

  async getRecordingStreamUrl(webinarId: number): Promise<{ stream_url: string }> {
    const res: any = await api.get(`/learner/webinars/${webinarId}/recording/stream`);
    return res;
  },

  // ── Contracts ──────────────────────────────────────────────────────────────

  async getContracts(params?: { search?: string; category?: string }) {
    const res: any = await api.get('/learner/contracts', { params });
    return res.data;
  },

  async getPurchasedContracts() {
    const res: any = await api.get('/learner/contracts/purchased');
    return res.data;
  },

  async purchaseContract(contractId: number) {
    const res: any = await api.post(`/learner/contracts/${contractId}/purchase`);
    return res.data;
  },

  async downloadContract(contractId: number): Promise<string> {
    // Returns a URL; use window.open(url) or an <a download> tag
    const res: any = await api.get(`/learner/contracts/${contractId}/download`);
    return res.data?.fileUrl ?? res.url ?? '';
  },
};

export default dashboardService;