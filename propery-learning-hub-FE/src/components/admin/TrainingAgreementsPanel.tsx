'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Loader2, Mail, Search, X } from 'lucide-react';
import trainingAgreementService, {
  type TrainingAgreement,
} from '@/services/trainingAgreementService';

type AgreementStats = {
  total: number;
  client_signed: number;
  completed: number;
  pdf_emailed: number;
};

const TrainingAgreementsPanel: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'client_signed' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'training' | 'free_membership'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<TrainingAgreement[]>([]);
  const [stats, setStats] = useState<AgreementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TrainingAgreement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await trainingAgreementService.adminList({
        status: statusFilter === 'all' ? undefined : statusFilter,
        agreement_type: typeFilter === 'all' ? undefined : typeFilter,
        search: searchQuery || undefined,
        per_page: 50,
        include_stats: true,
      });
      setItems(res.data?.data || []);
      setStats(res.data?.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agreements.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadList();
    }, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadList, searchQuery]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setActionError(null);
    try {
      const agreement = await trainingAgreementService.adminShow(id);
      setSelected(agreement);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agreement.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAutoComplete = async (id: number) => {
    setCompleting(true);
    setActionError(null);
    try {
      const completed = await trainingAgreementService.adminAutoComplete(id);
      setSelected(completed);
      await loadList();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete agreement.');
    } finally {
      setCompleting(false);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      const blob = await trainingAgreementService.adminDownloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Training_Agreement_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to download PDF.');
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabel = (item: TrainingAgreement) => {
    if (item.status === 'completed') {
      return item.pdf_emailed_at ? 'Completed & emailed' : 'Completed';
    }
    if (item.user?.email_verified) {
      return 'Awaiting PDF generation';
    }
    return 'Awaiting email verification';
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Training Agreements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Academy signs automatically when the client verifies their email. Both parties receive the PDF by email.
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total agreements', value: stats.total, icon: <FileText className="w-5 h-5" /> },
            { label: 'Awaiting verification', value: stats.client_signed, icon: <Mail className="w-5 h-5" /> },
            { label: 'Completed', value: stats.completed, icon: <FileText className="w-5 h-5 text-green-600" /> },
            { label: 'PDFs emailed', value: stats.pdf_emailed, icon: <Mail className="w-5 h-5 text-blue-600" /> },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600">
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">All agreements</h3>
              <p className="text-sm text-slate-500">Search, view details, and download PDFs</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as 'all' | 'training' | 'free_membership')
                }
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
              >
                <option value="all">All types</option>
                <option value="training">Training (paid)</option>
                <option value="free_membership">Free membership</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'client_signed' | 'completed')
                }
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-white"
              >
                <option value="all">All status</option>
                <option value="client_signed">In progress</option>
                <option value="completed">Completed</option>
              </select>
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or email…"
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading agreements…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">No agreements found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Client signed</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">PDF emailed</th>
                  <th className="px-4 py-3 font-semibold">Fee</th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.client_full_name}</div>
                      <div className="text-slate-500">{item.client_email}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {item.agreement_type === 'free_membership' ? 'Free membership' : 'Training (paid)'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.client_signed_at)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : item.user?.email_verified
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {statusLabel(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.pdf_emailed_at)}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.agreement_type === 'free_membership' ||
                      item.payment_plan === 'free' ||
                      item.fee_amount_pence === 0
                        ? '£0.00'
                        : item.formatted_fee}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => openDetail(item.id)}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                      >
                        View
                      </button>
                      {item.has_pdf && (
                        <button
                          type="button"
                          onClick={() => handleDownload(item.id)}
                          className="text-sm font-semibold text-green-700 hover:text-green-900"
                        >
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(selected || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Agreement details</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading || !selected ? (
              <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Full name</p>
                    <p className="font-medium text-slate-900">{selected.client_full_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{selected.client_email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{selected.client_phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Date of birth</p>
                    <p className="font-medium text-slate-900">
                      {selected.client_dob
                        ? new Date(`${selected.client_dob}T00:00:00`).toLocaleDateString('en-GB')
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Client signed</p>
                    <p className="font-medium text-slate-900">{formatDate(selected.client_signed_at)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Email verified</p>
                    <p className="font-medium text-slate-900">
                      {selected.user?.email_verified
                        ? formatDate(selected.user.email_verified_at)
                        : 'Not yet'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payment plan</p>
                    <p className="font-medium text-slate-900 capitalize">
                      {selected.agreement_type === 'free_membership' || selected.payment_plan === 'free'
                        ? 'Free'
                        : selected.payment_plan}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Fee</p>
                    <p className="font-medium text-slate-900">
                      {selected.agreement_type === 'free_membership' ||
                      selected.payment_plan === 'free' ||
                      selected.fee_amount_pence === 0
                        ? '£0.00'
                        : selected.formatted_fee}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">PDF emailed</p>
                    <p className="font-medium text-slate-900">{formatDate(selected.pdf_emailed_at)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-slate-500">Address</p>
                    <p className="font-medium text-slate-900 whitespace-pre-wrap">{selected.client_address}</p>
                  </div>
                </div>

                {selected.client_signature_data && (
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Client signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.client_signature_data}
                      alt="Client signature"
                      className="border border-slate-200 rounded-xl bg-white max-h-28"
                    />
                  </div>
                )}

                {selected.status === 'completed' ? (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-green-800">
                      Signed by {selected.admin_signed_name}
                      {selected.admin_signed_position ? ` (${selected.admin_signed_position})` : ''} on{' '}
                      {formatDate(selected.admin_signed_at)}
                    </p>
                    {selected.admin_signature_data && (
                      <div>
                        <p className="text-xs text-green-700 mb-1">Academy signature</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selected.admin_signature_data}
                          alt="Academy signature"
                          className="border border-green-200 rounded-lg bg-white max-h-24 p-2"
                        />
                      </div>
                    )}
                    {selected.has_pdf && (
                      <button
                        type="button"
                        onClick={() => handleDownload(selected.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800"
                      >
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                    <p className="text-sm text-amber-900">
                      {selected.user?.email_verified
                        ? 'Client email is verified. The PDF should generate automatically. If it has not, use the button below.'
                        : 'Waiting for the client to verify their email. Once verified, the academy signature is applied automatically and the PDF is emailed to both parties.'}
                    </p>
                    {selected.user?.email_verified && (
                      <button
                        type="button"
                        onClick={() => handleAutoComplete(selected.id)}
                        disabled={completing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-60"
                      >
                        {completing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        Generate &amp; email PDF now
                      </button>
                    )}
                  </div>
                )}

                {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingAgreementsPanel;
