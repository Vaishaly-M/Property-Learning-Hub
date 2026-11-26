import api from './api';

export interface AnalyticsMetricInfo {
  totalSessionCount?: string;
  totalBotSessionCount?: string;
  distinctUserCount?: string;
  pagesPerSessionPercentage?: number;
  totalTime?: string;
  activeTime?: string;
  averageScrollDepth?: number;
  name?: string;
  sessionsCount?: string;
  url?: string;
  visitsCount?: string;
  sessionsWithMetricPercentage?: number;
  sessionsWithoutMetricPercentage?: number;
  pagesViews?: string;
  subTotal?: string;
}

export interface AnalyticsMetric {
  metricName: string;
  information: AnalyticsMetricInfo[];
}

export interface AvailableDate {
  value: string;
  label: string;
}

export interface GoogleAnalyticsResponse {
  analyticsData?: AnalyticsMetric[];
  lastFetchedAt?: string;
  fromDate?: string;
  toDate?: string;
  availableDates?: AvailableDate[];
}

export interface FetchClarityResponse {
  success: boolean;
  message: string;
}

const getMetric = (data: AnalyticsMetric[], metricName: string): AnalyticsMetric | undefined => {
  return data.find((m) => m.metricName === metricName);
};

export const transformAnalyticsData = (apiData: GoogleAnalyticsResponse) => {
  const { analyticsData, lastFetchedAt, fromDate, toDate, availableDates } = apiData;

  if (!analyticsData || !Array.isArray(analyticsData)) {
    throw new Error('Invalid analytics data format received from API');
  }

  const traffic = getMetric(analyticsData, 'Traffic');
  const trafficInfo = traffic?.information[0] || {};

  const engagementTime = getMetric(analyticsData, 'EngagementTime');
  const timeInfo = engagementTime?.information[0] || {};

  const scrollDepth = getMetric(analyticsData, 'ScrollDepth');
  const scrollInfo = scrollDepth?.information[0] || {};

  const deadClicks = getMetric(analyticsData, 'DeadClickCount');
  const deadClickInfo = deadClicks?.information[0] || {};

  const rageClicks = getMetric(analyticsData, 'RageClickCount');
  const rageClickInfo = rageClicks?.information[0] || {};

  const quickBack = getMetric(analyticsData, 'QuickbackClick');
  const quickBackInfo = quickBack?.information[0] || {};

  const scriptErrors = getMetric(analyticsData, 'ScriptErrorCount');
  const scriptErrorInfo = scriptErrors?.information[0] || {};

  const browsers = getMetric(analyticsData, 'Browser');
  const browserList = browsers?.information || [];

  const devices = getMetric(analyticsData, 'Device');
  const deviceList = devices?.information || [];

  const os = getMetric(analyticsData, 'OS');
  const osList = os?.information || [];

  const countries = getMetric(analyticsData, 'Country');
  const countryList = countries?.information || [];

  const referrers = getMetric(analyticsData, 'ReferrerUrl');
  const referrerList = referrers?.information || [];

  const popularPages = getMetric(analyticsData, 'PopularPages');
  const pagesList = popularPages?.information || [];

  return {
    stats: {
      totalSessions: parseInt(trafficInfo?.totalSessionCount || '0'),
      botSessions: parseInt(trafficInfo?.totalBotSessionCount || '0'),
      distinctUsers: parseInt(trafficInfo?.distinctUserCount || '0'),
      pagesPerSession: trafficInfo?.pagesPerSessionPercentage || 0,
      totalTimeSeconds: parseInt(timeInfo?.totalTime || '0'),
      activeTime: parseInt(timeInfo?.activeTime || '0'),
      avgScrollDepth: scrollInfo?.averageScrollDepth || 0,
    },
    engagement: {
      deadClicks: parseInt(deadClickInfo?.sessionsCount || '0'),
      rageClicks: parseInt(rageClickInfo?.sessionsCount || '0'),
      quickBackClicks: parseInt(quickBackInfo?.sessionsCount || '0'),
      scriptErrors: parseInt(scriptErrorInfo?.sessionsCount || '0'),
    },
    browsers: browserList.map((b) => ({
      name: b.name || 'Unknown',
      value: parseFloat(b.sessionsCount || '0'),
    })),
    devices: deviceList.map((d) => ({
      name: d.name || 'Unknown',
      value: parseFloat(d.sessionsCount || '0'),
    })),
    operatingSystems: osList.map((o) => ({
      name: o.name || 'Unknown',
      value: parseFloat(o.sessionsCount || '0'),
    })),
    countries: countryList.map((c) => ({
      name: c.name || 'Unknown',
      value: parseFloat(c.sessionsCount || '0'),
    })),
    referrers: referrerList.map((r) => ({
      name: r.name || 'Direct',
      value: parseFloat(r.sessionsCount || '0'),
    })),
    pageVisits: pagesList.map((p) => ({
      url: p.url || '',
      visits: parseInt(p.visitsCount || '0'),
    })),
    metadata: {
      lastFetchedAt: lastFetchedAt || new Date().toISOString(),
      fromDate: fromDate || '',
      toDate: toDate || '',
      availableDates: availableDates || [],
    },
  };
};

export const calculatePercentages = (items: Array<{ name: string; value: number }>) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) return items.map((item) => ({ ...item, percentage: 0 }));

  return items.map((item) => ({
    ...item,
    percentage: parseFloat(((item.value / total) * 100).toFixed(1)),
  }));
};

export const getGoogleAnalytics = async (
  fromDate?: string,
  toDate?: string,
  dateRange: string = 'custom'
) => {
  const params = new URLSearchParams();
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  params.append('date_range', dateRange);

  const data = (await api.get(
    `/admin/google-analytics?${params.toString()}`
  )) as GoogleAnalyticsResponse;

  return {
    raw: data,
    transformed: transformAnalyticsData(data),
  };
};

export const fetchClarityData = async (): Promise<FetchClarityResponse> => {
  return (await api.post('/admin/google-analytics/fetch-clarity')) as FetchClarityResponse;
};

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
