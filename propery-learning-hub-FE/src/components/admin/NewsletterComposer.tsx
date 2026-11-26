'use client';

import React, { useState } from 'react';
import {
  Send,
  CalendarToday as CalendarClock,
  Save,
  Code as CodeIcon,
  Visibility as EyeIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  People,
  CheckCircle,
  Warning as AlertCircle,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../../services/api';

type Props = {
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
};

const DEFAULT_NEWSLETTER_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; }
    .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; margin: 20px 0; }
    .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Freedom Property Academy Newsletter</h1>
    </div>
    <div class="content">
      <h2>Hello {{first_name}},</h2>
      <p>Thanks for being a valued member of our property education community. Here is our latest newsletter update for you!</p>
      <p>We are excited to share key insights, deal opportunities, and upcoming mentorship webinars with you this month.</p>
      <div style="text-align: center;">
        <a href="http://localhost:3000/learn/dashboard" class="cta-btn">Explore Dashboard</a>
      </div>
      <p>Best regards,<br><strong>Freedom Property Education Team</strong></p>
    </div>
    <div class="footer">
      <p>© Freedom Property Education. All rights reserved.</p>
      <p>You received this newsletter because you are registered on our platform.</p>
    </div>
  </div>
</body>
</html>`;

export default function NewsletterComposer({ open, onClose, onSent }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [audience, setAudience] = useState('all_contacts');
  const [contentType, setContentType] = useState<'html' | 'text'>('html');
  const [editorMode, setEditorMode] = useState<'design' | 'html' | 'preview'>('design');
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_NEWSLETTER_HTML);
  const [bodyText, setBodyText] = useState(
    'Hello {{first_name}},\n\nThanks for connecting with us. Here is our latest newsletter.\n\nBest regards,\nFreedom Property Education Team',
  );
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const insertToken = (token: string) => {
    if (contentType === 'html') {
      setBodyHtml((prev) => prev + ` ${token} `);
    } else {
      setBodyText((prev) => prev + ` ${token} `);
    }
  };

  const handleAction = async (action: 'send' | 'schedule' | 'draft') => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (action === 'schedule' && !scheduledAt) {
      toast.error('Please select a schedule date and time');
      return;
    }
    const content = contentType === 'html' ? bodyHtml : bodyText;
    if (!content.trim()) {
      toast.error('Newsletter body content is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: 'newsletter',
        subject: subject.trim(),
        body: content.trim(),
        priority: 'medium',
        category: 'newsletter',
        audience_filter: audience,
        send_now: action === 'send',
        scheduled_at: action === 'schedule' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      const res = (await api.post('/admin/crm/communications', payload)) as { message?: string };
      toast.success(
        res?.message ||
        (action === 'send'
          ? 'Newsletter sent successfully'
          : action === 'schedule'
            ? 'Newsletter scheduled successfully'
            : 'Newsletter draft saved'),
      );
      onSent?.();
      onClose();
    } catch (err) {
      console.error('Failed to process newsletter campaign:', err);
      toast.error('Failed to send newsletter');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-2 md:p-4 backdrop-blur-sm">
      <div className="flex max-h-[96vh] w-full max-w-[1350px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold">
              📰
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Newsletter Builder & Campaign Manager</h2>
              <p className="text-xs text-slate-300">
                Design and send HTML newsletters to your subscribers with live preview and merge tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            onClick={onClose}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[1fr_260px]">
          {/* Main Editor Section */}
          <div className="space-y-4 overflow-y-auto p-5 md:p-6 bg-slate-50">
            {/* Top Form Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Campaign Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. July Property Education Newsletter"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Email Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Quick update for you, {{first_name}}"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>

            {/* Description & Audience Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Description / Internal Note
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly market insights blast"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Target Audience
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 font-medium"
                >
                  <option value="all_contacts">All Platform Users</option>
                  <option value="active_members">Active Members Only</option>
                  <option value="all_admins">Admins Only</option>
                  <option value="former_members">Inactive Users</option>
                </select>
              </div>
            </div>

            {/* Mode & Tokens Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setContentType('html')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${contentType === 'html'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Visual HTML Newsletter
                </button>
                <button
                  type="button"
                  onClick={() => setContentType('text')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${contentType === 'text'
                    ? 'bg-white text-blue-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Plain Text
                </button>
              </div>

              {/* Sub-Editor Mode for HTML */}
              {contentType === 'html' && (
                <div className="flex items-center gap-1 rounded-xl bg-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => setEditorMode('design')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${editorMode === 'design' ? 'bg-blue-900 text-white' : 'text-slate-600'
                      }`}
                  >
                    <EditIcon className="w-3.5 h-3.5" /> Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('html')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${editorMode === 'html' ? 'bg-blue-900 text-white' : 'text-slate-600'
                      }`}
                  >
                    <CodeIcon className="w-3.5 h-3.5" /> HTML Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${editorMode === 'preview' ? 'bg-blue-900 text-white' : 'text-slate-600'
                      }`}
                  >
                    <EyeIcon className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
              )}
            </div>

            {/* Merge Tokens Bar */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-xs">
              <span className="font-semibold text-slate-500 mr-1">Insert Token:</span>
              {['{{first_name}}', '{{last_name}}', '{{email}}', '{{company_name}}'].map((tk) => (
                <button
                  key={tk}
                  type="button"
                  onClick={() => insertToken(tk)}
                  className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700 hover:bg-blue-100 hover:text-blue-900 transition-colors"
                >
                  {tk}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBodyHtml(DEFAULT_NEWSLETTER_HTML)}
                className="ml-auto flex items-center gap-1 rounded-md text-xs font-semibold text-blue-700 hover:underline"
              >
                <RefreshIcon className="w-3.5 h-3.5" /> Reset Template
              </button>
            </div>

            {/* Editor Container */}
            <div className="rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm min-h-[380px]">
              {contentType === 'html' ? (
                editorMode === 'preview' ? (
                  <div className="p-4 bg-slate-100 min-h-[380px] overflow-y-auto">
                    <iframe
                      srcDoc={bodyHtml}
                      title="Newsletter Preview"
                      className="w-full min-h-[360px] rounded-xl border border-slate-200 bg-white shadow-sm"
                    />
                  </div>
                ) : editorMode === 'html' ? (
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="w-full min-h-[380px] font-mono text-xs p-4 bg-slate-900 text-emerald-400 outline-none resize-y"
                  />
                ) : (
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    className="w-full min-h-[380px] p-4 text-sm font-mono text-slate-800 outline-none resize-y"
                    placeholder="Enter or edit HTML source code..."
                  />
                )
              ) : (
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full min-h-[380px] p-4 text-sm font-sans text-slate-800 outline-none resize-y"
                  placeholder="Plain text body... Use {{first_name}}, {{last_name}}, {{email}}"
                />
              )}
            </div>

            {/* Schedule Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Schedule Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-slate-300 bg-white py-2.5 px-3.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          {/* Right Actions Panel */}
          <div className="border-t border-slate-200 bg-white p-5 flex flex-col justify-between lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Actions</p>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleAction('send')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-800 active:scale-98 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Send Now</span>
              </button>

              <button
                type="button"
                disabled={saving || !scheduledAt}
                onClick={() => handleAction('schedule')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                <CalendarClock className="w-4 h-4 text-slate-500" />
                <span>Schedule</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => handleAction('draft')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-slate-500" />
                <span>Save Draft</span>
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 mt-6 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">💡 Tip & Merge Tokens:</p>
              <p className="leading-relaxed">
                Use <code className="bg-slate-200 px-1 rounded text-[11px] font-mono">{"{{first_name}}"}</code> to personalize the newsletter automatically for each recipient.
              </p>
              <p className="leading-relaxed">
                Switch to <strong>Preview</strong> mode to see how your HTML layout renders before sending.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
