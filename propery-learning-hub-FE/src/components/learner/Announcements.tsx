'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Announcement,
  Campaign,
  Notifications,
  NotificationsActive,
  Info,
  Warning,
  Error as ErrorIcon,
  CheckCircle,
  Schedule,
  Bookmark,
  Share,
  MoreVert,
  School,
  Search,
  FilterList,
  Star,
  StarBorder,
  Visibility,
  Download,
  Email,
  CalendarToday,
  Person,
  Business,
  LocalOffer,
  PushPin,
  PushPinOutlined,
  Close
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import learnerAnnouncementService, { LearnerAnnouncement } from '../../services/learnerAnnouncementService';
import dashboardService from '../../services/dashboardService';

interface AnnouncementItem extends LearnerAnnouncement {}

const Announcements: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('English');
  const [savingSettings, setSavingSettings] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await learnerAnnouncementService.getAnnouncements();
      setAnnouncements(data);
    } catch {
      setAnnouncements([]);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  // Load preferences
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const profile = await dashboardService.getProfile();
        if (profile?.settings) {
          setEmailNotifications(profile.settings.email_notifications ?? true);
          setTheme(profile.settings.theme ?? 'light');
          setLanguage(profile.settings.language ?? 'English');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    void fetchSettings();
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      await dashboardService.updateProfile({
        settings: {
          email_notifications: emailNotifications,
          theme,
          language,
        },
      });
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
      toast.success('Notification preferences saved successfully!');
      setShowSettingsModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await learnerAnnouncementService.markRead(id);
      setAnnouncements((prev) => prev.map((item) => (
        String(item.id) === String(id) ? { ...item, isRead: true } : item
      )));
      toast.success('Marked as read');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  const toggleBookmark = async (id: string) => {
    try {
      const isBookmarked = await learnerAnnouncementService.toggleBookmark(id);
      setAnnouncements((prev) => prev.map((item) => (
        String(item.id) === String(id) ? { ...item, isBookmarked } : item
      )));
      toast.success(isBookmarked ? 'Announcement bookmarked' : 'Bookmark removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update bookmark');
    }
  };

  const togglePin = async (id: string) => {
    try {
      const isPinned = await learnerAnnouncementService.togglePin(id);
      setAnnouncements((prev) => prev.map((item) => (
        String(item.id) === String(id) ? { ...item, isPinned } : item
      )));
      toast.success(isPinned ? 'Announcement pinned' : 'Announcement unpinned');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update pin status');
    }
  };

  const shareAnnouncement = async (announcement: AnnouncementItem) => {
    const shareText = `${announcement.title}\n\n${announcement.content}`;
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?tab=announcements`
      : '';

    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: announcement.title,
          text: announcement.content,
          url: shareUrl,
        });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast.success('Announcement copied to clipboard');
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = `${shareText}\n\n${shareUrl}`;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('Announcement copied to clipboard');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      toast.error('Unable to share this announcement');
    }
  };

  const emailAnnouncement = (announcement: AnnouncementItem) => {
    const subject = encodeURIComponent(announcement.title);
    const body = encodeURIComponent(`${announcement.content}\n\n— Freedom Property Academy`);
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    const popup = window.open(mailto, '_blank');
    if (!popup) {
      window.location.href = mailto;
    }
  };

  const priorities = [
    { value: 'all', label: 'All Priorities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'system', label: 'System Updates' },
    { value: 'educational', label: 'Educational' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'opportunity', label: 'Opportunities' },
    { value: 'general', label: 'General' }
  ];

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = selectedPriority === 'all' || announcement.priority === selectedPriority;
    const matchesCategory = selectedCategory === 'all' || announcement.category === selectedCategory;
    const matchesTab = 
      (activeTab === 'all') ||
      (activeTab === 'unread' && !announcement.isRead) ||
      (activeTab === 'pinned' && announcement.isPinned) ||
      (activeTab === 'bookmarked' && announcement.isBookmarked);

    return matchesSearch && matchesPriority && matchesCategory && matchesTab;
  }).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const unreadCount = announcements.filter(a => !a.isRead).length;
  const pinnedCount = announcements.filter(a => a.isPinned).length;
  const bookmarkedCount = announcements.filter(a => a.isBookmarked).length;

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-slate-100 text-slate-600';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-amber-100 text-amber-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low': return <Info className="w-3.5 h-3.5" />;
      case 'medium': return <Warning className="w-3.5 h-3.5" />;
      case 'high': return <ErrorIcon className="w-3.5 h-3.5" />;
      case 'critical': return <NotificationsActive className="w-3.5 h-3.5" />;
      default: return <Announcement className="w-3.5 h-3.5" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'system': return 'bg-slate-100 text-slate-600';
      case 'educational': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-amber-100 text-amber-800';
      case 'opportunity': return 'bg-blue-100 text-blue-800';
      case 'general': return 'bg-violet-100 text-violet-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return <Business className="w-3.5 h-3.5" />;
      case 'educational': return <School className="w-3.5 h-3.5" />;
      case 'maintenance': return <Schedule className="w-3.5 h-3.5" />;
      case 'opportunity': return <LocalOffer className="w-3.5 h-3.5" />;
      case 'general': return <Campaign className="w-3.5 h-3.5" />;
      default: return <Announcement className="w-3.5 h-3.5" />;
    }
  };

  const tabs = [
    { id: 'all', label: 'All Announcements', count: announcements.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
    { id: 'pinned', label: 'Pinned', count: pinnedCount },
    { id: 'bookmarked', label: 'Bookmarked', count: bookmarkedCount }
  ];

  const AnnouncementCard = ({ announcement }: { announcement: AnnouncementItem }) => (
    <div
      className={`
        relative bg-white rounded-xl border p-6 mb-5 transition-all hover:shadow-xl hover:-translate-y-0.5
        ${!announcement.isRead ? 'bg-slate-50 border-l-4 border-l-blue-900' : 'border-slate-200'}
        ${announcement.isPinned ? 'border-2 border-amber-200 bg-amber-50' : ''}
      `}
    >
      {announcement.isPinned && (
        <PushPin className="absolute top-4 right-4 text-amber-600 rotate-[45deg]" />
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            {!announcement.isRead && (
              <div className="w-2 h-2 bg-blue-900 rounded-full" />
            )}
            <h3 className="text-base font-semibold text-slate-800">
              {announcement.title}
            </h3>
            {announcement.actionRequired && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                <Warning className="w-3 h-3" />
                Action Required
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            {announcement.content}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(announcement.priority)}`}>
            {getPriorityIcon(announcement.priority)}
            {announcement.priority}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getCategoryBadge(announcement.category)}`}>
            {getCategoryIcon(announcement.category)}
            {announcement.category}
          </span>
        </div>
      </div>

      {/* Author Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
          {announcement.author.avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{announcement.author.name}</div>
          <div className="text-xs text-slate-500">{announcement.author.role}</div>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <CalendarToday className="w-3.5 h-3.5" />
          {announcement.date}
        </span>
        <span className="flex items-center gap-1">
          <Schedule className="w-3.5 h-3.5" />
          {announcement.time}
        </span>
        {announcement.expiresAt && (
          <span className="flex items-center gap-1 text-amber-600">
            <Warning className="w-3.5 h-3.5" />
            Expires: {announcement.expiresAt}
          </span>
        )}
      </div>

      {/* Tags */}
      {announcement.tags.length > 0 && (
        <div className="mb-4">
          {announcement.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs mr-2 mb-2"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Attachments */}
      {announcement.attachments && announcement.attachments.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-2">Attachments:</div>
          {announcement.attachments.map((attachment, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg p-3 mb-2 flex items-center gap-3"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700">{attachment.name}</div>
                <div className="text-xs text-slate-500">{attachment.size} • {attachment.type.toUpperCase()}</div>
              </div>
              <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Download
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={() => void toggleBookmark(String(announcement.id))}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${announcement.isBookmarked ? 'text-blue-900 bg-blue-50' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {announcement.isBookmarked ? (
            <Star className="w-4 h-4" />
          ) : (
            <StarBorder className="w-4 h-4" />
          )}
          Bookmark
        </button>
        <button
          type="button"
          onClick={() => void togglePin(String(announcement.id))}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${announcement.isPinned ? 'text-amber-900 bg-amber-50' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          {announcement.isPinned ? (
            <PushPin className="w-4 h-4 text-amber-600" />
          ) : (
            <PushPinOutlined className="w-4 h-4 text-slate-400" />
          )}
          {announcement.isPinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          onClick={() => void shareAnnouncement(announcement)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Share className="w-4 h-4" />
          Share
        </button>
        <button
          type="button"
          onClick={() => emailAnnouncement(announcement)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Email className="w-4 h-4" />
          Email
        </button>
        {!announcement.isRead && (
          <button
            type="button"
            onClick={() => void markRead(String(announcement.id))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Read
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-900 bg-white border border-blue-900 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Notifications className="w-4 h-4" />
            Notification Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-slate-200 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-900'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            <Announcement className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                activeTab === tab.id ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search announcements..."
            className="w-full pl-10 pr-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-3 focus:ring-blue-200 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <FilterList className="text-slate-500" />
          <select
            className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-200 outline-none cursor-pointer"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            {priorities.map(priority => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
          <select
            className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:border-blue-900 focus:ring-2 focus:ring-blue-200 outline-none cursor-pointer"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-blue-900 mb-1">{announcements.length}</div>
          <div className="text-sm text-slate-500">Total Announcements</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-blue-900 mb-1">{unreadCount}</div>
          <div className="text-sm text-slate-500">Unread</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-blue-900 mb-1">{pinnedCount}</div>
          <div className="text-sm text-slate-500">Pinned</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-blue-900 mb-1">{bookmarkedCount}</div>
          <div className="text-sm text-slate-500">Bookmarked</div>
        </div>
      </div>

      {/* Announcements List */}
      <div>
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading announcements...</div>
        ) : filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map(announcement => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))
        ) : (
          <div className="text-center py-12">
            <Announcement className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {announcements.length === 0
                ? 'No announcements yet. Check back later for platform updates.'
                : 'No announcements found matching your criteria'}
            </p>
          </div>
        )}
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 transform scale-100 transition-all duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Notifications className="w-5 h-5" />
                <h3 className="font-bold text-lg">Notification Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <Close className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-100 transition-colors">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-800 text-sm">Email Alerts</span>
                  <span className="text-xs text-slate-500">Receive important announcements by email</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900"></div>
                </label>
              </div>

              {/* Theme Preference */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Interface Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {['light', 'dark'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      type="button"
                      className={`py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
                        theme === t
                          ? 'border-blue-900 bg-blue-50 text-blue-900 shadow-sm'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)} Mode
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Selector */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700">Preferred Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-900 transition-all"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-5 py-2 bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-xl text-sm font-semibold hover:from-blue-950 hover:to-blue-900 shadow-md disabled:opacity-50 transition-all"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;