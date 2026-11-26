// config/api.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// API utility functions
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem('admin_token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: defaultHeaders,
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin');
      window.location.href = '/admin/login';
      throw new Error('Session expired');
    }
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.status}`);
  }

  return response.json();
};

// Specific API functions for admin
export const adminAPI = {
  // Auth
  login: (email: string, password: string) => 
    apiRequest('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => 
    apiRequest('/admin/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => 
    apiRequest('/admin/auth/profile'),

  // Settings
  getSettings: (group?: string) => 
    apiRequest(`/admin/settings${group ? `?group=${group}` : ''}`),

  saveSettings: (group: string, settings: any) =>
    apiRequest('/admin/settings/save', {
      method: 'POST',
      body: JSON.stringify({ group, settings }),
    }),

  // Users
  getUsers: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/admin/users${queryString}`);
  },

  createUser: (userData: any) =>
    apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  // Activity Logs
  getActivityLogs: (params?: any) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/admin/activity-logs${queryString}`);
  },
};