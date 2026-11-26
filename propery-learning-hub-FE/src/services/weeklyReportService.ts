// services/weeklyReportService.ts

import api from './api';
import { resolveStorageUrl } from '../utils/mediaUrl';

export interface WeeklyReport {
  id: number;
  week_start: string;
  week_end: string;
  week_number: number;
  year: number;
  current_week: {
    courses_enrolled: number;
    courses_completed: number;
    lessons_completed: number;
    watch_time: string;
    watch_time_seconds: number;
    meetings_attended: number;
    webinars_attended: number;
  };
  previous_week: {
    courses_enrolled: number;
    courses_completed: number;
    lessons_completed: number;
    watch_time: string;
    watch_time_seconds: number;
    meetings_attended: number;
    webinars_attended: number;
  };
  comparison: {
    courses_completed: {
      change: string;
      trend: 'up' | 'down' | 'same';
    };
    lessons_completed: {
      change: string;
      trend: 'up' | 'down' | 'same';
    };
    watch_time: {
      change: string;
      trend: 'up' | 'down' | 'same';
    };
  };
  status_message: string;
  next_week_goals: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface AdminAllUsersReport {
  aggregated: {
    total_users: number;
    reports_generated: number;
    total_courses_enrolled: number;
    total_courses_completed: number;
    total_lessons_completed: number;
    total_watch_time_seconds: number;
    total_meetings_attended: number;
    total_webinars_attended: number;
    week_start: string;
    week_end: string;
    avg_courses_completed: number;
    avg_lessons_completed: number;
    avg_watch_time_minutes: number;
    top_performers: Array<{
      user_name: string;
      courses_completed: number;
      lessons_completed: number;
      watch_time_hours: number;
    }>;
  };
  user_reports: Array<{
    user_id: number;
    user_name: string;
    user_email: string;
    role: string;
    courses_completed: number;
    courses_completed_change: string;
    lessons_completed: number;
    lessons_completed_change: string;
    watch_time_formatted: string;
    meetings_attended: number;
    webinars_attended: number;
    status_message: string;
  }>;
}

class WeeklyReportService {
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

  // ==================== LEARNER ENDPOINTS ====================
  
