// services/learnerService.ts

import { courseThumbnailSrc, getLearnerDocumentUrl, isDirectS3PlaybackUrl, resolveStorageUrl } from '../utils/mediaUrl';
import { downloadAuthenticatedFile, viewAuthenticatedFile } from '../utils/downloadFile';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration?: string;
  type: 'video' | 'document' | 'image' | 'quiz' | 'assignment';
  isUnlocked: boolean;
  isCompleted: boolean;
  videoUrl?: string;
  resourceUrl?: string;
  contentUrl?: string;
  moduleId?: string;
  moduleTitle?: string;
  moduleOrder?: number;
  progress?: {
    percentage: number;
    watchTime?: number;
  };
  [key: string]: any;
}

export interface CourseModule {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  order: number;
  progress?: number;
  isCompleted?: boolean;
  videos?: Lesson[];
  documents?: Lesson[];
  contents?: Lesson[];
  videoCount?: number;
  documentCount?: number;
  [key: string]: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  instructor?: {
    name: string;
    avatar?: string;
  };
  stats?: {
    totalLessons: number;
    totalEnrollments: number;
    videoCount?: number;
    documentCount?: number;
    moduleCount?: number;
  };
  enrollment?: {
    status: 'enrolled' | 'completed' | 'in_progress';
    progress: number;
    enrolledAt?: string;
    completedAt?: string;
  };
  isEnrolled?: boolean;
  progress?: number;
  createdAt: string;
  [key: string]: any;
}

export interface CourseDetails extends Course {
  lessons?: Lesson[];
  modules?: CourseModule[];
  videos?: Lesson[];
  documents?: Lesson[];
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'document' | 'quiz' | 'assignment';
  thumbnailUrl?: string;
  duration?: string;
  categoryId?: string;
  mentorId?: string;
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  [key: string]: any;
}

export interface Mentor {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  expertise?: string[];
  [key: string]: any;
}

export interface Stats {
  totalCourses?: number;
  totalContent?: number;
  completedCourses?: number;
  inProgressCourses?: number;
  totalWatchTime?: number;
  [key: string]: any;
}

const isDocumentLesson = (lesson: Lesson) =>
  lesson.type === 'document' || Boolean(lesson.has_file && !lesson.video_url);

const normalizeLesson = (lesson: Lesson): Lesson => ({
  ...lesson,
  thumbnailUrl:
    resolveStorageUrl(lesson.thumbnailUrl ?? lesson.thumbnail) ??
    lesson.thumbnailUrl ??
    lesson.thumbnail,
  videoUrl: isDocumentLesson(lesson)
    ? undefined
    : resolveStorageUrl(lesson.videoUrl ?? lesson.video_url) ?? lesson.videoUrl,
  fileUrl: isDocumentLesson(lesson)
    ? undefined
    : resolveStorageUrl(lesson.fileUrl ?? lesson.video_url ?? lesson.videoUrl) ?? lesson.fileUrl,
  resourceUrl: isDocumentLesson(lesson)
    ? undefined
    : resolveStorageUrl(lesson.resourceUrl ?? lesson.download_url) ?? lesson.resourceUrl,
  contentUrl: isDocumentLesson(lesson)
    ? undefined
    : resolveStorageUrl(lesson.contentUrl ?? lesson.video_url) ?? lesson.contentUrl,
  download_url: isDocumentLesson(lesson) ? undefined : lesson.download_url,
});

const normalizeCourseModule = (module: CourseModule): CourseModule => ({
  ...module,
  id: String(module.id),
  thumbnailUrl: resolveStorageUrl(module.thumbnailUrl) ?? module.thumbnailUrl,
  videos: module.videos?.map(normalizeLesson),
  documents: module.documents?.map(normalizeLesson),
  contents: module.contents?.map(normalizeLesson),
});

const normalizeCourse = (course: Course): Course => ({
  ...course,
  id: String(course.id),
  thumbnailUrl: courseThumbnailSrc(course) ?? course.thumbnailUrl,
  modules: course.modules?.map(normalizeCourseModule),
  lessons: course.lessons?.map(normalizeLesson),
  videos: course.videos?.map(normalizeLesson),
  documents: course.documents?.map(normalizeLesson),
});

