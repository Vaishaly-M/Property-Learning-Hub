export type UserRole = 'member' | 'admin' | 'super_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isApproved: boolean;
  suspended: boolean;
  joinedDate: Date;
  lastActive: Date;
  progress: {
    videosWatched: number;
    documentsRead: number;
    completedCourses: number;
  };
}

export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: number;
  category: string;
  thumbnail: string;
  uploadDate: Date;
  views: number;
  isPublished: boolean;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileSize: number;
  category: string;
  uploadDate: Date;
  downloads: number;
  isPublished: boolean;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  status: 'draft' | 'published' | 'closed';
  roi: number;
  capRate: number;
  views: number;
  inquiries: number;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: UserRole[] | 'all';
  sentDate: Date;
  readCount: number;
}

export interface AnalyticsData {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  contentEngagement: {
    topVideos: Video[];
    topDocuments: Document[];
    totalWatchTime: number;
    averageCompletion: number;
  };
  dealPerformance: {
    totalViews: number;
    topDeals: Deal[];
    conversionRate: number;
  };
  userGrowth: {
    newUsers: number;
    activeUsers: number;
    retentionRate: number;
  };
}   