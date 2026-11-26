// services/educationService.ts - Create this new service file
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Content {
  id: number;
  title: string;
  description: string;
  type: 'video' | 'document' | 'pdf' | 'course';
  category: {
    id: number;
    name: string;
    slug: string;
  };
  mentor: {
    id: number;
    name: string | null;
    photo: string;
  };
  duration: string;
  views: number;
  downloads: number;
  rating: number;
  reviews: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | string;
  lessons: number;
  thumbnail: string;
  published_at: string;
  file_size: string;
  metadata?: any;
  file_name?: string;
  resource_type?: string;
  video_url?: string;
  download_url?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface Mentor {
  id: number;
  name: string | null;
  photo: string;
  courses_count: number;
}

export interface Stats {
  total_videos: number;
  total_resources: number;
  total_categories: number;
  total_instructors: number;
  popular_categories: Array<{
    name: string;
    count: number;
  }>;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const educationService = {
  // ==========================================
  // CONTENT METHODS
  // ==========================================

  async getContent(params?: {
    per_page?: number;
    type?: 'video' | 'document' | 'all';
    category?: string | number;
    search?: string;
    level?: string;
    mentor?: string;
    duration?: string;
    sort?: 'newest' | 'popular' | 'recommended' | 'alphabetical';
  }) {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const url = `${API_BASE_URL}/learner/content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getContentById(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/content/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getCategories() {
    const response = await fetch(`${API_BASE_URL}/learner/categories`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getMentors() {
    const response = await fetch(`${API_BASE_URL}/learner/mentors`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/learner/stats`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async downloadResource(contentId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/download`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getVideoUrl(contentId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/video-url`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async recordView(contentId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/view`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async toggleFavorite(contentId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/favorite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },
  async getCourse(courseId: number | string) {
  const response = await fetch(`${API_BASE_URL}/learner/courses/${courseId}`, {
    headers: this.getAuthHeaders(),
  });
  return this.handleResponse(response);
},

async getCourses() {
  const response = await fetch(`${API_BASE_URL}/learner/courses`, {
    headers: this.getAuthHeaders(),
  });
  return this.handleResponse(response);
},

  // ==========================================
  // UTILITY METHODS (Same as dealService for consistency)
  // ==========================================

  getAuthHeaders() {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  },

  getToken() {
    if (typeof window !== 'undefined') {
      // Try both possible token storage locations
      return localStorage.getItem('token') || 
             localStorage.getItem('auth_token') || 
             sessionStorage.getItem('token') ||
             sessionStorage.getItem('auth_token');
    }
    return null;
  },

  async handleResponse(response: Response) {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to access this resource.');
      }
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.success === false) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  },
};

export default educationService;