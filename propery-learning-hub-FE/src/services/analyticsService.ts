import api from './api';

export type AnalyticsRange = '7days' | '30days' | '90days' | '1year';

export interface StatItem {
  value: string | number;
  change: string;
  is_positive: boolean;
  raw_hours?: number;
}

export interface GrowthPoint {
  label: string;
  count: number;
  percentage: number;
}

export interface EngagementSlice {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface TopContentItem {
  id: number;
  title: string;
  type: string;
  views: number;
  completion: number;
}

export interface ActivityItem {
  metric: string;
  value: string | number;
  change: string;
  is_positive: boolean;
}

export interface CrmSummary {
  total_contacts: number;
  new_contacts: number;
  active_memberships: number;
  course_sales: number;
  total_revenue: number;
  leads: number;
}

export interface AnalyticsData {
  range: string;
  stats: {
    active_users: StatItem;
    content_views: StatItem;
    video_watch_time: StatItem;
    document_downloads: StatItem;
  };
  user_growth: GrowthPoint[];
  content_engagement: EngagementSlice[];
  top_content: TopContentItem[];
  user_activity: ActivityItem[];
  crm_summary: CrmSummary;
}

const rangeMap: Record<string, AnalyticsRange> = {
  '7d': '7days',
  '30d': '30days',
  '90d': '90days',
  '1y': '1year',
};

const analyticsService = {
  async getAnalytics(uiRange: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<AnalyticsData> {
    const res = await api.get('/admin/analytics', { params: { range: rangeMap[uiRange] } });
    return res.data;
  },

  exportCsv(data: AnalyticsData): void {
    const rows = [
      ['Analytics Report', data.range],
      [],
      ['Overview'],
      ['Active Users', data.stats.active_users.value, data.stats.active_users.change],
      ['Content Views', data.stats.content_views.value, data.stats.content_views.change],
      ['Video Watch Time', data.stats.video_watch_time.value, data.stats.video_watch_time.change],
      ['Document Downloads', data.stats.document_downloads.value, data.stats.document_downloads.change],
      [],
      ['CRM Summary'],
      ['Total Contacts', data.crm_summary.total_contacts],
      ['New Contacts', data.crm_summary.new_contacts],
      ['Active Memberships', data.crm_summary.active_memberships],
      ['Course Sales', data.crm_summary.course_sales],
      ['Total Revenue', data.crm_summary.total_revenue],
      ['Leads', data.crm_summary.leads],
      [],
      ['Top Content', 'Type', 'Views', 'Completion %'],
      ...data.top_content.map((c) => [c.title, c.type, c.views, c.completion]),
    ];

    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${data.range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export default analyticsService;
