import api from './api';
import type {
  AvailabilitySlot,
  CreateSessionPayload,
  MentorSession,
  PaginatedSessions,
  UpdateSessionPayload,
} from '../types/microsoft';

const sessionService = {
  list: async (params?: Record<string, string | number>): Promise<PaginatedSessions> => {
    const response = await api.get('/sessions', { params }) as {
      success: boolean;
      data: MentorSession[];
      meta: PaginatedSessions['meta'];
    };
    return { data: response.data, meta: response.meta };
  },

  get: async (id: number): Promise<MentorSession> => {
    const response = await api.get(`/sessions/${id}`) as { success: boolean; data: MentorSession };
    return response.data;
  },

  getAvailability: async (mentorId: number, date: string, timezone = 'UTC'): Promise<AvailabilitySlot[]> => {
    const response = await api.get('/sessions/availability', {
      params: { mentor_id: mentorId, date, timezone },
    }) as { success: boolean; data: { slots: AvailabilitySlot[] } };
    return response.data.slots;
  },

  create: async (payload: CreateSessionPayload): Promise<MentorSession> => {
    const response = await api.post('/sessions', payload) as { success: boolean; data: MentorSession };
    return response.data;
  },

  update: async (id: number, payload: UpdateSessionPayload): Promise<MentorSession> => {
    const response = await api.put(`/sessions/${id}`, payload) as { success: boolean; data: MentorSession };
    return response.data;
  },

  cancel: async (id: number, reason?: string): Promise<void> => {
    await api.delete(`/sessions/${id}`, { data: { reason } });
  },
};

export default sessionService;