  // Get current week's report for authenticated user
  async getCurrentReport(): Promise<WeeklyReport | null> {
    try {
      const response = await api.get(`${this.baseUrl}/learner/reports/weekly/current`);
      
      // Check if response exists and has data
      if (!response || !response.data) {
        return null;
      }

      // Handle different response structures
      // Case 1: response.data.data (standard API wrapper)
      if (response.data.data) {
        // Check if data is the report object
        if (response.data.data.id) {
          return response.data.data;
        }
        // If data.data has a data property (nested)
        if (response.data.data.data && Array.isArray(response.data.data.data)) {
          // This is paginated data, not a single report
          return null;
        }
      }
      
      // Case 2: response.data is the report directly
      if (response.data.id) {
        return response.data;
      }

      // Case 3: response.data is an array (shouldn't happen for single report)
      if (Array.isArray(response.data)) {
        return response.data.length > 0 ? response.data[0] : null;
      }

      return null;
    } catch (error: any) {
      // Handle 404 and 204 specifically - return null instead of throwing
      if (error.response?.status === 404 || error.response?.status === 204) {
        console.log('No current report found (404/204)');
        return null;
      }
      
      console.error('Error fetching current report:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // Get report for a specific week
  async getReportForWeek(weekStart: string): Promise<WeeklyReport | null> {
    try {
      const response = await api.get(`${this.baseUrl}/learner/reports/weekly/${weekStart}`);
      
      if (!response || !response.data) {
        return null;
      }

      // Handle different response structures
      if (response.data.data) {
        if (response.data.data.id) {
          return response.data.data;
        }
      }
      
      if (response.data.id) {
        return response.data;
      }

      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }

      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      
      console.error('Error fetching report for week:', {
        weekStart,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  // Get all reports for authenticated user (paginated)
  async getAllReports(page: number = 1): Promise<{ data: WeeklyReport[]; meta: any }> {
    try {
      const response = await api.get(`${this.baseUrl}/learner/reports/weekly`, {
        params: { page }
      });
      
      // Handle different response structures
      // Case 1: response.data.data is the paginated result
      if (response.data?.data) {
        // Check if data is an array or has a data property
        if (Array.isArray(response.data.data)) {
          return {
            data: response.data.data,
            meta: response.data.meta || {}
          };
        }
        // If response.data.data has a data property (nested pagination)
        if (response.data.data.data && Array.isArray(response.data.data.data)) {
          return {
            data: response.data.data.data,
            meta: response.data.data.meta || {}
          };
        }
        // If response.data.data is a single object, wrap it in array
        if (response.data.data.id) {
          return {
            data: [response.data.data],
            meta: response.data.meta || {}
          };
        }
      }
      
      // Case 2: response.data is directly the array
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          meta: {}
        };
      }

      // Default: return empty array
      return {
        data: [],
        meta: {}
      };
    } catch (error: any) {
      console.error('Error fetching all reports:', error);
      // Return empty array instead of throwing
      return {
        data: [],
        meta: {}
      };
    }
  }

  // Compare two weeks
  async compareWeeks(week1: string, week2: string): Promise<{ week1: WeeklyReport; week2: WeeklyReport } | null> {
    try {
      const response = await api.get(`${this.baseUrl}/learner/reports/compare`, {
        params: { week1, week2 }
      });
      
      if (!response || !response.data) {
        return null;
      }

      if (response.data.data) {
        if (response.data.data.week1 && response.data.data.week2) {
          return response.data.data;
        }
      }
      
      if (response.data.week1 && response.data.week2) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error comparing weeks:', error);
      throw error;
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  // Admin: Get all users' reports
  async getAllUsersReports(weekStart?: string): Promise<AdminAllUsersReport | null> {
    try {
      const response = await api.get(`${this.baseUrl}/admin/reports/weekly/all`, {
        params: { week_start: weekStart }
      });
      
      if (!response || !response.data) {
        return null;
      }

      if (response.data.data) {
        return response.data.data;
      }
      
      // Check if response.data has the expected structure
      if (response.data.aggregated && response.data.user_reports) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching all users reports:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  }

  // Admin: Get report for specific user
  async getUserReport(userId: number, weekStart?: string): Promise<any> {
    try {
      const response = await api.get(`${this.baseUrl}/admin/reports/weekly/user/${userId}`, {
        params: { week_start: weekStart }
      });
      
      if (!response || !response.data) {
        return null;
      }

      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data || null;
    } catch (error: any) {
      console.error('Error fetching user report:', {
        userId,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  // Admin: Generate report for specific user
  async generateUserReport(userId: number): Promise<WeeklyReport | null> {
    try {
      const response = await api.post(`${this.baseUrl}/admin/reports/weekly/generate/${userId}`);
      
      if (!response || !response.data) {
        return null;
      }

      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data || null;
    } catch (error: any) {
      console.error('Error generating user report:', {
        userId,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  // Admin: Get summary statistics
  async getSummary(weekStart?: string): Promise<any> {
    try {
      const response = await api.get(`${this.baseUrl}/admin/reports/weekly/summary`, {
        params: { week_start: weekStart }
      });
      
      if (!response || !response.data) {
        return null;
      }

      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data || null;
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      throw error;
    }
  }

  // Admin: Get top performers
  async getTopPerformers(weekStart?: string): Promise<any> {
    try {
      const response = await api.get(`${this.baseUrl}/admin/reports/weekly/top-performers`, {
        params: { week_start: weekStart }
      });
      
      if (!response || !response.data) {
        return null;
      }

      if (response.data.data) {
        return response.data.data;
      }
      
      return response.data || null;
    } catch (error: any) {
      console.error('Error fetching top performers:', error);
      throw error;
    }
  }
}

export default new WeeklyReportService();