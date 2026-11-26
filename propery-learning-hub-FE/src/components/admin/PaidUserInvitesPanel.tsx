'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  FileSignature,
  Link2,
  Loader2,
  Mail,
  MousePointerClick,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import paidInviteService, {
  type PaidInviteStatus,
  type PaidUserInvite,
} from '@/services/paidInviteService';

const statusConfig: Record<
  PaidInviteStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  generated: {
    label: 'Generated',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Link2 className="w-3.5 h-3.5" />,
  },
  open: {
    label: 'Opened',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <MousePointerClick className="w-3.5 h-3.5" />,
  },
  signed: {
    label: 'Signed',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: <FileSignature className="w-3.5 h-3.5" />,
  },
  joined: {
    label: 'Joined',
    className: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  expired: {
    label: 'Expired',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PaidUserInvitesPanel: React.FC = () => {
  const [items, setItems] = useState<PaidUserInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaidInviteStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paidInviteService.adminList({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        per_page: 50,
      });
      setItems(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paid invite links.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadList();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadList, searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Enter an email address.');
      return;
    }

    setCreating(true);
    try {
      const invite = await paidInviteService.adminCreate(email.trim());
      if (invite.email_sent) {
        toast.success(invite.message || 'Paid invite link created and emailed.');
      } else {
        toast.error(invite.message || 'Invite created, but email was not sent. Copy the link instead.');
      }
      setEmail('');
      await loadList();
      if (invite.invite_url) {
        try {
          await navigator.clipboard.writeText(invite.invite_url);
          toast.success('Link copied to clipboard.');
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const resendEmail = async (id: number) => {
    try {
      const invite = await paidInviteService.adminResend(id);
      if (invite.email_sent) {
        toast.success(invite.message || 'Invite email resent.');
      } else {
        toast.error(invite.message || 'Email could not be resent.');
      }
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend email.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">User registration invite links</h3>
            <p className="text-sm text-slate-500 mt-1">
              Generate a unique link for a learner to complete paid registration: details, agreement,
              payment, password, email verification, and profile. Links expire in 3 days and are locked
              to the email you enter.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="learner@example.com"
            className="flex-1 px-4 py-3 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-3 focus:ring-indigo-200 outline-none"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Generate &amp; send link
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'generated', 'open', 'signed', 'joined', 'expired'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {status === 'all' ? 'All' : statusConfig[status].label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email…"
              className="w-full lg:w-64 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={() => void loadList()}
              className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {error && (
          <div className="px-5 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No paid invite links yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Email sent</th>
                  <th className="text-left px-5 py-3 font-semibold">Created</th>
                  <th className="text-left px-5 py-3 font-semibold">Expires</th>
                  <th className="text-left px-5 py-3 font-semibold">Opened</th>
                  <th className="text-left px-5 py-3 font-semibold">Signed</th>
                  <th className="text-left px-5 py-3 font-semibold">Joined</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = statusConfig[item.status] || statusConfig.generated;
                  const canResend =
                    item.status === 'generated' ||
                    item.status === 'open' ||
                    item.status === 'signed';

                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-medium text-slate-900">{item.email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.className}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {item.email_sent_at ? (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <Mail className="w-3.5 h-3.5" />
                            {formatDate(item.email_sent_at)}
                          </span>
                        ) : (
                          <span className="text-amber-700 text-xs font-semibold">Not sent</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(item.created_at)}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(item.expires_at)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(item.opened_at)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(item.signed_at)}</td>
                      <td className="px-5 py-4 text-slate-600">{formatDate(item.joined_at)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void copyLink(item.invite_url)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                            title="Copy link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copy
                          </button>
                          {canResend && (
                            <button
                              type="button"
                              onClick={() => void resendEmail(item.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              title="Resend email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Resend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaidUserInvitesPanel;
