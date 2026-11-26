// services/contentService.ts

import { resolveStorageUrl } from '../utils/mediaUrl';
import { downloadAuthenticatedFile } from '../utils/downloadFile';

class ApiRequestError extends Error {
  errors?: Record<string, string[]>;
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message);
    this.errors = errors;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const UPLOAD_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes for large video uploads

const parseErrorResponse = async (response: Response): Promise<ApiRequestError> => {
  const text = await response.text();
  try {
    const error = JSON.parse(text);
    const message =
      error.message ||
      (error.errors ? Object.values(error.errors).flat().join(', ') : null) ||
      `Request failed (${response.status})`;
    return new ApiRequestError(message, error.errors);
  } catch {
    return new ApiRequestError(
      text?.trim() || `Request failed (${response.status} ${response.statusText})`
    );
  }
};

// Create API client
const api = {
  get: async <T = any>(url: string, config?: any): Promise<T> => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...config?.headers,
      },
      ...config,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json();
  },

  post: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('auth_token');
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...config?.headers,
    };

    const isFormData = data instanceof FormData;

    // Remove Content-Type header if it's FormData (browser sets it automatically)
    if (isFormData) {
      delete headers['Content-Type'];
    } else if (data && typeof data === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timeoutMs = config?.timeout ?? (isFormData ? UPLOAD_TIMEOUT_MS : 60000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_BASE}${url}`, {
        ...config,
        method: 'POST',
        headers,
        body: isFormData ? data : JSON.stringify(data),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await parseErrorResponse(response);
      }

      return response.json();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new ApiRequestError(
          'Upload timed out. Try a smaller file or check your connection.'
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  put: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('auth_token');
    
    const isFormData = data instanceof FormData;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...config?.headers,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${url}`, {
      method: 'PUT',
      headers,
      body: isFormData ? data : JSON.stringify(data),
      ...config,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('PUT Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        body: errorData
      });
      
      try {
        const errorJson = JSON.parse(errorData);
        throw new Error(errorJson.message || `Request failed with status ${response.status}`);
      } catch {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }
    }

    return response.json();
  },

  delete: async <T = any>(url: string, config?: any): Promise<T> => {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...config?.headers,
      },
      ...config,
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return response.json();
  },
};

// Type Definitions
export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: string;
  category_id: string | number;
  course_id?: string;
  module_id?: string | number | null;
  moduleId?: string | number | null;
  moduleTitle?: string | null;
  order?: number;
  type: 'video' | 'document' | 'image';
  uploadDate: string;
  published: boolean;
  duration?: string;
  views: number;
  downloads: number;
  fileSize: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  updatedAt?: string;
}

export interface ContentCategory {
  id: number;
  name: string;
  slug: string;
}

export interface CourseModule {
  id: string;
  courseId?: string;
  title: string;
  slug?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  thumbnailPath?: string | null;
  order: number;
  isPublished?: boolean;
  contentCount?: number;
  videoCount?: number;
  documentCount?: number;
  contents?: ContentItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  thumbnailPath?: string | null;
  order?: number;
  contentCount: number;
  videoCount?: number;
  documentCount?: number;
  moduleCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  contents?: ContentItem[];
  modules?: CourseModule[];
}

