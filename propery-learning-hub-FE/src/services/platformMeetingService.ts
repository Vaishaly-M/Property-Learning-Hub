import axios from 'axios';
import type { AvailabilityResponse, BookMeetingPayload, PaginatedMeetings, PlatformMeeting } from '../types/platformMeetings';
import { DEFAULT_TIMEZONE } from '../constants/timezone';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const publicApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

publicApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

publicApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const message = data?.message || error.message || 'Request failed';
    const enrichedError = new Error(message) as Error & {
      status?: number;
      errorCode?: string;
    };
    enrichedError.status = error.response?.status;
    enrichedError.errorCode = data?.error;
    throw enrichedError;
  }
);

const platformMeetingService = {
  getPlatformTimezone: async (): Promise<string> => {
    const response = await publicApi.get('/platform-timezone') as {
      success: boolean;
      data?: { timezone?: string };
    };
    return response.data?.timezone || DEFAULT_TIMEZONE;
  },

  getAvailability: async (date: string, timezone?: string): Promise<AvailabilityResponse> => {
    const response = await publicApi.get('/meetings/available-slots', {
      params: { date, timezone },
    }) as { success: boolean; data: AvailabilityResponse };
    return response.data;
  },

  bookMeeting: async (payload: BookMeetingPayload): Promise<PlatformMeeting> => {
    const response = await publicApi.post('/public/book-meeting', payload) as {
      success: boolean;
      data: PlatformMeeting;
    };
    return response.data;
  },
};

export default platformMeetingService;
