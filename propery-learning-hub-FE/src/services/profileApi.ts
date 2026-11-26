// services/profileApi.ts
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from './mediaUploadService';
import { downloadAuthenticatedFile } from '../utils/downloadFile';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// API utility function for users
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem('token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: defaultHeaders,
      ...options,
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      
      const errorText = await response.text();
      let errorData: any = null;
      try {
        errorData = errorText ? JSON.parse(errorText) : null;
      } catch {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const validationError = errorData?.errors
        ? Object.values(errorData.errors).flat()[0]
        : null;

      const errorMessage =
        (typeof validationError === 'string' ? validationError : null) ||
        errorData?.message ||
        errorData?.error ||
        `API request failed: ${response.status} ${response.statusText}`;

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request error for ${endpoint}:`, error);
    throw error;
  }
};

// For file uploads
const apiFormDataRequest = async (
  endpoint: string,
  formData: FormData
) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Session expired');
    }
    
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `API request failed: ${response.status}`);
    } catch (error) {
      throw new Error(`API request failed: ${response.status}`);
    }
  }

  return response.json();
};

// Profile API functions
export const profileAPI = {
  // Get user data
  getUser: () => apiRequest('/user'),

  // Get complete profile
  getCompleteProfile: async () => {
    try {
      return await apiRequest('/profile/complete');
    } catch (error) {
      console.log('Complete profile endpoint failed, trying regular profile...');
      return await apiRequest('/profile');
    }
  },

  // Update profile (handles all fields including name, job title, company)
  updateProfile: (profileData: any) => apiRequest('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),

  // Update profile picture
  updateProfilePicture: async (imageFile: File) => {
    const formData = new FormData();
    await appendMediaToFormData(formData, imageFile, MEDIA_UPLOAD_PRESETS.learnerProfilePhoto);
    return apiFormDataRequest('/profile/picture', formData);
  },

  // Proof of address
  uploadProofOfAddress: async (file: File) => {
    const formData = new FormData();
    await appendMediaToFormData(formData, file, MEDIA_UPLOAD_PRESETS.proofOfAddress);
    return apiFormDataRequest('/profile/proof-of-address', formData);
  },

  downloadProofOfAddress: async (fileName?: string) => {
    await downloadAuthenticatedFile(
      `${API_BASE_URL}/profile/proof-of-address`,
      fileName || 'proof-of-address',
    );
  },

  deleteProofOfAddress: () =>
    apiRequest('/profile/proof-of-address', { method: 'DELETE' }),

  // Settings
  updateSettings: (settings: any) => apiRequest('/profile/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),

  // Change password
  changePassword: (passwordData: any) => apiRequest('/profile/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData),
  }),

  // Certificates
  getCertificates: () => apiRequest('/profile/certificates'),

  // Activities
  getActivities: () => apiRequest('/profile/activities'),

  // Badges
  getBadges: () => apiRequest('/profile/badges'),

  // Payment history
  getPaymentHistory: () => apiRequest('/profile/payments'),

  // Export data
  exportData: () => apiRequest('/profile/export'),

  // Delete account
  deleteAccount: (password: string) => apiRequest('/profile/account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  }),

  // Update subscription
  updateSubscription: (subscriptionData: any) => apiRequest('/profile/subscription', {
    method: 'PUT',
    body: JSON.stringify(subscriptionData),
  }),

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
};