import api from './api';

export interface LearnerAnnouncement {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  date: string;
  time: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'educational' | 'maintenance' | 'opportunity' | 'general';
  tags: string[];
  isRead: boolean;
  isBookmarked: boolean;
  isPinned: boolean;
  attachments?: {
    name: string;
    size: string;
    type: string;
  }[];
  expiresAt?: string;
  actionRequired?: boolean;
  createdAt?: string;
  timeAgo?: string;
}

interface AnnouncementsResponse {
  success: boolean;
  data: LearnerAnnouncement[];
}

const learnerAnnouncementService = {
  async getAnnouncements(): Promise<LearnerAnnouncement[]> {
    const res = await api.get('/learner/announcements') as AnnouncementsResponse;
    return res.data ?? [];
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/learner/announcements/${encodeURIComponent(id)}/read`);
  },

  async toggleBookmark(id: string): Promise<boolean> {
    const res = await api.post(`/learner/announcements/${encodeURIComponent(id)}/bookmark`) as {
      success: boolean;
      isBookmarked: boolean;
    };
    return res.isBookmarked;
  },

  async togglePin(id: string): Promise<boolean> {
    const res = await api.post(`/learner/announcements/${encodeURIComponent(id)}/pin`) as {
      success: boolean;
      isPinned: boolean;
    };
    return res.isPinned;
  },
};

export default learnerAnnouncementService;
