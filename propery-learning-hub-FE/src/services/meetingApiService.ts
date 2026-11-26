import api from './api';
import type { BookMeetingPayload, PaginatedMeetings, PlatformMeeting } from '../types/platformMeetings';

const meetingApiService = {
  list: async (params?: Record<string, string | number>): Promise<PaginatedMeetings> => {
    const response = await api.get('/my-meetings', { params }) as {
      success: boolean;
      data: PlatformMeeting[];
      meta: PaginatedMeetings['meta'];
    };
    return { data: response.data, meta: response.meta };
  },

  listAllAdmin: async (params?: Record<string, string | number>): Promise<PaginatedMeetings> => {
    const response = await api.get('/admin/meetings', { params }) as {
      success: boolean;
      data: PlatformMeeting[];
      meta: PaginatedMeetings['meta'];
    };
    return { data: response.data, meta: response.meta };
  },

  get: async (id: number): Promise<PlatformMeeting> => {
    const response = await api.get(`/meetings/${id}`) as { success: boolean; data: PlatformMeeting };
    return response.data;
  },

  book: async (payload: BookMeetingPayload): Promise<PlatformMeeting> => {
    const response = await api.post('/public/book-meeting', payload) as {
      success: boolean;
      data?: PlatformMeeting;
      message?: string;
    };

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to book meeting.');
    }

    return response.data;
  },

  reschedule: async (id: number, payload: { start_time: string; end_time: string; timezone?: string }) => {
    const response = await api.put(`/meetings/${id}/reschedule`, payload) as {
      success: boolean;
      data?: PlatformMeeting;
      message?: string;
    };

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to reschedule meeting.');
    }

    return response.data;
  },

  cancel: async (id: number): Promise<void> => {
    await api.put(`/meetings/${id}/cancel`);
  },
};

export default meetingApiService;
