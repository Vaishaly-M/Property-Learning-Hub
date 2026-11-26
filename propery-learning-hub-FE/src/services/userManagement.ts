import api from './api';

export interface User {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: 'learner' | 'instructor' | 'admin';
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  membership: 'free' | 'premium' | 'elite';
  progress: {
    videos: number;
    documents: number;
    completed: number;
  } | null;
  joined_date: string;
  last_active: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  proof_of_address?: {
    uploaded: boolean;
    original_name?: string | null;
    mime?: string | null;
    size?: number | null;
    uploaded_at?: string | null;
  } | null;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  performed_by: string | null;
  performed_by_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminNote {
  id: string;
  user_id: string;
  admin_id: string;
  note: string;
  created_at: string;
  updated_at: string;
  admin?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface UserStats {
  total_users: number;
  active_users: number;
  pending_users: number;
  suspended_users: number;
  inactive_users: number;
  learners: number;
  instructors: number;
  admins: number;
  membership_breakdown: {
    free: number;
    premium: number;
    elite: number;
  };
  new_users_today: number;
  new_users_this_week: number;
  new_users_this_month: number;
  registration_trend: Array<{
    date: string;
    count: number;
  }>;
}

export interface NormalizedPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface UsersWithStatsResponse {
  success: boolean;
  data: User[];
  pagination: NormalizedPagination;
  stats?: UserStats;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: NormalizedPagination;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePagination(raw: any): NormalizedPagination {
  const body =
    raw?.data &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data) &&
    raw.data.data
      ? raw.data
      : raw;

  const src = body?.pagination ?? body?.meta ?? body ?? {};

  return {
    current_page: Number(src.current_page ?? 1),
    per_page: Number(src.per_page ?? 15),
    total: Number(src.total ?? 0),
    last_page: Number(src.last_page ?? src.pageCount ?? 1),
  };
}

function normalizeData<T>(raw: any): T[] {
  if (
    raw?.data &&
    typeof raw.data === 'object' &&
    !Array.isArray(raw.data) &&
    Array.isArray(raw.data.data)
  ) {
    return raw.data.data;
  }

  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw)) return raw;

  return [];
}

// ---------------------------------------------------------------------------

class UserManagementService {
  private baseUrl = '/admin/users';

  async getUsers(params?: {
    page?: number;
    per_page?: number;
    status?: string;
    role?: string;
    membership?: string;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    includeStats?: boolean;
  }): Promise<UsersWithStatsResponse> {
    const queryParams = new URLSearchParams();

    if (params) {
      const { includeStats, ...rest } = params;

      Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all' && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      if (includeStats) {
        queryParams.append('include', 'stats');
      }
    }

    const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await api.get(url);
    const raw = response.data;

