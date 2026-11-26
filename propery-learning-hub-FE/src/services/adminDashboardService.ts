import api from './api';

export interface DashboardStats {
  total_users:   { value: number; change: string };
  video_content: { value: number; change: string };
  documents:     { value: number; change: string };
  active_deals:  { value: number; change: string };
}

export interface KeyMetrics {
  active_courses: number;
  today_revenue:  number;
  new_users_24h:  number;
  active_deals:   number;
}

export interface TopContentItem {
  id:        number;
  title:     string;
  type:      'video' | 'document';
  course_id: number | null;
  views:     number;
  trend:     'up' | 'down';
}

export interface RecentDeal {
  id:       number;
  title:    string;
  location: string;
  price:    string;
  views:    number;
}

export interface QuickActionCounts {
  pending_users:        number;
  draft_deals:          number;
  unpublished_content:  number;
}

export interface DashboardData {
  stats:              DashboardStats;
  key_metrics:        KeyMetrics;
  top_content:        TopContentItem[];
  recent_deals:       RecentDeal[];
  quick_actions:      QuickActionCounts;
}

export interface DashboardResponse {
  success: boolean;
  data:    DashboardData;
}

class AdminDashboardService {
  async getDashboard(range: '7days' | '30days' | '90days' | '1year' = '30days'): Promise<DashboardResponse> {
    return api.get(`/admin/dashboard?range=${range}`);
  }
}

export default new AdminDashboardService();