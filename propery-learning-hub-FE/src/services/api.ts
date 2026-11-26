//services/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use(
  (config) => {
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
  },
  (error) => Promise.reject(error)
);

// Handle responses and errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      const data = error.response?.data;
      const isMicrosoftError = data?.error === 'microsoft_graph_error';
      const isUnauthenticated =
        data?.message === 'Unauthenticated.' ||
        data?.message === 'Unauthenticated';

      if (typeof window !== 'undefined' && isUnauthenticated && !isMicrosoftError) {
        localStorage.removeItem('token');
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('token');

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    const message =
      error.response?.data?.message || error.message || 'Request failed';

    const enrichedError = new Error(message) as Error & {
      errors?: Record<string, string[]>;
      status?: number;
    };
    enrichedError.errors = error.response?.data?.errors;
    enrichedError.status = status;

    return Promise.reject(enrichedError);
  }
);

export default api;