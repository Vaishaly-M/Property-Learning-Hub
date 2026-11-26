'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Edit, Check, Close } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { ContactCourse, CoursePurchaseStats } from '../../../services/crmService';
import { Loading, StatusBadge, formatDate, EmptyState } from './crmShared';

const formatRevenue = (amount: number) =>
  `£${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CrmCourses: React.FC = () => {
  const [purchases, setPurchases] = useState<ContactCourse[]>([]);
  const [stats, setStats] = useState<CoursePurchaseStats>({
    total: 0,
    completed: 0,
    in_progress: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amountDraft, setAmountDraft] = useState('');
  const [savingAmount, setSavingAmount] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { purchases: data, stats: nextStats } = await crmService.getAllCoursePurchases();
      setPurchases(data);
      setStats(nextStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filter === 'all' ? purchases : purchases.filter((p) => p.completion_status === filter);

  const filteredStats = {
    total: filtered.length,
    completed: filtered.filter((p) => p.completion_status === 'completed').length,
    in_progress: filtered.filter((p) => p.completion_status === 'in_progress').length,
    revenue: filtered.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0),
  };

  const startEditAmount = (purchase: ContactCourse) => {
    setEditingId(purchase.id);
    setAmountDraft(purchase.amount_paid != null ? String(purchase.amount_paid) : '');
  };

  const cancelEditAmount = () => {
    setEditingId(null);
    setAmountDraft('');
  };

  const saveAmount = async (purchase: ContactCourse) => {
    const contactId = purchase.contact_id ?? purchase.contact?.id;
    if (!contactId) {
      toast.error('Contact is missing for this purchase');
      return;
    }

    const parsed = amountDraft.trim() === '' ? null : Number(amountDraft);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.error('Enter a valid amount');
      return;
    }

    setSavingAmount(true);
    try {
      await crmService.updateCourse(contactId, purchase.id, { amount_paid: parsed });
      toast.success('Amount updated');
      cancelEditAmount();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update amount');
    } finally {
      setSavingAmount(false);
    }
  };

  return (
    <CrmLayout pageTitle="Course Management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Purchases', value: filteredStats.total },
          { label: 'Completed', value: filteredStats.completed },
          { label: 'In Progress', value: filteredStats.in_progress },
          { label: 'Revenue', value: formatRevenue(filteredStats.revenue) },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-lg p-4">
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'not_started', 'in_progress', 'completed'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <Loading /> : filtered.length === 0 ? (
          <EmptyState message="No course purchases yet" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Course</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Purchase Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Certificate</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {p.contact ? (
                      <a href={`/admin/crm/contacts/${p.contact.id}`} className="font-medium text-blue-600 hover:underline">
                        {p.contact.full_name}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.course_title}</td>
                  <td className="px-4 py-3">{formatDate(p.purchase_date)}</td>
                  <td className="px-4 py-3"><StatusBadge value={p.completion_status} /></td>
                  <td className="px-4 py-3">{p.certificate_issued ? <span className="text-green-600">Issued</span> : '—'}</td>
                  <td className="px-4 py-3">
                    {editingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">£</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountDraft}
                          onChange={(e) => setAmountDraft(e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                          disabled={savingAmount}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => saveAmount(p)}
                          disabled={savingAmount}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Save amount"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditAmount}
                          disabled={savingAmount}
                          className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                          title="Cancel"
                        >
                          <Close className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{formatRevenue(Number(p.amount_paid) || 0)}</span>
                        <button
                          type="button"
                          onClick={() => startEditAmount(p)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit amount"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </CrmLayout>
  );
};

export default CrmCourses;