class LearnerService {
  /**
   * Get authentication headers
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Get authentication token
   */
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || 
             localStorage.getItem('auth_token') || 
             sessionStorage.getItem('token') ||
             sessionStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * Handle API response
   */
  private async handleResponse(response: Response): Promise<ApiResponse> {
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      if (response.status === 403) {
        throw new Error('You do not have permission to access this resource.');
      }
      if (response.status === 404) {
        throw new Error('Resource not found.');
      }
      
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      } catch (e) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }
    }

    const data = await response.json();
    if (data.success === false) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  // ==================== CONTENT ENDPOINTS ====================

  /**
   * Get all content items
   * @param params Query parameters for filtering content
   */
  async getContent(params?: { 
    search?: string; 
    type?: string; 
    category?: string;
    mentor?: string;
  }): Promise<ApiResponse<ContentItem[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.type) queryParams.append('type', params.type);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.mentor) queryParams.append('mentor', params.mentor);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/learner/content${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error fetching content:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch content',
      };
    }
  }

  /**
   * Get specific content item details
   * @param contentId Content ID
   */
  async getContentDetails(contentId: string): Promise<ApiResponse<ContentItem>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}`, {
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error fetching content details:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch content details',
      };
    }
  }

  /**
   * Get video URL for a content item
   * @param contentId Content ID
   */
  async getVideoUrl(contentId: string): Promise<ApiResponse<{ video_url: string; thumbnail_url?: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/video-url`, {
        headers: this.getAuthHeaders(),
      });
      
      const result = await this.handleResponse(response) as ApiResponse & {
        video_url?: string;
        thumbnail_url?: string;
      };

      const rawVideoUrl = result.video_url ?? result.data?.video_url ?? '';
      const rawThumbUrl = result.thumbnail_url ?? result.data?.thumbnail_url;

      const video_url =
        rawVideoUrl &&
        (isDirectS3PlaybackUrl(rawVideoUrl) || /^https?:\/\//i.test(rawVideoUrl))
          ? rawVideoUrl
          : resolveStorageUrl(rawVideoUrl) ?? rawVideoUrl;
      const thumbnail_url = resolveStorageUrl(rawThumbUrl) ?? rawThumbUrl;

      return {
        success: true,
        data: {
          video_url: video_url ?? '',
          thumbnail_url,
        },
      };
    } catch (error: any) {
      console.error('Error fetching video URL:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch video URL',
      };
    }
  }

  /**
   * Record content view
   * @param contentId Content ID
   */
  async recordView(contentId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/view`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error recording view:', error);
      return {
        success: false,
        message: error.message || 'Failed to record view',
      };
    }
  }

  /**
   * Open a document in a new tab through the API (storage paths are not publicly accessible).
   */
  async viewDocument(contentId: string): Promise<void> {
    const baseUrl = getLearnerDocumentUrl(contentId);
    const separator = baseUrl.includes('?') ? '&' : '?';
    await viewAuthenticatedFile(`${baseUrl}${separator}inline=1`);
  }

  /**
   * Download resource file through the API (increments download count on server).
   */
  async downloadDocument(contentId: string, fileName?: string): Promise<void> {
    await downloadAuthenticatedFile(getLearnerDocumentUrl(contentId), fileName);
  }

  /**
   * @deprecated Use downloadDocument() for file downloads
   * Download resource
   * @param contentId Content ID
   */
  async downloadResource(contentId: string): Promise<ApiResponse<{ url: string }>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/content/${contentId}/download`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error downloading resource:', error);
      return {
        success: false,
        message: error.message || 'Failed to download resource',
      };
    }
  }

  // ==================== CATEGORIES & MENTORS ====================

  /**
   * Get all categories
   */
  async getCategories(): Promise<ApiResponse<Category[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/categories`, {
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch categories',
      };
    }
  }

  /**
   * Get all mentors
   */
  async getMentors(): Promise<ApiResponse<Mentor[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/mentors`, {
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error fetching mentors:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch mentors',
      };
    }
  }

  /**
   * Get learner statistics
   */
  async getStats(): Promise<ApiResponse<Stats>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/stats`, {
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch stats',
      };
    }
  }

  // ==================== COURSES ====================

  /**
   * Browse all available courses
   * @param params Query parameters for filtering courses
   */
  async browseCourses(params?: { 
    search?: string; 
    filter?: string;
    category?: string;
    sort?: string;
  }): Promise<ApiResponse<Course[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.search) queryParams.append('search', params.search);
      if (params?.filter) queryParams.append('filter', params.filter);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.sort) queryParams.append('sort', params.sort);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/learner/courses${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      
      const result = await this.handleResponse(response) as ApiResponse<Course[]>;
      if (result.success && result.data) {
        result.data = result.data.map(normalizeCourse);
      }
      return result;
    } catch (error: any) {
      console.error('Error browsing courses:', error);
      return {
        success: false,
        message: error.message || 'Failed to browse courses',
      };
    }
  }

  /**
   * Get course details with lessons
   * @param courseId Course ID
   */
  async getCourseDetails(courseId: string): Promise<ApiResponse<CourseDetails>> {
    try {
      const response = await fetch(`${API_BASE_URL}/learner/courses/${courseId}`, {
        headers: this.getAuthHeaders(),
      });
      
      const result = await this.handleResponse(response) as ApiResponse<CourseDetails>;
      if (result.success && result.data) {
        result.data = normalizeCourse(result.data);
      }
      return result;
    } catch (error: any) {
      console.error('Error fetching course details:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch course details',
      };
    }
  }

  // ==================== LEGACY METHODS (For backward compatibility) ====================
  // These methods are kept for backward compatibility with existing code
  // They map to the new content/course endpoints

  /**
   * @deprecated Use browseCourses() instead
   * Get enrolled courses for the learner
   */
  async getMyEnrollments(params?: { 
    status?: string; 
    sort?: string; 
    search?: string 
  }): Promise<ApiResponse<Course[]>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.status) queryParams.append('status', params.status);
      if (params?.sort) queryParams.append('sort', params.sort);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/learner/courses/my-enrollments${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      
      const result = await this.handleResponse(response) as ApiResponse<Course[]>;

      if (result.success && result.data) {
        result.data = result.data.map(normalizeCourse);
      }

      if (result.success && result.data && params?.search) {
        const term = params.search.toLowerCase();
        result.data = result.data.filter(
          (course) =>
            course.title.toLowerCase().includes(term) ||
            course.description?.toLowerCase().includes(term)
        );
      }

      return result;
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch enrollments',
      };
    }
  }

  /**
   * @deprecated Use appropriate content endpoint instead
   * Enroll in a course
   */
  async enrollInCourse(courseId: string): Promise<ApiResponse> {
    try {
      // This might need to be implemented in your backend
      // For now, we'll make a call to the course detail endpoint
      const response = await fetch(`${API_BASE_URL}/learner/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error enrolling in course:', error);
      return {
        success: false,
        message: error.message || 'Failed to enroll in course',
      };
    }
  }

  /**
   * @deprecated Use getContentDetails() instead
   * Get specific lesson details
   */
  async getLesson(courseId: string, lessonId: string): Promise<ApiResponse> {
    try {
      // Map to content endpoint
      const response = await fetch(`${API_BASE_URL}/learner/content/${lessonId}`, {
        headers: this.getAuthHeaders(),
      });
      
      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error fetching lesson:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch lesson',
      };
    }
  }

  /**
   * Update lesson watch progress (persists to lesson_progress + enrollment).
   */
  async updateLessonProgress(
    courseId: string,
    lessonId: string,
    data: { watch_time: number; total_duration?: number }
  ): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/learner/courses/${courseId}/lessons/${lessonId}/progress`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            watch_time: Math.floor(data.watch_time),
            total_duration: data.total_duration != null ? Math.floor(data.total_duration) : undefined,
          }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error updating lesson progress:', error);
      return {
        success: false,
        message: error.message || 'Failed to update progress',
      };
    }
  }

  /**
   * Mark a video lesson as complete and refresh course enrollment progress.
   */
  async completeLesson(courseId: string, lessonId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/learner/courses/${courseId}/lessons/${lessonId}/complete`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      console.error('Error completing lesson:', error);
      return {
        success: false,
        message: error.message || 'Failed to mark lesson as complete',
      };
    }
  }
}

export const learnerService = new LearnerService();
export default learnerService;