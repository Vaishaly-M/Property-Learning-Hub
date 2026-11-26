'use client';

import React, { useEffect, useState } from 'react';
import { Add } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { CrmOptions, Membership } from '../../../services/crmService';
import {
  Loading, StatusBadge, formatMembershipType, formatDate, EmptyState,
  Modal, Field, inputClass, btnPrimary, btnSecondary, ContactPicker,
} from './crmShared';

const CrmMemberships: React.FC = () => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [options, setOptions] = useState<CrmOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [createAsCancelled, setCreateAsCancelled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contact_id: '',
    type: 'community',
    start_date: '',
    renewal_date: '',
    expiry_date: '',
    payment_status: 'paid',
    amount: '',
    notes: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      setMemberships(await crmService.getAllMemberships());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    crmService.getOptions().then(setOptions);
    load();
  }, []);

  const filtered = filter === 'all' ? memberships : memberships.filter((m) => m.status === filter);

  const stats = {
    active: memberships.filter((m) => m.status === 'active').length,
    pending: memberships.filter((m) => m.status === 'pending').length,
    expired: memberships.filter((m) => m.status === 'expired').length,
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id) {
      toast.error('Select a contact');
      return;
    }

    setSaving(true);
    try {
      const created = await crmService.addMembership(Number(form.contact_id), {
        type: form.type,
        start_date: form.start_date || null,
        renewal_date: form.renewal_date || null,
        expiry_date: form.expiry_date || null,
        payment_status: form.payment_status,
        amount: form.amount ? Number(form.amount) : null,
        notes: form.notes || null,
        ...(createAsCancelled ? { status: 'cancelled' as const } : {}),
      });
      toast.success(createAsCancelled ? 'Membership added as cancelled' : 'Membership added');
      setShowForm(false);
      setCreateAsCancelled(false);
      setForm({
        contact_id: '',
        type: 'community',
        start_date: '',
        renewal_date: '',
        expiry_date: '',
        payment_status: 'paid',
        amount: '',
        notes: '',
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add membership');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (membership: Membership, status: string) => {
    if (!membership.contact?.id || membership.status === status) return;

    try {
      await crmService.updateMembership(membership.contact.id, membership.id, { status });
      toast.success('Membership status updated');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <CrmLayout
      pageTitle="Membership Management"
      actions={
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={createAsCancelled}
              onChange={(e) => setCreateAsCancelled(e.target.checked)}
              className="rounded border-slate-300"
            />
            Create as cancelled
          </label>
          <button onClick={() => setShowForm(true)} className={`${btnPrimary} flex items-center gap-2`}>
            <Add className="w-4 h-4" /> Add Membership
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Pending', value: stats.pending, color: 'text-amber-600' },
          { label: 'Expired', value: stats.expired, color: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-lg p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'active', 'pending', 'expired', 'cancelled', 'suspended'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <Loading /> : filtered.length === 0 ? (
          <EmptyState
            message="No memberships found"
            action={
              <button onClick={() => setShowForm(true)} className={btnPrimary}>Add first membership</button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Start</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Renewal</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Payment</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {m.contact ? (
                      <a href={`/admin/crm/contacts/${m.contact.id}`} className="font-medium text-blue-600 hover:underline">
                        {m.contact.full_name}
                      </a>
                    ) : '—'}
                    {m.contact && <p className="text-xs text-slate-400 font-mono">{m.contact.contact_ref}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMembershipType(m.type)}</td>
                  <td className="px-4 py-3">
                    {options ? (
                      <select
                        value={m.status}
                        onChange={(e) => void handleStatusChange(m, e.target.value)}
                        className={`${inputClass} py-1.5 text-xs capitalize min-w-[110px]`}
                      >
                        {options.membership_statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge value={m.status} />
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(m.start_date)}</td>
                  <td className="px-4 py-3">{formatDate(m.renewal_date)}</td>
                  <td className="px-4 py-3 capitalize">{m.payment_status}</td>
                  <td className="px-4 py-3">£{m.amount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && options && (
        <Modal title="Add Membership" onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Contact *">
              <ContactPicker
                value={form.contact_id}
                onChange={(id) => setForm({ ...form, contact_id: id })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  {options.membership_types.map((t) => <option key={t} value={t}>{formatMembershipType(t)}</option>)}
                </select>
              </Field>
              <Field label="Payment Status">
                <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className={inputClass}>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="refunded">Refunded</option>
                </select>
              </Field>
            </div>
            <p className="text-xs text-slate-500">
              Membership status is managed from the table after creation (active, pending, cancelled, etc.).
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Start Date"><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputClass} /></Field>
              <Field label="Renewal Date"><input type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} className={inputClass} /></Field>
              <Field label="Expiry Date"><input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount (£)">
                <input type="number" step="0.01" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={2} />
            </Field>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
                {saving ? 'Saving...' : 'Add Membership'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </CrmLayout>
  );
};

export default CrmMemberships;
