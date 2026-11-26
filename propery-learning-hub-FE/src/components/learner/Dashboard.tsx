'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Person,
  PlayCircleOutline,
  CalendarToday,
  BusinessCenter,
  LocationOn,
  Videocam,
  Web,
  CurrencyPound,
  TrendingUp as TrendingUpIcon,
  School,
  Bookmark,
  Update,
  ArrowForward,
  Schedule,
  Close,
} from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';

import dashboardService, {
  DashboardData,
  DashboardStats,
  VideoLesson,
  RecentDeal,
  NotificationItem,
  UpcomingWebinar,
  LearnerProfile,
} from '../../services/dashboardService';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { resolveStorageUrl } from '../../utils/mediaUrl';
import Link from 'next/link';
import ReactPlayer from 'react-player';
import * as journalApi from '../../services/businessJournalApi';

const BOOKALIZER_URL =
  process.env.NEXT_PUBLIC_BOOKALIZER_URL ||
  process.env.NEXT_PUBLIC_BOOKINGSBNB_URL ||
  'https://www.bookalizer.com';

const formatVideoDuration = (seconds?: number | string | null) => {
  if (seconds == null || seconds === '') return '0m';
  if (typeof seconds === 'string' && (seconds.includes(':') || seconds.includes('h') || seconds.includes('m'))) {
    return seconds;
  }
  let secNum = Number(seconds);
  if (isNaN(secNum) || secNum <= 0) return typeof seconds === 'string' ? seconds : '0m';
  const hours = Math.floor(secNum / 3600);
  const minutes = Math.floor((secNum % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

type ActiveSection =
  | 'overview'
  | 'videos'
  | 'webinars'
  | 'meetings'
  | 'deals'
  | 'updates'
  | 'mission';

interface DealViewModel extends RecentDeal {
  saved: boolean;
}

function isPersistedNotificationId(id: string | number): boolean {
  const value = String(id);
  return !/^(video|deal|webinar_reg|template)_/.test(value);
}

function normalizeVideoLesson(video: VideoLesson & { course_id?: number | null }): VideoLesson {
  return {
    ...video,
    courseId: video.courseId ?? video.course_id ?? null,
  };
}

function formatWebinarDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date.split('T')[0] ?? date;
  }
  return parsed.toLocaleDateString();
}

function formatWebinarTime(time: string): string {
  if (!time) return '';
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function webinarRegistrationLabel(status?: string | null): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'registered':
      return 'Pending Approval';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    case 'pending':
      return 'Pending';
    default:
      return 'Not Registered';
  }
}

function webinarRegistrationStatusClass(status?: string | null): string {
  switch (status) {
    case 'approved':
      return 'text-emerald-700';
    case 'registered':
    case 'pending':
      return 'text-blue-700';
    case 'rejected':
      return 'text-red-600';
    case 'cancelled':
      return 'text-slate-500';
    default:
      return 'text-slate-500';
  }
}

function canRegisterForWebinar(status?: string | null): boolean {
  return !status || status === 'rejected' || status === 'cancelled';
}

function canLearnerCancelWebinar(status?: string | null): boolean {
  return status === 'registered'
    || status === 'pending'
    || status === 'waitlisted'
    || status === 'approved';
}

// FIXED: Properly sort notifications by date with unread on top
const sortNotificationsByDate = (notifications: NotificationItem[]): NotificationItem[] => {
  return [...notifications].sort((a, b) => {
    // Priority 1: Unread notifications on top
    if (a.read !== b.read) {
      return a.read ? 1 : -1;
    }

    // Priority 2: Sort by time (newest first)
    // Try to parse dates properly
    const getTimeValue = (item: NotificationItem): number => {
      if (!item.time) return 0;
      
      try {
        // Try parsing as ISO date string
        const date = new Date(item.time);
        if (!isNaN(date.getTime())) {
          return date.getTime();
        }
        
        // Try parsing as relative time string (e.g., "2 hours ago", "3 days ago")
        const relativeMatch = item.time.match(/(\d+)\s*(min|hour|day|week|month|year)s?\s*ago/i);
        if (relativeMatch) {
          const num = parseInt(relativeMatch[1]);
          const unit = relativeMatch[2].toLowerCase();
          const now = Date.now();
          
          switch (unit) {
            case 'min': return now - (num * 60 * 1000);
            case 'hour': return now - (num * 60 * 60 * 1000);
            case 'day': return now - (num * 24 * 60 * 60 * 1000);
            case 'week': return now - (num * 7 * 24 * 60 * 60 * 1000);
            case 'month': return now - (num * 30 * 24 * 60 * 60 * 1000);
            case 'year': return now - (num * 365 * 24 * 60 * 60 * 1000);
            default: return 0;
          }
        }
        
        // Try parsing as "Today", "Yesterday", etc.
        const today = new Date();
        const todayStr = today.toDateString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();
        
        if (item.time.includes('Today')) {
          return today.getTime();
        }
        if (item.time.includes('Yesterday')) {
          return yesterday.getTime();
        }
        
        return 0;
      } catch (e) {
        return 0;
      }
    };
    
    const timeA = getTimeValue(a);
    const timeB = getTimeValue(b);
    
    // If both have valid timestamps, sort by them
    if (timeA > 0 && timeB > 0) {
      return timeB - timeA;
    }
    
    // If one has a timestamp and the other doesn't, the one with timestamp comes first
    if (timeA > 0) return -1;
    if (timeB > 0) return 1;
    
    // If neither has a timestamp, try string comparison as fallback
    if (a.time && b.time) {
      return b.time.localeCompare(a.time);
    }
    
    // Items with time come before items without time
    if (a.time) return -1;
    if (b.time) return 1;
    
    // Final fallback: ID comparison
    return String(b.id).localeCompare(String(a.id));
  });
};