export interface ContentFilters {
  type?: 'video' | 'document' | 'all';
  category?: string;
  course_id?: string;
  module_id?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ContentStats {
  total: number;
  videos?: number;
  documents?: number;
  published: number;
  views?: number;
  downloads?: number;
  courses: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    stats?: ContentStats;
    content_stats?: {
      videos?: number;
      documents?: number;
      total?: number;
    };
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
  errors?: any;
}

const normalizeContentItem = (item: ContentItem): ContentItem => ({
  ...item,
  id: String(item.id),
  thumbnailUrl: resolveStorageUrl(item.thumbnailUrl) ?? item.thumbnailUrl,
  fileUrl: resolveStorageUrl(item.fileUrl) ?? item.fileUrl,
});

const normalizeCourseModule = (module: CourseModule): CourseModule => ({
  ...module,
  id: String(module.id),
  courseId: module.courseId != null ? String(module.courseId) : module.courseId,
  thumbnailUrl: resolveStorageUrl(module.thumbnailUrl) ?? module.thumbnailUrl,
  thumbnailPath: module.thumbnailPath ?? null,
  contents: module.contents?.map(normalizeContentItem),
});

const normalizeCourse = (course: Course): Course => ({
  ...course,
  id: String(course.id),
  thumbnailUrl: resolveStorageUrl(course.thumbnailUrl) ?? course.thumbnailUrl,
  thumbnailPath: course.thumbnailPath ?? null,
  contents: course.contents?.map(normalizeContentItem),
  modules: course.modules?.map(normalizeCourseModule),
});

export const contentService = {
  // ============================================
  // CONTENT MANAGEMENT
  // ============================================
  
  async getContent(params: ContentFilters): Promise<ApiResponse<ContentItem[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.type && params.type !== 'all') {
        queryParams.append('type', params.type);
      }
      
      if (params.category) {
        queryParams.append('category', params.category);
      }
      
      if (params.course_id) {
        queryParams.append('course_id', params.course_id);
      }

      if (params.module_id) {
        queryParams.append('module_id', params.module_id);
      }
      
      if (params.search) {
        queryParams.append('search', params.search);
      }
      
      if (params.sort) {
        queryParams.append('sort', params.sort);
      }
      
      if (params.order) {
        queryParams.append('order', params.order);
      }
      
      const queryString = queryParams.toString();
      const url = `/instructor/content${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get<ApiResponse<ContentItem[]>>(url);
      if (response.success && Array.isArray(response.data)) {
        response.data = response.data.map(normalizeContentItem);
      }
      return response;
    } catch (error: any) {
      console.error('Error fetching content:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch content',
      };
    }
  },

  async getContentById(id: string): Promise<ApiResponse<ContentItem>> {
    try {
      const response = await api.get<ApiResponse<ContentItem>>(`/instructor/content/${id}`);
      if (response.success && response.data) {
        response.data = normalizeContentItem(response.data);
      }
      return response;
    } catch (error: any) {
      console.error('Error fetching content item:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch content item',
      };
    }
  },

  async createContent(formData: FormData): Promise<ApiResponse<ContentItem>> {
    try {
      const response = await api.post<ApiResponse<ContentItem>>('/instructor/content', formData);
      return response;
    } catch (error: any) {
      console.error('Error creating content:', error);
      return {
        success: false,
        message: error.message || 'Failed to create content',
        errors: error.errors,
      };
    }
  },
  
  async updateContent(id: string, formData: FormData): Promise<ApiResponse<ContentItem>> {
    try {
      const response = await api.post<ApiResponse<ContentItem>>(`/instructor/content/${id}`, formData);
      if (response.success && response.data) {
        response.data = normalizeContentItem(response.data);
      }
      return response;
    } catch (error: any) {
      console.error('Error updating content:', error);
      return {
        success: false,
        message: error.message || 'Failed to update content',
        errors: error.errors,
      };
    }
  },

  async deleteContent(id: string): Promise<ApiResponse> {
    try {
      const response = await api.delete<ApiResponse>(`/instructor/content/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error deleting content:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete content',
      };
    }
  },

  async togglePublish(id: string): Promise<ApiResponse<ContentItem>> {
    try {
      const response = await api.post<ApiResponse<ContentItem>>(`/instructor/content/${id}/toggle-publish`);
      return response;
    } catch (error: any) {
      console.error('Error toggling publish status:', error);
      return {
        success: false,
        message: error.message || 'Failed to toggle publish status',
      };
    }
  },

  async getCategories(): Promise<ApiResponse<ContentCategory[]>> {
    try {
      const response = await api.get<ApiResponse<ContentCategory[]>>('/instructor/content/categories');
      return response;
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch categories',
      };
    }
  },

  async getFile(id: string): Promise<ApiResponse<{ url: string; file_name: string }>> {
    try {
      const response = await api.get<any>(`/instructor/content/${id}/file`);

      const rawUrl = response.url ?? response.data?.url;
      const file_name = response.file_name ?? response.data?.file_name ?? 'file';

      if (response.success && rawUrl) {
        return {
          success: true,
          data: {
            url: resolveStorageUrl(rawUrl) ?? rawUrl,
            file_name,
          },
        };
      }

      return {
        success: false,
        message: response.message || 'File URL not available',
      };
    } catch (error: any) {
      console.error('Error getting file:', error);
      return {
        success: false,
        message: error.message || 'Failed to get file',
      };
    }
  },

  async downloadFile(id: string, fileName?: string): Promise<void> {
    await downloadAuthenticatedFile(`${API_BASE}/instructor/content/${id}/download`, fileName);
  },

  async getPublicFile(id: string): Promise<ApiResponse<{ url: string; file_name: string }>> {
    try {
      const response = await api.get<ApiResponse<{ url: string; file_name: string }>>(`/content/${id}/public-file`);
      if (response.success && response.data?.url) {
        response.data.url = resolveStorageUrl(response.data.url) ?? response.data.url;
      }
      return response;
    } catch (error: any) {
      console.error('Error getting public file:', error);
      return {
        success: false,
        message: error.message || 'Failed to get file',
      };
    }
  },

  async incrementViews(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await api.post<ApiResponse<{ success: boolean }>>(`/content/${id}/increment-views`);
      return response;
    } catch (error: any) {
      console.error('Error incrementing views:', error);
      return {
        success: false,
        message: error.message || 'Failed to increment views',
      };
    }
  },

  async incrementDownloads(id: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await api.post<ApiResponse<{ success: boolean }>>(`/content/${id}/increment-downloads`);
      return response;
    } catch (error: any) {
      console.error('Error incrementing downloads:', error);
      return {
        success: false,
        message: error.message || 'Failed to increment downloads',
      };
    }
  },

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  async getCourses(params?: { search?: string; sort?: string; order?: 'asc' | 'desc' }): Promise<ApiResponse<Course[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) {
        queryParams.append('search', params.search);
      }
      
      if (params?.sort) {
        queryParams.append('sort', params.sort);
      }
      
      if (params?.order) {
        queryParams.append('order', params.order);
      }
      
      const queryString = queryParams.toString();
      const url = `/instructor/courses${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get<ApiResponse<Course[]>>(url);
      if (response.success && Array.isArray(response.data)) {
        response.data = response.data.map(normalizeCourse);
      }
      return response;
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch courses',
      };
    }
  },

  async getCourseById(id: string): Promise<ApiResponse<Course>> {
    try {
      const response = await api.get<ApiResponse<Course>>(`/instructor/courses/${id}`);
      if (response.success && response.data) {
        response.data = normalizeCourse(response.data);
      }
      return response;
    } catch (error: any) {
      console.error('Error fetching course:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch course',
      };
    }
  },

  async createCourse(formData: FormData): Promise<ApiResponse<Course>> {
    try {
      const response = await api.post<ApiResponse<Course>>('/instructor/courses', formData);
      return response;
    } catch (error: any) {
      console.error('Error creating course:', error);
      return {
        success: false,
        message: error.message || 'Failed to create course',
        errors: error.errors,
      };
    }
  },

  async updateCourse(id: string, formData: FormData): Promise<ApiResponse<Course>> {
    try {
      const response = await api.post<ApiResponse<Course>>(`/instructor/courses/${id}`, formData);
      if (response.success && response.data) {
        response.data = normalizeCourse(response.data);
      }
      return response;
    } catch (error: any) {
      console.error('Error updating course:', error);
      return {
        success: false,
        message: error.message || 'Failed to update course',
        errors: error.errors,
      };
    }
  },

  async deleteCourse(id: string): Promise<ApiResponse> {
    try {
      const response = await api.delete<ApiResponse>(`/instructor/courses/${id}`);
      return response;
    } catch (error: any) {
      console.error('Error deleting course:', error);
      return {
        success: false,
        message: error.message || 'Failed to delete course',
      };
    }
  },

  async getCourseContents(id: string, type?: 'video' | 'document'): Promise<ApiResponse<ContentItem[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (type) {
        queryParams.append('type', type);
      }
      
      const queryString = queryParams.toString();
      const url = `/instructor/courses/${id}/contents${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get<ApiResponse<ContentItem[]>>(url);
      if (response.success && Array.isArray(response.data)) {
        response.data = response.data.map(normalizeContentItem);
      }
      return response;
    } catch (error: any) {
      console.error('Error fetching course contents:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch course contents',
      };
    }
  },

  async reorderCourseContents(id: string, contentIds: string[]): Promise<ApiResponse> {
    try {
      const response = await api.post<ApiResponse>(`/instructor/courses/${id}/reorder`, {
        content_ids: contentIds
      });
      return response;
    } catch (error: any) {
      console.error('Error reordering course contents:', error);
      return {
        success: false,
        message: error.message || 'Failed to reorder course contents',
      };
    }
  },

  // Add to contentService.ts:
 async reorderLessons(courseId: string, lessonIds: Array<string | number>): Promise<ApiResponse> {
   try {
     const response = await api.post<ApiResponse>(`/instructor/content/courses/${courseId}/reorder-lessons`, {
       lesson_ids: lessonIds.map((id) => Number(id)),
     });
     return response;
   } catch (error: any) {
     console.error('Error reordering lessons:', error);
     return {
       success: false,
       message: error.message || 'Failed to reorder lessons',
     };
   }
 },

  async reorderCourses(courseIds: Array<string | number>): Promise<ApiResponse> {
    try {
      return await api.post<ApiResponse>('/instructor/courses/reorder', {
        course_ids: courseIds.map((id) => Number(id)),
      });
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to reorder courses' };
    }
  },

  async getCourseModules(courseId: string): Promise<ApiResponse<CourseModule[]>> {
    try {
      const response = await api.get<ApiResponse<CourseModule[]>>(`/instructor/courses/${courseId}/modules`);
      if (response.success && response.data) {
        response.data = response.data.map(normalizeCourseModule);
      }
      return response;
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to load modules', data: [] };
    }
  },

  async createCourseModule(
    courseId: string,
    payload: { title: string; description?: string; is_published?: boolean; thumbnailImage?: File | null }
  ): Promise<ApiResponse<CourseModule>> {
    try {
      const formData = new FormData();
      formData.append('title', payload.title);
      if (payload.description) formData.append('description', payload.description);
      if (payload.is_published !== undefined) {
        formData.append('is_published', payload.is_published ? '1' : '0');
      }
      if (payload.thumbnailImage) {
        formData.append('thumbnail_image', payload.thumbnailImage);
      }
      const response = await api.post<ApiResponse<CourseModule>>(
        `/instructor/courses/${courseId}/modules`,
        formData
      );
      if (response.success && response.data) {
        response.data = normalizeCourseModule(response.data);
      }
      return response;
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to create module', errors: error.errors };
    }
  },

  async updateCourseModule(
    courseId: string,
    moduleId: string,
    payload: {
      title: string;
      description?: string;
      is_published?: boolean;
      thumbnailImage?: File | null;
      removeThumbnail?: boolean;
    }
  ): Promise<ApiResponse<CourseModule>> {
    try {
      const formData = new FormData();
      formData.append('title', payload.title);
      if (payload.description !== undefined) formData.append('description', payload.description || '');
      if (payload.is_published !== undefined) {
        formData.append('is_published', payload.is_published ? '1' : '0');
      }
      if (payload.removeThumbnail) {
        formData.append('remove_thumbnail', '1');
      }
      if (payload.thumbnailImage) {
        formData.append('thumbnail_image', payload.thumbnailImage);
      }
      const response = await api.post<ApiResponse<CourseModule>>(
        `/instructor/courses/${courseId}/modules/${moduleId}`,
        formData
      );
      if (response.success && response.data) {
        response.data = normalizeCourseModule(response.data);
      }
      return response;
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to update module', errors: error.errors };
    }
  },

  async deleteCourseModule(courseId: string, moduleId: string): Promise<ApiResponse> {
    try {
      return await api.delete<ApiResponse>(`/instructor/courses/${courseId}/modules/${moduleId}`);
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to delete module' };
    }
  },

  async reorderCourseModules(courseId: string, moduleIds: Array<string | number>): Promise<ApiResponse> {
    try {
      return await api.post<ApiResponse>(`/instructor/courses/${courseId}/modules/reorder`, {
        module_ids: moduleIds.map((id) => Number(id)),
      });
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to reorder modules' };
    }
  },

  async reorderModuleContents(courseId: string, moduleId: string, contentIds: Array<string | number>): Promise<ApiResponse> {
    try {
      return await api.post<ApiResponse>(`/instructor/courses/${courseId}/modules/${moduleId}/reorder-contents`, {
        content_ids: contentIds.map((id) => Number(id)),
      });
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to reorder module contents' };
    }
  },

  async getCourseProgress(courseId: string, params?: { search?: string; status?: string; page?: number; per_page?: number }): Promise<ApiResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.page) query.set('page', String(params.page));
      if (params?.per_page) query.set('per_page', String(params.per_page));
      const qs = query.toString();
      return await api.get<ApiResponse>(`/instructor/courses/${courseId}/progress${qs ? `?${qs}` : ''}`);
    } catch (error: any) {
      return { success: false, message: error.message || 'Failed to load course progress' };
    }
  },

};

export default api;