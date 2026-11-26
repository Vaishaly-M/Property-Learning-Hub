'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Add, Search, Visibility, Edit, Delete } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { CrmContact, CrmOptions } from '../../../services/crmService';
import {
  ClassificationBadge, StatusBadge, Loading, EmptyState, Modal, Field,
  inputClass, btnPrimary, btnSecondary, formatClassification,
} from './crmShared';

export const ContactFormModal: React.FC<{
  contact?: CrmContact | null;
  options: CrmOptions;
  onClose: () => void;
  onSaved: () => void;
}> = ({ contact, options, onClose, onSaved }) => {
  const [form, setForm] = useState({
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone_number: contact?.phone_number ?? '',
    notes: contact?.notes ?? '',
    classifications: (contact?.classifications ?? []) as string[],
  });
  const [saving, setSaving] = useState(false);

  const toggleClassification = (cls: string) => {
    setForm((f) => ({
      ...f,
      classifications: f.classifications.includes(cls)
        ? f.classifications.filter((c) => c !== cls)
        : [...f.classifications, cls],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (contact) {
        const { status: _status, ...updatePayload } = form as typeof form & { status?: string };
        await crmService.updateContact(contact.id, updatePayload);
        toast.success('Contact updated');
      } else {
        await crmService.createContact(form);
        toast.success('Contact created');
      }
      onSaved();
      onClose();
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      const firstFieldError = apiErr.errors
        ? Object.values(apiErr.errors).flat()[0]
        : null;
      toast.error(firstFieldError || apiErr.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={contact ? 'Edit Contact' : 'New Contact'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name *">
            <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Last Name *">
            <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Phone Number">
          <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Classifications">
          <div className="flex flex-wrap gap-2 mt-1">
            {options.classifications.map((cls) => (
              <button key={cls} type="button" onClick={() => toggleClassification(cls)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  form.classifications.includes(cls) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                }`}>
                {formatClassification(cls)}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputClass} />
        </Field>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
            {saving ? 'Saving...' : contact ? 'Update Contact' : 'Create Contact'}
          </button>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
};

const CrmContacts: React.FC = () => {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [options, setOptions] = useState<CrmOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | null>(null);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (classFilter !== 'all') params.classification = classFilter;
      const res = await crmService.getContacts(params);
      setContacts(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, classFilter]);

  useEffect(() => {
    crmService.getOptions().then(setOptions);
    load();
  }, [load]);

  const handleDelete = async (c: CrmContact) => {
    if (!confirm(`Delete ${c.full_name}?`)) return;
    await crmService.deleteContact(c.id);
    toast.success('Contact deleted');
    load();
  };

  const handleStatusChange = async (contact: CrmContact, status: CrmContact['status']) => {
    if (contact.status === status) return;
    try {
      await crmService.updateContact(contact.id, { status });
      toast.success('Contact status updated');
      load(pagination.current_page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <CrmLayout
      pageTitle="Contact Management"
      actions={
        <button onClick={() => { setEditContact(null); setShowForm(true); }}
          className={`${btnPrimary} flex items-center gap-2`}>
          <Add className="w-4 h-4" /> New Contact
        </button>
      }
    >
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone, ID..."
            className={`${inputClass} pl-9`} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="all">All statuses</option>
          {options?.contact_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={inputClass}>
          <option value="all">All classifications</option>
          {options?.classifications.map((c) => <option key={c} value={c}>{formatClassification(c)}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? <Loading /> : contacts.length === 0 ? (
          <EmptyState message="No contacts found" action={
            <button onClick={() => setShowForm(true)} className={btnPrimary}>Create first contact</button>
          } />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Contact ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Classifications</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">
                      <a href={`/admin/crm/contacts/${c.id}`}>{c.contact_ref}</a>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <a href={`/admin/crm/contacts/${c.id}`} className="hover:text-blue-600">{c.full_name}</a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.phone_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.classifications.slice(0, 2).map((cls) => <ClassificationBadge key={cls} value={cls} />)}
                        {c.classifications.length > 2 && <span className="text-xs text-slate-400">+{c.classifications.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {options ? (
                        <select
                          value={c.status}
                          onChange={(e) => void handleStatusChange(c, e.target.value as CrmContact['status'])}
                          className={`${inputClass} py-1.5 text-xs capitalize min-w-[110px]`}
                        >
                          {options.contact_statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge value={c.status} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/admin/crm/contacts/${c.id}`}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-blue-600"
                          title="View contact"
                        >
                          <Visibility className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => { setEditContact(c); setShowForm(true); }}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-blue-600"
                          title="Edit contact"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-red-600"
                          title="Delete contact"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pagination.last_page > 1 && (
              <div className="flex justify-between items-center px-4 py-3 border-t text-sm text-slate-600">
                <span>{pagination.total} contacts</span>
                <div className="flex gap-2">
                  <button disabled={pagination.current_page <= 1} onClick={() => load(pagination.current_page - 1)} className={btnSecondary}>Previous</button>
                  <span className="px-3 py-2">Page {pagination.current_page} of {pagination.last_page}</span>
                  <button disabled={pagination.current_page >= pagination.last_page} onClick={() => load(pagination.current_page + 1)} className={btnSecondary}>Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && options && (
        <ContactFormModal contact={editContact} options={options} onClose={() => setShowForm(false)} onSaved={() => load()} />
      )}
    </CrmLayout>
  );
};

export default CrmContacts;
