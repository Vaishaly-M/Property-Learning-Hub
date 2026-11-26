import api from './api';
import type { MicrosoftAccount } from '../types/microsoft';

const microsoftService = {
  getAuthUrl: async (): Promise<{ auth_url: string }> => {
    const response = await api.get('/auth/microsoft') as { success: boolean; auth_url: string };
    return { auth_url: response.auth_url };
  },

  getStatus: async (): Promise<{ connected: boolean; data: MicrosoftAccount | null }> => {
    const response = await api.get('/auth/microsoft/status') as {
      success: boolean;
      connected: boolean;
      data: MicrosoftAccount | null;
    };
    return { connected: response.connected, data: response.data };
  },

  disconnect: async (): Promise<void> => {
    await api.post('/auth/microsoft/disconnect');
  },
};

export default microsoftService;