function resolveNotificationLink(
  update: NotificationItem,
  videoLessons: VideoLesson[]
): string | null {
  if (update.link) {
    return update.link;
  }

  const id = String(update.id);

  if (id.startsWith('video_')) {
    const videoId = Number(id.slice('video_'.length));
    const matched = videoLessons.find((video) => video.id === videoId);
    if (matched?.courseId) {
      return `/learn/courses/${matched.courseId}/lessons/${matched.id}`;
    }
  }

  if (id.startsWith('deal_')) {
    return `/learn/deals?dealId=${id.slice('deal_'.length)}`;
  }

  if (id.startsWith('webinar_reg_')) {
    return '/learn/webinars';
  }

  const lessonMatch = update.title.match(/New Lesson: "(.+)"$/);
  if (lessonMatch) {
    const matched = videoLessons.find((video) => video.title === lessonMatch[1]);
    if (matched?.courseId) {
      return `/learn/courses/${matched.courseId}/lessons/${matched.id}`;
    }
  }

  if (update.type === 'course') {
    return '/learn/education';
  }
  if (update.type === 'deal') {
    return '/learn/deals';
  }
  if (update.type === 'webinar') {
    return '/learn/webinars';
  }

  return null;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { admin, token } = useAdminAuth();
  const authDisplayName = admin
    ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim()
    : '';

  const [userName, setUserName] = useState(authDisplayName);
  const [userRole, setUserRole] = useState('Premium Member');
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [error, setError] = useState('');

  // Mission/Vision state
  const [showMissionPopup, setShowMissionPopup] = useState(false);
  const [missionData, setMissionData] = useState<journalApi.JournalData | null>(null);
  const [hasCheckedMission, setHasCheckedMission] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const [videoLessons, setVideoLessons] = useState<VideoLesson[]>([]);
  const [webinars, setWebinars] = useState<UpcomingWebinar[]>([]);
  const [deals, setDeals] = useState<DealViewModel[]>([]);
  const [updates, setUpdates] = useState<NotificationItem[]>([]);

  // Video player state
  const [selectedVideo, setSelectedVideo] = useState<VideoLesson | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [shouldPlayVideo, setShouldPlayVideo] = useState(false);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Track if initial load is complete to prevent double popup
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [infinitWizardLoading, setInfinitWizardLoading] = useState(false);

  useEffect(() => {
    if (authDisplayName) {
      setUserName(authDisplayName);
    }
  }, [authDisplayName]);

  const avatarSrc = useMemo(() => {
    if (!profile?.avatarUrl) return null;
    return resolveStorageUrl(profile.avatarUrl) || profile.avatarUrl;
  }, [profile?.avatarUrl]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadDashboard(),
        loadProfile(),
        checkMissionVision()
      ]);
      setInitialLoadComplete(true);
    };
    loadAllData();
  }, []);

  // Check Mission/Vision - only show popup once
  const checkMissionVision = useCallback(async () => {
    try {
      const journal = await journalApi.getJournal();
      setMissionData(journal);
      setHasCheckedMission(true);

      // Only show popup if mission or vision is empty AND not already shown
      if (!journal.mission || journal.mission.trim() === '' || 
          !journal.visions || journal.visions.length === 0) {
        // Use a small delay to ensure the dashboard has loaded
        setTimeout(() => {
          setShowMissionPopup(true);
        }, 500);
      }
    } catch (err) {
      console.error('Error checking mission/vision:', err);
      setHasCheckedMission(true);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const data = await dashboardService.getDashboard();
      
      setDashboardData(data);

      // Map video lessons
      const mappedVideos = (data.videoLessons || []).map((video) => {
        const videoUrl = 
          video.videoUrl || 
          (video as any).url || 
          (video as any).file_url || 
          (video as any).video_file || 
          (video as any).media_url ||
          null;
        
        const thumbnailUrl = 
          video.thumbnailUrl || 
          video.thumbnail || 
          (video as any).thumbnail_url || 
          (video as any).image || 
          (video as any).image_url ||
          null;
        
        return {
          ...video,
          videoUrl: videoUrl,
          thumbnailUrl: thumbnailUrl,
          courseId: video.courseId ?? (video as any).course_id ?? null,
        };
      });
      
      setVideoLessons(mappedVideos);

      setWebinars(
        (data.upcomingWebinars || []).map((webinar) => ({
          ...webinar,
          registrationStatus:
            webinar.registrationStatus ??
            (webinar as UpcomingWebinar & { registration_status?: string | null }).registration_status ??
            null,
        }))
      );
      setDeals(
        (data.recentDeals || []).map((deal) => ({
          ...deal,
          saved: deal.saved ?? false,
        }))
      );

      // Sort notifications properly
      const sortedNotifications = sortNotificationsByDate(data.notifications || []);
      setUpdates(sortedNotifications);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const user = await dashboardService.getProfile();
      setProfile(user);

      if (user.name) {
        setUserName(user.name);
      } else {
        setUserName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Learner');
      }

      setUserRole(user.role || 'Learner');
    } catch (err) {
      console.error('Error loading profile:', err);
      if (!authDisplayName) {
        setUserName('Learner');
      }
    }
  }, [authDisplayName]);

  const openExternalLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openInfinitWizard = async () => {
    if (infinitWizardLoading) return;
    setInfinitWizardLoading(true);
    try {
      const result = await dashboardService.openInfinitWizard();
      window.open(result.redirect_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('InfinitWizard SSO failed:', err);
      toast.error(err?.message || 'Unable to open InfinitWizard. Please try again.');
    } finally {
      setInfinitWizardLoading(false);
    }
  };

  const navigateToDealMarketplace = () => {
    sessionStorage.removeItem('learner_open_deal_id');
    router.push('/learn/deals');
  };

  const navigateLearnerTab = (tab: string, options?: { dealId?: number }) => {
    if (options?.dealId) {
      sessionStorage.setItem('learner_open_deal_id', String(options.dealId));
    }

    if (tab === 'Deal Marketplace') {
      router.push(
        options?.dealId ? `/learn/deals?dealId=${options.dealId}` : '/learn/deals'
      );
      return;
    }
    if (tab === 'Webinars') {
      router.push('/learn/webinars');
      return;
    }
    if (tab === 'Meetings') {
      router.push('/learn/meetings');
      return;
    }
    if (tab === 'Learn') {
      router.push('/learn/education');
      return;
    }

    router.push('/learn/dashboard');
  };

  const navigateInternalLink = (link: string) => {
    if (link.startsWith('/learn/courses/')) {
      router.push(link);
      return;
    }

    if (link.startsWith('/learn')) {
      try {
        const url = new URL(link, window.location.origin);
        const tab = url.searchParams.get('tab');
        const dealId = url.searchParams.get('dealId');
        const webinarId = url.searchParams.get('webinarId');

        if (dealId) {
          sessionStorage.setItem('learner_open_deal_id', dealId);
        }

        if (!tab && url.pathname !== '/learn' && url.pathname !== '/learn/') {
          router.push(`${url.pathname}${url.search}`);
          return;
        }

        const pathByTab: Record<string, string> = {
          deals: '/learn/deals',
          featured: '/learn/deals',
          my_deals: '/learn/deals',
          pending: '/learn/deals',
          rejected: '/learn/deals',
          webinars: '/learn/webinars',
          meetings: '/learn/meetings',
          learn: '/learn/education',
          education: '/learn/education',
          dashboard: '/learn/dashboard',
        };

        const basePath = tab ? pathByTab[tab] ?? '/learn/dashboard' : '/learn/dashboard';
        const params = new URLSearchParams();
        if (dealId) params.set('dealId', dealId);
        if (webinarId) params.set('webinarId', webinarId);
        if (tab && ['featured', 'my_deals', 'pending', 'rejected'].includes(tab)) {
          params.set('tab', tab);
        }

        const qs = params.toString();
        router.push(qs ? `${basePath}?${qs}` : basePath);
      } catch {
        router.push('/learn/dashboard');
      }
      return;
    }

    window.location.assign(link);
  };

  const navigateToDealDetails = (dealId: number) => {
    sessionStorage.setItem('learner_open_deal_id', String(dealId));
    router.push(`/learn/deals?dealId=${dealId}`);
  };

  const openWebinarsTab = (webinarId?: number) => {
    router.push(webinarId ? `/learn/webinars?webinarId=${webinarId}` : '/learn/webinars');
  };

  const handleViewDealAnalysis = (dealId: number) => {
    navigateToDealDetails(dealId);
  };

  // Handle video playback with authentication
 const handlePlayVideo = useCallback(async (video: VideoLesson) => {
  if (isLoadingVideo) {
    return;
  }

  try {
    setIsLoadingVideo(true);
    setShouldPlayVideo(false);

    const contentId = video.contentId ?? video.id;

    const response = await dashboardService.getVideoUrl(contentId);

    let videoUrl = response.video_url;

    if (!videoUrl) {
      throw new Error('The server did not return a video URL.');
    }

    // Don't add token parameter - use the URL as-is from the backend
    // The backend already generates a signed S3 URL with proper authentication
    
    // Set the video for playback
    setSelectedVideo({
      ...video,
      videoUrl: videoUrl, // Use the URL directly from the response
    });

    setIsVideoModalOpen(true);
    
    // Enable autoplay after modal is open
    setTimeout(() => {
      setShouldPlayVideo(true);
    }, 500);
    
  } catch (error) {
    console.error('Error fetching video URL:', error);
    toast.error(
      error instanceof Error
        ? error.message
        : 'Failed to load video. Please try again.'
    );
  } finally {
    setIsLoadingVideo(false);
  }
}, [isLoadingVideo]);

  const handleCloseVideoPlayer = useCallback(() => {
    setShouldPlayVideo(false);
    setIsVideoModalOpen(false);

    // Allow ReactPlayer one render cycle to process playing={false}
    window.setTimeout(() => {
      setSelectedVideo(null);
    }, 100);
  }, []);

  const handleNotificationNavigate = useCallback((
    update: NotificationItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();
    markUpdateAsRead(update.id);

    const link = resolveNotificationLink(update, videoLessons);
    if (link) {
      navigateInternalLink(link);
      return;
    }

    switch (update.type) {
      case 'course':
        navigateInternalLink('/learn?tab=learn');
        break;
      case 'deal':
        navigateInternalLink('/learn?tab=deals');
        break;
      case 'webinar':
        navigateInternalLink('/learn?tab=webinars');
        break;
      default:
        break;
    }
  }, [videoLessons]);

  const refreshStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const latestStats: DashboardStats = await dashboardService.getStats();

      setDashboardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: latestStats,
        };
      });
    } catch (err) {
      console.error('Error refreshing stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const toggleSaveDeal = useCallback(async (dealId: number) => {
    const previousDeals = [...deals];

    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === dealId ? { ...deal, saved: !deal.saved } : deal
      )
    );

    try {
      const result = await dashboardService.toggleDealFavorite(dealId);
      refreshStats();
      toast.success(result.saved ? 'Deal saved to favorites!' : 'Deal removed from favorites.');
    } catch (err) {
      console.error('Error toggling deal favorite:', err);
      setDeals(previousDeals);
      toast.error(err instanceof Error ? err.message : 'Failed to update favorite.');
    }
  }, [deals, refreshStats]);

  const markUpdateAsRead = useCallback(async (updateId: string | number) => {
    const previousUpdates = [...updates];

    setUpdates((prev) =>
      prev.map((update) =>
        update.id === updateId ? { ...update, read: true } : update
      )
    );

    try {
      if (isPersistedNotificationId(updateId)) {
        await dashboardService.markNotificationRead(updateId);
      } else {
        await dashboardService.markNotificationRead(String(updateId));
      }
      refreshStats();
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setUpdates(previousUpdates);
    }
  }, [updates, refreshStats]);

  const markAllAsRead = useCallback(async () => {
    const previousUpdates = [...updates];
    const syntheticIds = updates
      .filter((update) => !isPersistedNotificationId(update.id))
      .map((update) => String(update.id));

    setUpdates((prev) => prev.map((update) => ({ ...update, read: true })));

    try {
      await dashboardService.markAllNotificationsRead(syntheticIds);
      refreshStats();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setUpdates(previousUpdates);
    }
  }, [updates, refreshStats]);

  const handleRegisterWebinar = (webinarId: number) => {
    openWebinarsTab(webinarId);
  };

  const handleCancelWebinar = useCallback(async (webinarId: number) => {
    const webinar = dashboardData?.upcomingWebinars?.find((item) => item.id === webinarId);
    const isPaid = webinar ? Number(webinar.price ?? 0) > 0 : false;
    const amountLabel = webinar?.price ? `£${Number(webinar.price).toFixed(2)}` : 'the registration fee';
    const confirmed = window.confirm(
      isPaid
        ? `Cancel your registration and refund ${amountLabel} to your original payment method?`
        : 'Are you sure you want to cancel this webinar registration?'
    );
    if (!confirmed) return;

    try {
      const res = await dashboardService.cancelWebinarRegistration(webinarId);
      if (res?.success === false) {
        alert(res.message ?? 'Failed to cancel webinar registration.');
        return;
      }
      await loadDashboard();
      alert(typeof res?.message === 'string' ? res.message : 'Registration cancelled.');
    } catch (err: unknown) {
      console.error('Error cancelling webinar registration:', err);
      alert(err instanceof Error ? err.message : 'Failed to cancel webinar registration.');
    }
  }, [dashboardData, loadDashboard]);

  const stats = useMemo(() => {
    const dashboardStats = dashboardData?.stats;

    return [
      {
        icon: <School className="text-blue-900 text-4xl" />,
        count: dashboardStats?.courseProgress?.value || '0%',
        label: dashboardStats?.courseProgress?.label || 'Course Progress',
        trend: dashboardStats?.courseProgress?.trend || 'No change',
        color: 'bg-blue-50',
        target: 'overview' as ActiveSection,
      },
      {
        icon: <CalendarToday className="text-blue-900 text-4xl" />,
        count: dashboardStats?.meetingsBooked?.value || '0',
        label: dashboardStats?.meetingsBooked?.label || 'Meetings Booked',
        trend: dashboardStats?.meetingsBooked?.trend || 'No meetings',
        color: 'bg-emerald-50',
        target: 'meetings' as ActiveSection,
      },
      {
        icon: <Bookmark className="text-blue-900 text-4xl" />,
        count: dashboardStats?.savedDeals?.value || '0',
        label: dashboardStats?.savedDeals?.label || 'Saved Deals',
        trend: dashboardStats?.savedDeals?.trend || 'No saved deals',
        color: 'bg-amber-50',
        target: 'deals' as ActiveSection,
      },
      {
        icon: <Update className="text-blue-900 text-4xl" />,
        count: dashboardStats?.notifications?.value || '0',
        label: dashboardStats?.notifications?.label || 'Notifications',
        trend: `Unread: ${dashboardStats?.notifications?.unread ?? 0}`,
        color: 'bg-purple-50',
        target: 'updates' as ActiveSection,
      },
    ];
  }, [dashboardData]);

  const quickLinks = useMemo(() => {
    const quickStats = dashboardData?.quickStats;

    return [
      {
        id: 1,
        title: 'Latest Video Lessons',
        icon: <Videocam className="text-blue-600 text-2xl" />,
        description: 'Continue learning from where you left off',
        count: quickStats?.latestVideoLessons ?? videoLessons.length,
        target: 'videos' as ActiveSection,
      },
      {
        id: 2,
        title: 'Upcoming Webinars',
        icon: <Web className="text-emerald-600 text-2xl" />,
        description: 'Join live training sessions',
        count: quickStats?.upcomingWebinars ?? webinars.length,
        target: 'webinars' as ActiveSection,
      },
      {
        id: 3,
        title: 'New Deals',
        icon: <CurrencyPound className="text-amber-600 text-2xl" />,
        description: 'Fresh investment opportunities',
        count: quickStats?.newDeals ?? deals.length,
        target: 'deals' as ActiveSection,
      },
    ];
  }, [dashboardData, videoLessons.length, webinars.length, deals.length]);

  // Render Mission & Vision Section
  const renderMissionVision = useCallback(() => {
    if (!missionData) return null;
    
    const hasMission = missionData.mission && missionData.mission.trim() !== '';
    const hasVisions = missionData.visions && missionData.visions.length > 0;

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-7 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Your Mission & Vision</h2>
          <button
            onClick={() => router.push('/learn/business-journal')}
            className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
          >
            Edit in Journal
            <ArrowForward className="text-base" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mission */}
          <div className={`rounded-lg p-4 ${hasMission ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50 border border-gray-200 border-dashed'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800">Mission Statement</h3>
              {!hasMission && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not set</span>
              )}
            </div>
            {hasMission ? (
               <p className="text-sm text-slate-700 leading-relaxed break-words whitespace-pre-wrap">{missionData.mission}</p>
  ) : (
              <p className="text-sm text-slate-400 italic">No mission statement defined yet.</p>
            )}
          </div>

          {/* Vision */}
          <div className={`rounded-lg p-4 ${hasVisions ? 'bg-indigo-50 border border-indigo-100' : 'bg-gray-50 border border-gray-200 border-dashed'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-slate-800">Vision Statements</h3>
              {!hasVisions && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not set</span>
              )}
            </div>
            {hasVisions ? (
              <ul className="space-y-1">
                {missionData.visions.slice(0, 3).map((vision, index) => (
                  <li key={index} className="text-sm text-slate-700 flex items-start gap-2 min-w-0">
                    <span className="text-indigo-500 font-bold text-xs mt-0.5 flex-shrink-0">•</span>
                    <span className="break-words whitespace-pre-wrap min-w-0">{vision}</span>
                  </li>
                ))}
                {missionData.visions.length > 3 && (
                  <li className="text-sm text-slate-400 italic">+{missionData.visions.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 italic">No vision statements defined yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }, [missionData, router]);

  // Mission/Vision Popup
  const renderMissionPopup = useCallback(() => (
    <Dialog
      open={showMissionPopup}
      onClose={() => setShowMissionPopup(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: 'rounded-2xl p-4',
      }}
    >
      <DialogTitle className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-800">Complete Your Mission & Vision</span>
          </div>
        </div>
        <IconButton onClick={() => setShowMissionPopup(false)} className="text-gray-400 hover:text-gray-600">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent className="pt-4">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-100 rounded-lg mt-0.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Set Mission Statement</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {!missionData?.mission || missionData.mission.trim() === '' 
                    ? 'You haven\'t defined your mission statement yet. A clear mission helps guide your business decisions.'
                    : 'Your mission statement is set, but you need to define your vision.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-indigo-100 rounded-lg mt-0.5">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Set Vision Statement</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {!missionData?.visions || missionData.visions.length === 0
                    ? 'You haven\'t defined your vision statements yet. Your vision describes where you want to be in the future.'
                    : 'Your vision statements are set, but you need to define your mission.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
      
      <DialogActions className="pt-4 border-t border-gray-100">
        <Button
          onClick={() => setShowMissionPopup(false)}
          className="text-gray-600 hover:text-gray-800"
        >
          Later
        </Button>
        <Button
          onClick={() => {
            setShowMissionPopup(false);
            router.push('/learn/business-journal?tab=mission');
          }}
          variant="contained"
          className="bg-blue-800 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold"
        >
          Go to Business Journal
        </Button>
      </DialogActions>
    </Dialog>
  ), [showMissionPopup, missionData, router]);

  // Video Player Modal
  const renderVideoPlayer = useCallback(() => {
    if (!selectedVideo?.videoUrl) {
      return null;
    }

    const videoUrl = selectedVideo.videoUrl;

    return (
      <Dialog
        open={isVideoModalOpen}
        onClose={handleCloseVideoPlayer}
        maxWidth="lg"
        fullWidth
        keepMounted
        PaperProps={{
          className: 'rounded-2xl bg-black',
          style: {
            position: 'relative',
          },
        }}
      >
        <div className="relative">
          <IconButton
            onClick={handleCloseVideoPlayer}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 bg-black/50 rounded-full"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
            }}
          >
            <Close className="text-white text-2xl" />
          </IconButton>

          <div className="p-6">
            <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4">
              {isLoadingVideo ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900/30 to-purple-900/30">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <p className="text-white/60">Loading video...</p>
                </div>
              ) : (
                <ReactPlayer
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  playing={shouldPlayVideo}
                  width="100%"
                  height="100%"
                  controlsList="nodownload"
                  preload="metadata"
                  onReady={() => {
                    setShouldPlayVideo(true);
                  }}
                  onPlay={() => {}}
                  onPause={() => {}}
                  onEnded={() => {
                    setShouldPlayVideo(false);
                  }}
                  onError={(error) => {
                    console.error('Video playback error:', error);
                    setShouldPlayVideo(false);
                    toast.error(
                      'Failed to play the video. Please check your connection and try again.'
                    );
                  }}
                />
              )}
            </div>

            <div className="text-black">
              <h3 className="text-xl font-bold text-black">
                {selectedVideo.title}
              </h3>

              <p className="text-black text-sm mt-1">
                Instructor: {selectedVideo.instructor}
              </p>

              {selectedVideo.courseTitle && (
                <p className="text-black text-sm">
                  Course: {selectedVideo.courseTitle}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3">
                <span className="text-sm text-black">
                  Category: {selectedVideo.category}
                </span>

                <span className="text-sm text-black">
                  Progress: {selectedVideo.progress ?? 0}%
                </span>

                {selectedVideo.duration && (
                  <span className="text-sm text-black">
                    Duration: {formatVideoDuration(selectedVideo.duration)}
                  </span>
                )}
              </div>

              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${selectedVideo.progress ?? 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    );
  }, [selectedVideo, isVideoModalOpen, isLoadingVideo, shouldPlayVideo, handleCloseVideoPlayer]);

  const renderSection = useCallback(() => {
    switch (activeSection) {
      case 'videos':
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Latest Video Lessons</h2>
              <button
                className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                onClick={() => setActiveSection('overview')}
              >
                ← Back to Overview
              </button>
            </div>

            {videoLessons.length === 0 ? (
              <div className="text-slate-500 text-center py-12">No video lessons available.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {videoLessons.map((video) => (
                  <div
                    key={video.id}
                    className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => handlePlayVideo(video)} 
                  >
                    <div className="bg-slate-900 h-40 relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 pointer-events-none"></div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center transition-all shadow-lg z-10">
                          <PlayCircleOutline className="text-gray-700 text-3xl" />
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent text-white">
                        <div className="text-xs bg-blue-900 text-white px-2 py-0.5 rounded inline-block">
                          {video.category}
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{video.title}</h3>
                      <p className="text-xs text-slate-500 mb-1">Instructor: {video.instructor}</p>
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span>Duration: {formatVideoDuration(video.duration)}</span>
                        <span>Progress: {video.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${video.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'meetings':
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Your Meetings</h2>
              <button
                className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                onClick={() => navigateLearnerTab('Meetings')}
              >
                Open Meetings
                <ArrowForward className="text-base" />
              </button>
            </div>
            <p className="text-slate-600 mb-4">
              View and manage your booked platform meetings, including discovery calls with the admin team.
            </p>
            <button
              type="button"
              onClick={() => navigateLearnerTab('Meetings')}
              className="bg-blue-900 text-white px-5 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all"
            >
              Go to Meetings
            </button>
          </div>
        );

      case 'webinars':
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Upcoming Webinars</h2>
              <button
                className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                onClick={() => setActiveSection('overview')}
              >
                ← Back to Overview
              </button>
            </div>

            {webinars.length === 0 ? (
              <div className="text-slate-500 text-center py-12">No webinars available.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {webinars.map((webinar) => (
                  <div
                    key={webinar.id}
                    className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-slate-800">{webinar.title}</h3>
                      <div className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800">
                        {webinar.status}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-slate-600 mb-5">
                      <div className="flex items-center gap-2">
                        <CalendarToday className="text-base" />
                        <span>{formatWebinarDate(webinar.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Schedule className="text-base" />
                        <span>{formatWebinarTime(webinar.time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Web className="text-base" />
                        <span>{webinar.category} • {webinar.level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Person className="text-base" />
                        <span>{webinar.instructor}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-slate-500">
                        Duration: {webinar.duration} mins
                      </span>
                      {webinar.registrationStatus ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            webinar.registrationStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : webinar.registrationStatus === 'rejected'
                              ? 'bg-red-600 text-white'
                              : webinar.registrationStatus === 'cancelled'
                              ? 'bg-slate-100 text-slate-600'
                              : webinar.registrationStatus === 'registered'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {webinarRegistrationLabel(webinar.registrationStatus)}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-blue-900">Open</span>
                      )}
                    </div>

                    {webinar.registrationStatus === 'rejected' && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        <p className="font-semibold">Registration declined</p>
                        <p className="mt-1 leading-relaxed">
                          {webinar.paymentStatus === 'refunded'
                            ? `A refund of £${Number(webinar.amountPaid ?? webinar.price ?? 0).toFixed(2)} has been initiated to your original payment method. Refunds typically appear within 5–10 business days.`
                            : Number(webinar.price ?? 0) > 0 || webinar.paymentStatus === 'paid'
                              ? 'If you paid for this webinar, please contact support regarding your refund.'
                              : webinar.rejectionReason
                                ? `Reason: ${webinar.rejectionReason}`
                                : 'You may register again if places are still available.'}
                        </p>
                      </div>
                    )}

                    {webinar.registrationStatus === 'approved' ? (
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all"
                          onClick={() => openWebinarsTab(webinar.id)}
                        >
                          View in Webinars
                        </button>
                        <button
                          type="button"
                          className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-all"
                          onClick={() => handleCancelWebinar(webinar.id)}
                        >
                          {parseFloat(String(webinar.price ?? 0)) > 0
                            ? 'Cancel & Refund'
                            : 'Cancel Registration'}
                        </button>
                      </div>
                    ) : canLearnerCancelWebinar(webinar.registrationStatus) ? (
                      <button
                        type="button"
                        className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition-all"
                        onClick={() => handleCancelWebinar(webinar.id)}
                      >
                        Cancel Registration
                      </button>
                    ) : webinar.registrationStatus === 'rejected' ? (
                      <button
                        type="button"
                        className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all"
                        onClick={() => openWebinarsTab(webinar.id)}
                      >
                        Register Again
                      </button>
                    ) : canRegisterForWebinar(webinar.registrationStatus) ? (
                      <button
                        type="button"
                        className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all"
                        onClick={() => openWebinarsTab(webinar.id)}
                      >
                        {parseFloat(String(webinar.price ?? 0)) > 0
                          ? 'Register & Pay'
                          : 'Register for Webinar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-all"
                        onClick={() => openWebinarsTab(webinar.id)}
                      >
                        View in Webinars
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'deals':
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">New Investment Deals</h2>
              <button
                className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                onClick={() => setActiveSection('overview')}
              >
                ← Back to Overview
              </button>
            </div>

            {deals.length === 0 ? (
              <div className="text-slate-500 text-center py-12">No deals available.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">{deal.title}</h3>
                        <button
                          onClick={() => toggleSaveDeal(deal.id)}
                          className="text-slate-400 hover:text-amber-500"
                        >
                          <Bookmark
                            className={`text-lg ${deal.saved ? 'text-amber-500 fill-amber-500' : ''}`}
                          />
                        </button>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          deal.status === 'Published'
                            ? 'bg-emerald-50 text-emerald-800'
                            : deal.status === 'Under Review'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {deal.status}
                      </div>
                    </div>

                    <div className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                      <LocationOn className="text-base" />
                      {deal.location}
                    </div>

                    <div className="text-xs text-slate-500 mb-3">
                      Property Type: {deal.propertyType}
                    </div>

                    <div className="text-2xl font-bold text-blue-900 mb-6">{deal.price}</div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-slate-500 mb-1">ROI</div>
                        <div className="text-lg font-bold text-emerald-600">{deal.roi}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewDealAnalysis(deal.id)}
                      className="w-full bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all"
                    >
                      View Full Analysis
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'updates':
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">New Updates & Notifications</h2>
                <p className="text-slate-500 mt-1">
                  Stay updated with the latest platform news and activities
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="text-sm text-blue-900 font-semibold hover:text-blue-700"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </button>
                <button
                  className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                  onClick={() => setActiveSection('overview')}
                >
                  ← Back to Overview
                </button>
              </div>
            </div>

            {updates.length === 0 ? (
              <div className="text-slate-500 text-center py-12">No notifications available.</div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
                {updates.map((update) => (
                  <div
                    key={update.id}
                    className={`border rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${
                      update.read ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50'
                    }`}
                    onClick={() => markUpdateAsRead(update.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          update.type === 'course'
                            ? 'bg-blue-100'
                            : update.type === 'webinar'
                            ? 'bg-emerald-100'
                            : update.type === 'deal'
                            ? 'bg-amber-100'
                            : 'bg-purple-100'
                        }`}
                      >
                        {update.type === 'course' ? (
                          <School className="text-blue-600 text-2xl" />
                        ) : update.type === 'webinar' ? (
                          <Web className="text-emerald-600 text-2xl" />
                        ) : update.type === 'deal' ? (
                          <CurrencyPound className="text-amber-600 text-2xl" />
                        ) : (
                          <Update className="text-purple-600 text-2xl" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-800">{update.title}</h3>
                          {!update.read && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                              NEW
                            </span>
                          )}
                        </div>

                        <p className="text-slate-600 mb-3">{update.description}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">{update.time}</span>
                          <Link 
                            href="/learn/announcements"
                            className="text-blue-900 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                          >
                            View Details
                            <ArrowForward className="text-base" />
                          </Link>
                        </div> 
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return (
          <>
            {/* Mission & Vision Section */}
            {renderMissionVision()}

            {/* Quick Links */}
            <div className="bg-white rounded-xl border border-slate-200 p-7 mb-6">
              <h2 className="text-lg font-bold text-slate-800 mb-5">Quick Access</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {quickLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      if (link.target === 'deals') {
                        navigateToDealMarketplace();
                        return;
                      }
                      setActiveSection(link.target);
                    }}
                    className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-50 rounded-lg">{link.icon}</div>
                      <div className="text-lg font-bold text-blue-900">{link.count}</div>
                    </div>
                    <div className="font-semibold text-slate-800 mb-2">{link.title}</div>
                    <div className="text-sm text-slate-500">{link.description}</div>
                    <div className="mt-3 text-blue-900 font-semibold text-sm flex items-center gap-1">
                      View All
                      <ArrowForward className="text-base" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Grid */}
            <div>
              <div className="bg-white rounded-xl border border-slate-200 p-7">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-slate-800">Latest Video Lessons</h2>
                  <Link 
                    href="/learn/education"
                    className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                  >
                    View All
                    <ArrowForward className="text-base" />
                  </Link>
                </div>

                {videoLessons.length === 0 ? (
                  <div className="text-slate-500 text-center py-10">
                    No video lessons available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videoLessons.slice(0, 3).map((video) => (
                      <div
                        key={video.id}
                        className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => handlePlayVideo(video)}
                      >
                        <div className="bg-slate-900 h-40 relative">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 pointer-events-none"></div>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center transition-all shadow-lg z-10">
                              <PlayCircleOutline className="text-gray-700 text-3xl" />
                            </span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent text-white">
                            <div className="text-xs bg-blue-900 text-white px-2 py-0.5 rounded inline-block">
                              {video.category}
                            </div>
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-2">{video.title}</h3>
                          <p className="text-xs text-slate-500 mb-1">Instructor: {video.instructor}</p>
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                            <span>Duration: {formatVideoDuration(video.duration)}</span>
                            <span>Progress: {video.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${video.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* New Deals Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-7 mt-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800">New Deals</h2>
                <button
                  className="text-sm text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1"
                  onClick={navigateToDealMarketplace}
                >
                  View All
                  <ArrowForward className="text-base" />
                </button>
              </div>

              {deals.length === 0 ? (
                <div className="text-slate-500 text-center py-10">No deals available.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {deals.slice(0, 3).map((deal) => (
                    <div
                      key={deal.id}
                      className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-slate-800 text-sm">{deal.title}</div>
                          <button
                            onClick={() => toggleSaveDeal(deal.id)}
                            className="text-slate-400 hover:text-amber-500"
                          >
                            <Bookmark
                              className={`text-sm ${deal.saved ? 'text-amber-500 fill-amber-500' : ''}`}
                            />
                          </button>
                        </div>

                        <div
                          className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                            deal.status === 'Published'
                              ? 'bg-emerald-50 text-emerald-800'
                              : deal.status === 'Under Review'
                              ? 'bg-blue-50 text-blue-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {deal.status}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                        <LocationOn className="text-sm" />
                        {deal.location}
                      </div>

                      <div className="text-base font-bold text-blue-900 mb-3">{deal.price}</div>

                      <div className="flex gap-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <TrendingUpIcon className="text-sm" />
                          ROI: {deal.roi}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleViewDealAnalysis(deal.id)}
                        className="mt-4 w-full bg-blue-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-all"
                      >
                        View Full Analysis
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        );
    }
  }, [activeSection, videoLessons, handlePlayVideo, navigateLearnerTab, webinars, handleCancelWebinar, deals, toggleSaveDeal, handleViewDealAnalysis, updates, markAllAsRead, markUpdateAsRead, handleNotificationNavigate, renderMissionVision, quickLinks, navigateToDealMarketplace]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-800 mb-2">Loading dashboard...</div>
          <div className="text-sm text-slate-500">Please wait</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Welcome back, {userName}!
              </h1>
              <p className="text-slate-500 mt-1">
                Here's what's happening with your property education today
              </p>
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </div>

            <Link href="/learn/profile" passHref>
              <div className="flex items-center gap-4 cursor-pointer">
                <div className="text-right">
                  <div className="font-semibold text-slate-800 hover:text-blue-900 transition-colors">
                    {userName}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden transition-all hover:bg-blue-900 hover:text-white">
                  {avatarSrc && !avatarLoadFailed ? (
                    <img
                      src={avatarSrc}
                      alt={userName || 'Profile'}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    <Person className="text-gray-600 text-2xl hover:text-white" />
                  )}
                </div>
              </div>
            </Link>
          </div>

{/* Advertisements */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="flex-1 bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-4 text-white flex flex-col">
    <div className="flex flex-col h-full">
      <div>
        <div className="font-bold text-lg mb-1">Bookalizer</div>
        <p className="text-sm opacity-90 mb-4">List your property and get more bookings effortlessly.</p>
      </div>
      <div className="mt-auto">
        <button
          type="button"
          onClick={() => openExternalLink(BOOKALIZER_URL)}
          className="bg-white text-blue-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 w-full md:w-auto"
        >
          Learn More
        </button>
      </div>
    </div>
  </div>

  <div className="flex-1 bg-gradient-to-r from-purple-900 to-purple-700 rounded-xl p-4 text-white flex flex-col">
    <div className="flex flex-col h-full">
      <div>
        <div className="font-bold text-lg mb-1">Infinitwizard</div>
        <p className="text-sm opacity-90 mb-4">Run your business seamlessly with everything in one place: CRM, Invoices, InfinitDoc, and more.</p>
      </div>
      <div className="mt-auto">
        <button
          type="button"
          onClick={openInfinitWizard}
          disabled={infinitWizardLoading}
          className="bg-white text-purple-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 w-full md:w-auto disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {infinitWizardLoading ? 'Opening…' : 'Explore'}
        </button>
      </div>
    </div>
  </div>
</div>
        </header>

        {/* Main Content */}
        <main className="p-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {stats.map((stat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSection(stat.target)}
                className={`${stat.color} rounded-xl border border-slate-200 p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer text-left`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white rounded-lg">{stat.icon}</div>
                  <span className="text-sm font-semibold text-slate-600">
                    {statsLoading ? 'Updating...' : stat.trend}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-800 leading-none">{stat.count}</div>
                <div className="text-sm text-slate-600 mt-2 font-medium">{stat.label}</div>
              </button>
            ))}
          </div>

          {/* Dynamic Section */}
          {renderSection()}
        </main>
      </div>

      {/* Mission/Vision Popup */}
      {renderMissionPopup()}

      {/* Video Player */}
      {renderVideoPlayer()}
    </div>
  );
};

export default Dashboard;