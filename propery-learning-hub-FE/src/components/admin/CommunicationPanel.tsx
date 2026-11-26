'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Email,
  Notifications,
  Schedule,
  History,
  Add,
  Edit,
  Delete,
  Visibility,
  FilterList,
  Search,
  People,
  CalendarToday,
  CheckCircle,
  Chat,
  QuestionAnswer,
  Flag,
  Report,
  Group,
  Forum,
  Block,
  ThumbUp,
  ThumbDown,
  Warning,
  Newspaper,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import crmService, { Communication } from '../../services/crmService';
import api from '../../services/api';
import { formatDateTime, Modal, StatusBadge } from './crm/crmShared';
import NewsletterComposer from './NewsletterComposer';

const AUDIENCE_FILTER_MAP: Record<string, string> = {
  all: 'all_contacts',
  members: 'active_members',
  admins: 'all_admins',
  inactive: 'former_members',
};

const TAB_COMMUNICATION_TYPES: Record<string, string[]> = {
  announcements: ['email_campaign', 'membership_update'],
  emails: ['email_campaign', 'follow_up_sequence'],
  newsletter: ['newsletter'],
  notifications: ['email_campaign'],
};

const TAB_DEFAULT_TYPE: Record<string, string> = {
  announcements: 'email_campaign',
  emails: 'email_campaign',
  newsletter: 'newsletter',
  notifications: 'email_campaign',
};

const AUDIENCE_FILTER_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(AUDIENCE_FILTER_MAP).map(([key, value]) => [value, key]),
);

const TYPE_LABELS: Record<string, string> = {
  email_campaign: 'Email Campaign',
  newsletter: 'Newsletter',
  webinar_invitation: 'Webinar Invitation',
  event_invitation: 'Event Invitation',
  membership_update: 'Membership Update',
  renewal_reminder: 'Renewal Reminder',
  follow_up_sequence: 'Follow-Up Sequence',
};

const FILTER_LABELS: Record<string, string> = {
  all_contacts: 'All Users',
  active_members: 'Members Only',
  vip_members: 'VIP Members',
  webinar_attendees: 'Webinar Attendees',
  leads: 'Leads',
  former_members: 'Inactive Users',
  custom: 'Custom Selection',
};

function canEditCommunication(status: string): boolean {
  return ['draft', 'scheduled'].includes(status);
}

function minScheduleDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const CommunicationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'emails' | 'newsletter' | 'notifications' | 'moderation'>('announcements');
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [moderationFilter, setModerationFilter] = useState<'all' | 'pending' | 'reported' | 'removed'>('all');
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingCommId, setEditingCommId] = useState<number | null>(null);
  const [viewComm, setViewComm] = useState<Communication | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadCommunications = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await crmService.getCommunications({ per_page: 50 });
      setCommunications(res.data);
    } catch {
      toast.error('Failed to load communication history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommunications();
  }, [loadCommunications]);

  const tabs = [
    { key: 'announcements', label: 'Announcements', icon: <Notifications className="w-5 h-5" /> },
    { key: 'emails', label: 'Email Campaigns', icon: <Email className="w-5 h-5" /> },
    { key: 'newsletter', label: 'Newsletter', icon: <Newspaper className="w-5 h-5" /> },
   // { key: 'notifications', label: 'Push Notifications', icon: <Send className="w-5 h-5" /> },
    //{ key: 'moderation', label: 'Community Moderation', icon: <Flag className="w-5 h-5" /> },
  ];

  const audiences = [
    { key: 'all', label: 'All Users', icon: <People className="w-4 h-4" /> },
    { key: 'members', label: 'Members Only', icon: <People className="w-4 h-4" /> },
    { key: 'admins', label: 'Admins Only', icon: <People className="w-4 h-4" /> },
    { key: 'inactive', label: 'Inactive Users', icon: <People className="w-4 h-4" /> },
  ];

  const moderationFilters = [
    { key: 'all', label: 'All Content', count: 24 },
    { key: 'pending', label: 'Pending Review', count: 8 },
    { key: 'reported', label: 'Reported', count: 12 },
    { key: 'removed', label: 'Removed', count: 4 },
  ];

  const chatGroups = [
    { id: '1', name: 'Investors Lounge', members: 245, messages: 1245, lastActive: '2 hours ago' },
    { id: '2', name: 'Startup Founders', members: 189, messages: 892, lastActive: '5 hours ago' },
    { id: '3', name: 'Mentorship Program', members: 156, messages: 567, lastActive: '1 day ago' },
    { id: '4', name: 'Deal Discussions', members: 312, messages: 2103, lastActive: '30 minutes ago' },
  ];

  const qaThreads = [
    { id: '1', question: 'How to structure an angel investment?', mentor: 'John DealMaker', votes: 45, answers: 12, status: 'active' },
    { id: '2', question: 'Best practices for due diligence?', mentor: 'Sarah Investor', votes: 89, answers: 21, status: 'active' },
    { id: '3', question: 'Exit strategy for early-stage startups?', mentor: 'Mike Venture', votes: 34, answers: 8, status: 'archived' },
    { id: '4', question: 'Valuation methods for SaaS companies?', mentor: 'Lisa Capital', votes: 67, answers: 15, status: 'active' },
  ];

  const reportedContent = [
    {
      id: '1',
      type: 'post',
      title: 'Investment Opportunity - Too Good to be True?',
      author: 'user_xyz123',
      reason: 'Potential scam / misleading information',
      reports: 8,
      status: 'pending',
      posted: '2024-12-07',
      content: 'Guaranteed 50% returns in 3 months with zero risk...',
    },
    {
      id: '2',
      type: 'comment',
      title: 'Discussion on competitor analysis',
      author: 'user_abc789',
      reason: 'Harassment / inappropriate language',
      reports: 5,
      status: 'pending',
      posted: '2024-12-06',
      content: 'This is complete nonsense and anyone who believes this is an idiot...',
    },
    {
      id: '3',
      type: 'post',
      title: 'Mentorship program feedback',
      author: 'user_def456',
      reason: 'Spam / self-promotion',
      reports: 3,
      status: 'reviewed',
      posted: '2024-12-05',
      content: 'Check out my new course at this link: www.mycourse.com...',
    },
    {
      id: '4',
      type: 'comment',
      title: 'Market discussion thread',
      author: 'user_ghi012',
      reason: 'Misinformation',
      reports: 12,
      status: 'removed',
      posted: '2024-12-04',
      content: 'The stock market will crash 90% next week according to my sources...',
    },
  ];

  const history = communications
    .filter((item) => TAB_COMMUNICATION_TYPES[activeTab]?.includes(item.type))
    .filter((item) => {
      if (!historySearch.trim()) return true;
      const q = historySearch.toLowerCase();
      return item.subject.toLowerCase().includes(q) || item.body.toLowerCase().includes(q);
    })
    .map((item) => ({
      id: String(item.id),
      title: item.subject,
      type: item.type === 'newsletter' ? 'email' : 'announcement',
      audience: Object.entries(AUDIENCE_FILTER_MAP).find(([, v]) => v === item.audience_filter)?.[0] ?? item.audience_filter,
      content: item.body,
      priority: item.priority ?? 'medium',
      category: item.category ?? 'general',
      sentDate: item.sent_at
        ? formatDateTime(item.sent_at)
        : item.scheduled_at
          ? `Scheduled ${formatDateTime(item.scheduled_at)}`
          : formatDateTime(item.created_at),
      status: item.status === 'scheduled' ? 'scheduled' : item.status === 'sent' ? 'sent' : item.status,
      readCount: item.read_count ?? 0,
      totalRecipients: item.recipient_count ?? 0,
    }));

  const getAudienceColors = (audience: string) => {
    switch (audience) {
      case 'all':
        return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'members':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'admins':
        return { bg: 'bg-amber-100', text: 'text-amber-800' };
      case 'inactive':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Notifications className="w-4 h-4" />;
      case 'email':
        return <Email className="w-4 h-4" />;
      case 'notification':
        return <Send className="w-4 h-4" />;
      default:
        return <Notifications className="w-4 h-4" />;
    }
  };

  const getStatusColors = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
      case 'reviewed':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      case 'removed':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'announcements':
        return 'Announcement';
      case 'emails':
        return 'Email Campaign';
      case 'newsletter':
        return 'Newsletter';
      case 'notifications':
        return 'Notification';
      default:
        return 'Message';
    }
  };

  const handleApprovePost = (postId: string) => {
    console.log('Approving post:', postId);
    // API call to approve post
  };

  const handleRemovePost = (postId: string) => {
    console.log('Removing post:', postId);
    // API call to remove post
  };

  const handleDeleteChatGroup = (groupId: string) => {
    console.log('Deleting chat group:', groupId);
    // API call to delete chat group
  };

  const handleArchiveThread = (threadId: string) => {
    console.log('Archiving thread:', threadId);
    // API call to archive thread
  };

  const resetComposeForm = () => {
    setTitle('');
    setContent('');
    setPriority('medium');
    setCategory('general');
    setShowSchedule(false);
    setScheduledAt('');
    setEditingCommId(null);
  };

  const viewDetail = async (id: number) => {
    setViewLoading(true);
    try {
      const comm = await crmService.getCommunication(id);
      setViewComm(comm);
    } catch {
      toast.error('Failed to load communication details');
    } finally {
      setViewLoading(false);
    }
  };

  const duplicateAsDraft = async (id: number) => {
    try {
      const comm = await crmService.getCommunication(id);
      setEditingCommId(null);
      setTitle(comm.subject);
      setContent(comm.body);
      setPriority(comm.priority ?? 'medium');
      setCategory(comm.category ?? 'general');
      setSelectedAudience(AUDIENCE_FILTER_REVERSE[comm.audience_filter] ?? 'all');
      setShowSchedule(false);
      setScheduledAt('');
      document.getElementById('communication-compose')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast.success('Loaded as a new draft — review and send when ready.');
    } catch {
      toast.error('Failed to duplicate communication');
    }
  };

  const openEdit = async (id: number) => {
    try {
      const comm = await crmService.getCommunication(id);

      if (comm.status === 'sent') {
        setViewComm(comm);
        return;
      }

      if (!canEditCommunication(comm.status)) {
        toast.error('This communication cannot be edited');
        return;
      }

      setEditingCommId(comm.id);
      setTitle(comm.subject);
      setContent(comm.body);
      setPriority(comm.priority ?? 'medium');
      setCategory(comm.category ?? 'general');
      setSelectedAudience(AUDIENCE_FILTER_REVERSE[comm.audience_filter] ?? 'all');

      if (comm.scheduled_at) {
        setShowSchedule(true);
        const dateObj = new Date(comm.scheduled_at);
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
        setScheduledAt(localISOTime);
      } else {
        setShowSchedule(false);
        setScheduledAt('');
      }

      document.getElementById('communication-compose')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      toast.error('Failed to load communication for editing');
    }
  };

  const submitCommunication = async (sendNow: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required.');
      return;
    }

    if (!sendNow) {
      if (!scheduledAt) {
        toast.error('Select a schedule date and time.');
        return;
      }
      if (new Date(scheduledAt) <= new Date()) {
        toast.error('Schedule date must be in the future.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        type: TAB_DEFAULT_TYPE[activeTab] ?? 'email_campaign',
        subject: title.trim(),
        body: content.trim(),
        priority,
        category,
        audience_filter: AUDIENCE_FILTER_MAP[selectedAudience] ?? 'all_contacts',
        send_now: editingCommId ? false : sendNow,
        scheduled_at: sendNow && !editingCommId ? null : (scheduledAt ? new Date(scheduledAt).toISOString() : null),
      };

      if (editingCommId) {
        await crmService.updateCommunication(editingCommId, payload);
        toast.success(sendNow ? 'Announcement updated' : scheduledAt ? 'Schedule updated' : 'Draft updated');
      } else {
        const res = await api.post('/admin/crm/communications', payload) as { message?: string };
        toast.success(res?.message ?? (sendNow ? 'Announcement sent' : 'Announcement scheduled'));
      }

      resetComposeForm();
      loadCommunications();
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      const firstFieldError = apiErr.errors ? Object.values(apiErr.errors).flat()[0] : null;
      toast.error(firstFieldError || apiErr.message || 'Failed to save communication');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = () => submitCommunication(true);

  const handleSchedule = () => {
    if (!showSchedule) {
      setShowSchedule(true);
      return;
    }
    submitCommunication(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6">Communications & Moderation</h2>
        
        {/* Tabs */}
        <div className="bg-slate-100 rounded-lg p-1 flex flex-wrap sm:flex-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-md transition-all min-w-[120px] sm:min-w-0 ${
                activeTab === tab.key
                  ? 'bg-white text-blue-500 shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {activeTab !== 'moderation' ? (
          <>
            {/* Compose Section */}
            <div id="communication-compose" className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex justify-between items-center mb-4 sm:mb-5">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  {editingCommId ? `Edit ${getTabTitle()}` : `Compose New ${getTabTitle()}`}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewsletterOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-blue-800 hover:to-indigo-800 transition-all"
                  >
                    <span>📰 Launch Visual Newsletter Builder</span>
                  </button>

                  {editingCommId && (
                    <button
                      type="button"
                      onClick={resetComposeForm}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </div>

              {/* Title Input */}
              <div className="mb-4 sm:mb-5">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5 sm:mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Enter ${getTabTitle().toLowerCase()} title...`}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none"
                />
              </div>

              {/* Content Textarea */}
              <div className="mb-4 sm:mb-5">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5 sm:mb-2">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Write your ${getTabTitle().toLowerCase()} content here...`}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none resize-y font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 sm:mb-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5 sm:mb-2">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5 sm:mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 outline-none"
                  >
                    <option value="general">General</option>
                    <option value="system">System Updates</option>
                    <option value="educational">Educational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="opportunity">Opportunities</option>
                  </select>
                </div>
              </div>

              {/* Audience Selector */}
              <div className="mb-5 sm:mb-6">
                <label className="block text-sm font-semibold text-slate-600 mb-1.5 sm:mb-2">
                  Audience
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {audiences.map((audience) => {
                    const isActive = selectedAudience === audience.key;
                    return (
                      <button
                        key={audience.key}
                        onClick={() => setSelectedAudience(audience.key)}
                        className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-full border transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {audience.icon}
                        <span className="truncate">{audience.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {showSchedule && (
                <div className="mb-5 sm:mb-6">
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5 sm:mb-2">
                    Schedule for
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    min={minScheduleDateTime()}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={saving || Boolean(editingCommId)}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50"
                >
                  <Schedule className="w-4 h-4" />
                  <span>{showSchedule && scheduledAt ? 'Confirm Schedule' : 'Schedule'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={saving}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {saving
                      ? 'Saving...'
                      : editingCommId
                        ? (scheduledAt ? 'Update Schedule' : 'Update Draft')
                        : 'Send Now'}
                  </span>
                </button>
              </div>
            </div>

            {/* History Section */}
            <div className="bg-white rounded-xl border border-slate-200">
              {/* History Header */}
              <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">History</h3>
                
                {/* Search */}
                <div className="relative w-full sm:w-48 md:w-60 lg:w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search communications..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none"
                  />
                </div>
              </div>

              {/* History Content */}
              <div className="p-4 sm:p-6">
                {historyLoading ? (
                  <p className="text-center py-8 text-slate-400">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="text-center py-8 text-slate-400">No communications yet</p>
                ) : (
                <div className="space-y-3 sm:space-y-4">
                  {history.map((item) => {
                    const audienceColors = getAudienceColors(item.audience);
                    const openRate = item.totalRecipients > 0
                      ? Math.round((item.readCount / item.totalRecipients) * 100)
                      : 0;
                    
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 transition-all hover:shadow-lg hover:-translate-y-0.5"
                      >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start mb-3 gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              <h4 className="text-sm sm:text-base font-semibold text-slate-800 truncate">{item.title}</h4>
                              <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                                item.status === 'sent'
                                  ? 'bg-green-100 text-green-800'
                                  : item.status === 'scheduled'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                              {item.priority && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 capitalize">
                                  {item.priority}
                                </span>
                              )}
                              {item.category && (
                                <span className="text-xs px-2 py-1 rounded-full bg-violet-50 text-violet-700 capitalize">
                                  {item.category}
                                </span>
                              )}
                            </div>
                            
                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500 mb-3">
                              <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                                {getTypeIcon(item.type)}
                                <span className="truncate">{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                              </span>
                              <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                                <CalendarToday className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="truncate">{item.sentDate}</span>
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${audienceColors.bg} ${audienceColors.text}`}>
                                {item.audience.charAt(0).toUpperCase() + item.audience.slice(1)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-1 sm:gap-2 self-end sm:self-start">
                            <button
                              type="button"
                              onClick={() => void viewDetail(Number(item.id))}
                              disabled={viewLoading}
                              className="p-1 sm:p-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 hover:bg-blue-100 transition-colors disabled:opacity-50"
                              title="View announcement"
                            >
                              <Visibility className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                            {item.status === 'sent' ? (
                              <button
                                type="button"
                                onClick={() => void duplicateAsDraft(Number(item.id))}
                                className="p-1 sm:p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Duplicate as new draft"
                              >
                                <Add className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void openEdit(Number(item.id))}
                                className="p-1 sm:p-1.5 bg-green-50 border border-green-200 rounded text-green-600 hover:bg-green-100 transition-colors"
                                title="Edit announcement"
                              >
                                <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <p className="text-xs sm:text-sm text-slate-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                          {item.content}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm text-slate-500">
                          <span className="whitespace-nowrap">Read by: {item.readCount.toLocaleString()} / {item.totalRecipients.toLocaleString()}</span>
                          <span className="whitespace-nowrap">Open Rate: {openRate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Moderation Filters */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Content Moderation Dashboard</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {moderationFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setModerationFilter(filter.key as any)}
                    className={`p-3 sm:p-4 rounded-lg border transition-all text-left ${
                      moderationFilter === filter.key
                        ? 'bg-white border-blue-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 mb-0.5 sm:mb-1">{filter.count}</div>
                    <div className="text-xs sm:text-sm text-slate-600 truncate">{filter.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reported Content Section */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1 sm:mb-2">Reported Content</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Review and moderate reported posts, comments, and messages</p>
                </div>
                <div className="relative w-full sm:w-48 md:w-60 lg:w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search reported content..."
                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-200 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {reportedContent
                    .filter(item => moderationFilter === 'all' || item.status === moderationFilter)
                    .map((item) => {
                      const statusColors = getStatusColors(item.status);
                      return (
                        <div
                          key={item.id}
                          className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 hover:shadow-md transition-all"
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start mb-3 sm:mb-4 gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                                <span className="text-sm sm:text-base font-semibold text-slate-800 truncate">{item.title}</span>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize whitespace-nowrap ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}>
                                  {item.status}
                                </span>
                                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                                  <Flag className="w-3 h-3 inline mr-1" />
                                  {item.reports} reports
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm text-slate-500 mb-2 sm:mb-3">
                                <span className="capitalize whitespace-nowrap">{item.type}</span>
                                <span className="whitespace-nowrap">By: {item.author}</span>
                                <span className="whitespace-nowrap">Posted: {item.posted}</span>
                                <span className="text-amber-600 font-medium truncate">Reason: {item.reason}</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
                              {item.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApprovePost(item.id)}
                                    className="flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex-1 sm:flex-none"
                                  >
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRemovePost(item.id)}
                                    className="flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex-1 sm:flex-none"
                                  >
                                    <Delete className="w-3 h-3 sm:w-4 sm:h-4" />
                                    <span>Remove</span>
                                  </button>
                                </>
                              )}
                              <button className="p-1.5 sm:p-2 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-slate-100 transition-colors">
                                <Visibility className="w-3 h-3 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200">
                            <p className="text-xs sm:text-sm text-slate-600 italic">"{item.content}"</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Chat Groups Management */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">Chat Groups Management</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Manage community chat groups and conversations</p>
                  </div>
                  <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors w-full sm:w-auto">
                    <Add className="w-4 h-4" />
                    <span>New Group</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {chatGroups.map((group) => (
                    <div key={group.id} className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start mb-2 sm:mb-3">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Group className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{group.name}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteChatGroup(group.id)}
                          className="p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Delete className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-600">
                        <div className="flex justify-between">
                          <span>Members</span>
                          <span className="font-medium">{group.members}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Messages</span>
                          <span className="font-medium">{group.messages.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Active</span>
                          <span className="font-medium">{group.lastActive}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 flex gap-1.5 sm:gap-2">
                        <button className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
                          <Visibility className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          <span>View</span>
                        </button>
                        <button className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mentor Q&A Threads Management */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">Mentor Q&A Threads</h3>
                    <p className="text-xs sm:text-sm text-slate-500">Manage questions, answers, and discussions with mentors</p>
                  </div>
                  <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors w-full sm:w-auto">
                    <Add className="w-4 h-4" />
                    <span>New Thread</span>
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {qaThreads.map((thread) => (
                    <div key={thread.id} className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 hover:shadow-sm transition-all">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start mb-2 sm:mb-3 gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                            <QuestionAnswer className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                            <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{thread.question}</h4>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                              thread.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {thread.status}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600">Mentor: <span className="font-medium">{thread.mentor}</span></p>
                        </div>
                        
                        <div className="flex gap-1 sm:gap-2 self-end sm:self-start">
                          <button
                            onClick={() => handleArchiveThread(thread.id)}
                            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                            title={thread.status === 'active' ? 'Archive Thread' : 'Unarchive Thread'}
                          >
                            {thread.status === 'active' ? <History className="w-3 h-3 sm:w-4 sm:h-4" /> : <History className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />}
                          </button>
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Delete className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm text-slate-600">
                        <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                          <ThumbUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                          {thread.votes} votes
                        </span>
                        <span className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap">
                          <Chat className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                          {thread.answers} answers
                        </span>
                      </div>
                      
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-200 flex gap-1.5 sm:gap-2">
                        <button className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 bg-slate-50 rounded hover:bg-slate-100 transition-colors">
                          <Visibility className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          <span>View Discussion</span>
                        </button>
                        <button className="flex-1 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors">
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          <span>Manage Answers</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-amber-800 mb-0.5 sm:mb-1">Bulk Moderation Actions</h3>
                  <p className="text-xs sm:text-sm text-amber-600">Apply actions to multiple items at once</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <button className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-amber-600 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors">
                    <Warning className="w-4 h-4" />
                    <span className="whitespace-nowrap">Mark as Spam</span>
                  </button>
                  <button className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-red-600 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 transition-colors">
                    <Delete className="w-4 h-4" />
                    <span className="whitespace-nowrap">Delete Selected</span>
                  </button>
                  <button className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-green-600 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                    <span className="whitespace-nowrap">Approve Selected</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {viewComm && (
        <Modal title={viewComm.subject} onClose={() => setViewComm(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <StatusBadge value={viewComm.status} />
              <span className="text-slate-500">{TYPE_LABELS[viewComm.type] ?? viewComm.type}</span>
              <span className="text-slate-500 capitalize">Priority: {viewComm.priority ?? 'medium'}</span>
              <span className="text-slate-500 capitalize">Category: {viewComm.category ?? 'general'}</span>
              <span className="text-slate-500">→ {FILTER_LABELS[viewComm.audience_filter] ?? viewComm.audience_filter}</span>
              <span className="text-slate-500">{viewComm.recipient_count} recipients</span>
              {viewComm.sent_at && <span className="text-slate-500">Sent {formatDateTime(viewComm.sent_at)}</span>}
              {viewComm.scheduled_at && viewComm.status === 'scheduled' && (
                <span className="text-slate-500">Scheduled {formatDateTime(viewComm.scheduled_at)}</span>
              )}
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap border text-slate-700">
              {viewComm.body}
            </div>
            {viewComm.recipients && viewComm.recipients.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-slate-800">Recipients</h4>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-sm">
                  {viewComm.recipients.map((recipient) => (
                    <div key={recipient.id} className="px-3 py-2 flex justify-between gap-3">
                      <span>
                        {recipient.contact
                          ? `${recipient.contact.first_name} ${recipient.contact.last_name}`
                          : `Contact #${recipient.contact_id}`}
                      </span>
                      <StatusBadge value={recipient.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewComm.status === 'sent' && (
              <p className="text-xs text-slate-500">
                Sent announcements cannot be edited. Create a new announcement to send an update.
              </p>
            )}
          </div>
        </Modal>
      )}

      <NewsletterComposer
        open={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
        onSent={() => loadCommunications()}
      />
    </div>
  );
};

export default CommunicationPanel;