    return {
      success: raw?.success ?? true,
      data: normalizeData<User>(raw),
      pagination: normalizePagination(raw),
      stats: raw?.stats ?? raw?.data?.stats ?? undefined,
    };
  }

  async getStats(): Promise<ApiResponse<UserStats>> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  async getUser(userId: string): Promise<{
    user: User;
    profile: any;
    activity_history: ActivityLog[];
    admin_notes: AdminNote[];
  }> {
    // api interceptor already returns response.data (= Laravel JSON body)
    const body = await api.get(`${this.baseUrl}/${userId}`) as ApiResponse<{
      user: User;
      profile: any;
      activity_history: ActivityLog[];
      admin_notes: AdminNote[];
    }>;

    return body.data ?? (body as unknown as {
      user: User;
      profile: any;
      activity_history: ActivityLog[];
      admin_notes: AdminNote[];
    });
  }

  async createUser(userData: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password: string;
    password_confirmation: string;
    role: string;
    status?: string;
    membership?: string;
  }): Promise<ApiResponse<User>> {
    const response = await api.post(this.baseUrl, userData);
    return response.data;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    const response = await api.put(`${this.baseUrl}/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<ApiResponse<null>> {
    const response = await api.delete(`${this.baseUrl}/${userId}`);
    return response.data;
  }

  async approveUser(userId: string): Promise<ApiResponse<User>> {
    const response = await api.post(`${this.baseUrl}/${userId}/approve`);
    return response.data;
  }

  async suspendUser(userId: string): Promise<ApiResponse<User>> {
    const response = await api.post(`${this.baseUrl}/${userId}/suspend`);
    return response.data;
  }

  async reactivateUser(userId: string): Promise<ApiResponse<User>> {
    const response = await api.post(`${this.baseUrl}/${userId}/reactivate`);
    return response.data;
  }

  async updateMembership(
    userId: string,
    membership: 'free' | 'premium' | 'elite'
  ): Promise<ApiResponse<{ membership: string; old_membership: string }>> {
    const response = await api.post(`${this.baseUrl}/${userId}/membership`, { membership });
    return response.data;
  }

  async bulkAction(
    userIds: string[],
    action: string
  ): Promise<{
    total: number;
    results: Array<{ id: string | number; status: string; message: string }>;
  }> {
    const response = await api.post(`${this.baseUrl}/bulk/actions`, {
      user_ids: userIds.map((id) => Number(id)),
      action,
    }) as ApiResponse<{
      total: number;
      results: Array<{ id: string | number; status: string; message: string }>;
    }>;

    return response.data;
  }

  async getUserActivities(
    userId: string,
    page?: number,
    perPage?: number
  ): Promise<PaginatedResponse<ActivityLog>> {
    const params = new URLSearchParams();

    if (page) params.append('page', page.toString());
    if (perPage) params.append('per_page', perPage.toString());

    const url = `${this.baseUrl}/${userId}/activities${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get(url);
    const raw = response.data;

    return {
      success: raw?.success ?? true,
      data: normalizeData<ActivityLog>(raw),
      pagination: normalizePagination(raw),
    };
  }

  async addActivityLog(
    userId: string,
    action: string,
    details: string
  ): Promise<ApiResponse<ActivityLog>> {
    const response = await api.post(`${this.baseUrl}/${userId}/activities`, {
      action,
      details,
    });
    return response.data;
  }

  async getAdminNotes(userId: string): Promise<ApiResponse<AdminNote[]>> {
    const response = await api.get(`${this.baseUrl}/${userId}/notes`);
    const raw = response.data;

    return {
      success: raw?.success ?? true,
      data: Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [],
    };
  }

  async saveAdminNote(userId: string, note: string): Promise<ApiResponse<AdminNote>> {
    const response = await api.post(`${this.baseUrl}/${userId}/notes`, { note });
    return response.data;
  }

  async downloadProofOfAddress(userId: string, filename?: string): Promise<void> {
  // Get the base URL from axios instance
  const baseURL = api.defaults.baseURL || '';
  const url = `${baseURL}${this.baseUrl}/${userId}/proof-of-address`;
  
  // Get auth token
  const token = localStorage.getItem('auth_token');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    // Check if response is OK
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: Download failed`;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.message || errorMessage;
      } catch {
        // If response is not JSON, get text
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch {
          // Ignore
        }
      }
      throw new Error(errorMessage);
    }

    // Get content-type header
    const contentType = response.headers.get('content-type') || '';
    console.log('Content-Type:', contentType); // Debug log

    // Handle JSON response (signed URL)
    if (contentType.includes('application/json')) {
      const jsonData = await response.json();
      console.log('JSON Response:', jsonData); // Debug log
      
      if (jsonData.success === false) {
        throw new Error(jsonData.message || 'Failed to download document.');
      }
      
      // Check for signed URL in response (try multiple possible paths)
      const signedUrl = jsonData.data?.download_url ?? 
                       jsonData.data?.url ?? 
                       jsonData.download_url ?? 
                       jsonData.url;
      
      if (!signedUrl) {
        throw new Error('No download URL available in response.');
      }
      
      // Open signed URL in new tab
      const opened = window.open(signedUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        window.location.assign(signedUrl);
      }
      return;
    }

    // Handle binary file download
    const blob = await response.blob();
    
    // Check if blob is actually JSON (error response disguised as blob)
    if (blob.type === 'application/json') {
      const text = await blob.text();
      try {
        const jsonError = JSON.parse(text);
        throw new Error(jsonError.message || 'Failed to download document.');
      } catch {
        throw new Error('Failed to download document: Invalid response format.');
      }
    }
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `proof-of-address-${userId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download error:', error);
    // Try fallback: use axios with blob response type
    try {
      console.log('Trying fallback download method...');
      await this.downloadProofOfAddressFallback(userId, filename);
    } catch (fallbackError) {
      console.error('Fallback download also failed:', fallbackError);
      throw error; // Throw original error
    }
  }
}

async downloadProofOfAddressFallback(userId: string, filename?: string): Promise<void> {
  try {
    const response = await api.get(`${this.baseUrl}/${userId}/proof-of-address`, {
      responseType: 'blob',
      headers: {
        'Accept': 'application/json',
      },
    });

    // Check if response data is available
    if (!response.data) {
      throw new Error('No data received from server');
    }

    // Check if the blob is actually JSON (error response)
    if (response.data instanceof Blob && response.data.type === 'application/json') {
      const text = await response.data.text();
      try {
        const jsonError = JSON.parse(text);
        throw new Error(jsonError.message || 'Failed to download document.');
      } catch {
        throw new Error('Failed to download document: Invalid response format.');
      }
    }

    // Create download link
    const blob = response.data as Blob;
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `proof-of-address-${userId}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Fallback download error:', error);
    throw error;
  }
}
}

export default new UserManagementService();