'use client';

import { useState, useEffect } from 'react';
import { User, Video, Document, Deal, AnalyticsData } from '../lib/types';

export const useAdmin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState({
    users: true,
    content: true,
    deals: true,
    analytics: true,
  });

  // Mock data for demo - replace with API calls to Laravel backend
  useEffect(() => {
    // Load users
    setTimeout(() => {
      setUsers([
        {
          id: '1',
          email: 'sarah@example.com',
          name: 'Sarah Johnson',
          role: 'member',
          isApproved: true,
          suspended: false,
          joinedDate: new Date('2024-01-15'),
          lastActive: new Date('2024-12-08'),
          progress: { videosWatched: 12, documentsRead: 8, completedCourses: 3 },
        },
        {
          id: '2',
          email: 'mike@example.com',
          name: 'Mike Wilson',
          role: 'member',
          isApproved: false,
          suspended: false,
          joinedDate: new Date('2024-12-07'),
          lastActive: new Date('2024-12-07'),
          progress: { videosWatched: 0, documentsRead: 0, completedCourses: 0 },
        },
        {
          id: '3',
          email: 'emma@example.com',
          name: 'Emma Davis',
          role: 'admin',
          isApproved: true,
          suspended: false,
          joinedDate: new Date('2024-11-20'),
          lastActive: new Date('2024-12-08'),
          progress: { videosWatched: 25, documentsRead: 15, completedCourses: 8 },
        },
      ]);
      setLoading(prev => ({ ...prev, users: false }));
    }, 500);

    // Load videos
    setTimeout(() => {
      setVideos([
        {
          id: '1',
          title: 'Advanced Deal Structuring Strategies',
          description: 'Learn how to structure complex real estate deals for maximum profit.',
          url: '#',
          duration: 1458,
          category: 'Advanced',
          thumbnail: '#',
          uploadDate: new Date('2024-11-15'),
          views: 1245,
          isPublished: true,
        },
        {
          id: '2',
          title: 'Beginner Guide to Real Estate Investing',
          description: 'Perfect for new investors starting their journey in real estate.',
          url: '#',
          duration: 1965,
          category: 'Beginner',
          thumbnail: '#',
          uploadDate: new Date('2024-11-10'),
          views: 2890,
          isPublished: true,
        },
      ]);
      setLoading(prev => ({ ...prev, content: false }));
    }, 600);

    // Load deals
    setTimeout(() => {
      setDeals([
        {
          id: '1',
          title: 'Downtown Commercial Complex',
          description: 'Prime commercial property in downtown area',
          price: 2450000,
          location: 'Seattle, WA',
          status: 'published',
          roi: 12.5,
          capRate: 7.8,
          views: 124,
          inquiries: 8,
          createdAt: new Date('2024-11-15'),
        },
      ]);
      setLoading(prev => ({ ...prev, deals: false }));
    }, 700);

    // Load analytics
    setTimeout(() => {
      setAnalytics({
        activeUsers: {
          daily: 843,
          weekly: 2145,
          monthly: 5890,
        },
        contentEngagement: {
          topVideos: [],
          topDocuments: [],
          totalWatchTime: 2845,
          averageCompletion: 68,
        },
        dealPerformance: {
          totalViews: 1245,
          topDeals: [],
          conversionRate: 6.5,
        },
        userGrowth: {
          newUsers: 124,
          activeUsers: 843,
          retentionRate: 78,
        },
      });
      setLoading(prev => ({ ...prev, analytics: false }));
    }, 800);
  }, []);

  const approveUser = async (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isApproved: true } : user
    ));
    return true;
  };

  const suspendUser = async (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, suspended: true } : user
    ));
    return true;
  };

  const updateUserRole = async (userId: string, role: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, role: role as any } : user
    ));
    return true;
  };

  const publishVideo = async (videoId: string) => {
    setVideos(videos.map(video => 
      video.id === videoId ? { ...video, isPublished: true } : video
    ));
    return true;
  };

  const publishDeal = async (dealId: string) => {
    setDeals(deals.map(deal => 
      deal.id === dealId ? { ...deal, status: 'published' } : deal
    ));
    return true;
  };

  return {
    users,
    videos,
    documents,
    deals,
    analytics,
    loading,
    approveUser,
    suspendUser,
    updateUserRole,
    publishVideo,
    publishDeal,
  };
};