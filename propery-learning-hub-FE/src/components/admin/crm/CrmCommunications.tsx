'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Add, Send, Visibility, Delete, Edit, Block, Schedule } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { Communication, Pagination } from '../../../services/crmService';
import {
  Loading, EmptyState, Modal, Field, StatusBadge, btnPrimary, btnSecondary, btnDanger, inputClass, formatDateTime,
  PaginationBar, ContactPicker,
} from './crmShared';

const typeLabels: Record<string, string> = {
  email_campaign: 'Email Campaign',
  newsletter: 'Newsletter',
  webinar_invitation: 'Webinar Invitation',
  event_invitation: 'Event Invitation',
  membership_update: 'Membership Update',
  renewal_reminder: 'Renewal Reminder',
  follow_up_sequence: 'Follow-Up Sequence',
};

const filterLabels: Record<string, string> = {
  all_members: 'All Members',
  active_members: 'Active Members',
  vip_members: 'VIP Members',
  webinar_attendees: 'Webinar Attendees',
  leads: 'Leads',
  former_members: 'Former Members',
  custom: 'Custom Selection',
};

const emptyForm = {
  type: 'email_campaign', subject: '', body: '', priority: 'medium', category: 'general',
  audience_filter: 'active_members',
  send_now: true, scheduled_at: '', contact_ids: [] as number[],
};

function minScheduleDateTime(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function getSubmitActionLabel(
  saving: boolean,
  editComm: Communication | null,
  sendNow: boolean,
  scheduledAt: string,
): string {
  if (saving) return 'Saving...';
  const scheduling = Boolean(scheduledAt);
  if (editComm) {
    if (editComm.status === 'scheduled' || scheduling) return 'Update Schedule';
    return 'Update Draft';
  }
  if (sendNow) return 'Send Now';
  if (scheduling) return 'Schedule';
  return 'Save Draft';
}

function isScheduling(sendNow: boolean, scheduledAt: string, editComm: Communication | null): boolean {
  if (editComm?.status === 'scheduled') return true;
  if (editComm) return Boolean(scheduledAt);
  return !sendNow && Boolean(scheduledAt);
}

const CrmCommunications: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editComm, setEditComm] = useState<Communication | null>(null);
  const [viewComm, setViewComm] = useState<Communication | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await crmService.getCommunications(params);
      setCommunications(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditComm(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: Communication) => {
    setEditComm(c);
    let scheduledLocal = '';
    if (c.scheduled_at) {
      const dateObj = new Date(c.scheduled_at);
      const tzOffset = dateObj.getTimezoneOffset() * 60000;
      scheduledLocal = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
    }
    setForm({
      type: c.type, subject: c.subject, body: c.body,
      priority: c.priority ?? 'medium', category: c.category ?? 'general',
      audience_filter: c.audience_filter,
      send_now: false, scheduled_at: scheduledLocal,
      contact_ids: c.recipients?.map((r) => r.contact_id) ?? [],
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const scheduling = isScheduling(form.send_now, form.scheduled_at, editComm);
    if (scheduling && new Date(form.scheduled_at) <= new Date()) {
      toast.error('Schedule date must be in the future.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        send_now: editComm ? false : form.send_now,
        contact_ids: form.audience_filter === 'custom' ? form.contact_ids : undefined,
        filter_params: form.audience_filter === 'webinar_attendees' ? { attended_only: true } : undefined,
      };
      if (editComm) {
        await crmService.updateCommunication(editComm.id, payload);
        toast.success(scheduling ? 'Communication scheduled' : 'Draft updated');
      } else {
        await crmService.createCommunication(payload);
        toast.success(
          form.send_now ? 'Communication sent' : scheduling ? 'Communication scheduled' : 'Draft saved'
        );
      }
      setShowForm(false);
      load(pagination.current_page);
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      const firstFieldError = apiErr.errors
        ? Object.values(apiErr.errors).flat()[0]
        : null;
      toast.error(firstFieldError || apiErr.message || 'Failed to save communication');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: number) => {
    try {
      const res = await crmService.sendCommunication(id);
      toast.success(`Sent to ${res.recipient_count} contacts`);
      load(pagination.current_page);
    } catch {
      toast.error('Failed to send');
    }
  };

  const canCancelCommunication = (status: string) => ['draft', 'scheduled', 'sending'].includes(status);

  const handleCancel = async (c: Communication) => {
    if (!confirm(`Cancel "${c.subject}"? It will not be sent.`)) return;
    try {
      await crmService.cancelCommunication(c.id);
      toast.success('Communication cancelled');
      if (viewComm?.id === c.id) setViewComm(null);
      load(pagination.current_page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel communication');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this communication?')) return;
    await crmService.deleteCommunication(id);
    toast.success('Deleted');
    load(pagination.current_page);
  };

  const viewDetail = async (id: number) => {
    try {
      setViewComm(await crmService.getCommunication(id));
    } catch {
      toast.error('Failed to load communication');
    }
  };

  const duplicateAsDraft = async (c: Communication) => {
    setEditComm(null);
    setForm({
      type: c.type,
      subject: c.subject,
      body: c.body,
      priority: c.priority ?? 'medium',
      category: c.category ?? 'general',
      audience_filter: c.audience_filter,
      send_now: true,
      scheduled_at: '',
      contact_ids: [],
    });
    setShowForm(true);
    toast.success('Loaded as a new draft');
  };

  const isStatusFiltered = statusFilter !== 'all';

  const emptyListContent = isStatusFiltered ? (
    <EmptyState message="No data available for the selected filter." />
  ) : (
    <EmptyState
      message="No communications yet"
      action={<button onClick={openCreate} className={btnPrimary}>Create first communication</button>}
    />
  );

  const submitScheduling = isScheduling(form.send_now, form.scheduled_at, editComm);
  const SubmitIcon = !editComm && form.send_now ? Send : submitScheduling ? Schedule : Send;

  return (
    <CrmLayout
      pageTitle="Communication Centre"
      actions={
        <button onClick={openCreate} className={`${btnPrimary} flex items-center gap-2`}>
          <Add className="w-4 h-4" /> New Communication
        </button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: pagination.total || communications.length },
          { label: 'Sent', value: communications.filter((c) => c.status === 'sent').length },
          { label: 'Drafts', value: communications.filter((c) => c.status === 'draft').length },
          { label: 'Scheduled', value: communications.filter((c) => c.status === 'scheduled').length },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'scheduled', 'sent', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <Loading /> : communications.length === 0 ? (
          emptyListContent
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Audience</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Recipients</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {communications.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{typeLabels[c.type] ?? c.type}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{c.priority ?? 'medium'}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{c.category ?? 'general'}</td>
                    <td className="px-4 py-3 text-slate-600">{filterLabels[c.audience_filter] ?? c.audience_filter}</td>
                    <td className="px-4 py-3">{c.recipient_count}</td>
                    <td className="px-4 py-3"><StatusBadge value={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void viewDetail(c.id)}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-blue-600"
                          title="View communication"
                        >
                          <Visibility className="w-4 h-4" />
                        </button>
                        {c.status === 'sent' ? (
                          <button
                            type="button"
                            onClick={() => void duplicateAsDraft(c)}
                            className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-blue-600"
                            title="Duplicate as new draft"
                          >
                            <Add className="w-4 h-4" />
                          </button>
                        ) : canCancelCommunication(c.status) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-blue-600"
                              title="Edit communication"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {c.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => handleSend(c.id)}
                                className="inline-flex items-center justify-center gap-1 px-1.5 py-1 text-blue-600 hover:text-blue-700 text-xs font-medium whitespace-nowrap"
                                title="Send communication"
                              >
                                <Send className="w-4 h-4" />
                                Send
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCancel(c)}
                              className="inline-flex items-center justify-center gap-1 px-1.5 py-1 text-amber-700 hover:text-amber-800 text-xs font-medium whitespace-nowrap"
                              title="Cancel communication"
                            >
                              <Block className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="inline-flex items-center justify-center p-1 text-slate-500 hover:text-red-600"
                          title="Delete communication"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar pagination={pagination} onPage={(p) => load(p)} label="communications" />
          </>
        )}
      </div>

      {showForm && (
        <Modal title={editComm ? 'Edit Communication' : 'New Communication'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="Audience">
                <select value={form.audience_filter} onChange={(e) => setForm({ ...form, audience_filter: e.target.value })} className={inputClass}>
                  {Object.entries(filterLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            {form.audience_filter === 'custom' && (
              <Field label="Select Contacts">
                <ContactPicker multiple selectedIds={form.contact_ids}
                  onMultipleChange={(ids) => setForm({ ...form, contact_ids: ids })} value="" onChange={() => {}} />
              </Field>
            )}
            <Field label="Subject *">
              <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                  <option value="general">General</option>
                  <option value="system">System Updates</option>
                  <option value="educational">Educational</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="opportunity">Opportunities</option>
                </select>
              </Field>
            </div>
            <Field label="Message Body *">
              <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={inputClass} rows={8}
                placeholder="Write your message here..." />
            </Field>
            {!editComm && (
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.send_now} onChange={(e) => setForm({ ...form, send_now: e.target.checked })} />
                  Send immediately
                </label>
                {!form.send_now && (
                  <Field label="Schedule for">
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      min={minScheduleDateTime()}
                      onChange={(e) => setForm({
                        ...form,
                        scheduled_at: e.target.value,
                        send_now: e.target.value ? false : form.send_now,
                      })}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>
            )}
            {editComm && (
              <Field label="Schedule for">
                <input type="datetime-local" value={form.scheduled_at} min={minScheduleDateTime()} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className={inputClass} />
              </Field>
            )}
            {editComm && canCancelCommunication(editComm.status) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCancel(editComm)}
                  className={`${btnSecondary} flex items-center gap-2 text-amber-700 border-amber-200`}
                >
                  <Block className="w-4 h-4" /> Cancel scheduled send
                </button>
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={`${btnPrimary} flex-1 flex items-center justify-center gap-2`}>
                <SubmitIcon className="w-4 h-4" />
                {getSubmitActionLabel(saving, editComm, form.send_now, form.scheduled_at)}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {viewComm && (
        <Modal title={viewComm.subject} onClose={() => setViewComm(null)} wide>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <StatusBadge value={viewComm.status} />
              <span className="text-slate-500">{typeLabels[viewComm.type]}</span>
              <span className="text-slate-500 capitalize">Priority: {viewComm.priority ?? 'medium'}</span>
              <span className="text-slate-500 capitalize">Category: {viewComm.category ?? 'general'}</span>
              <span className="text-slate-500">→ {filterLabels[viewComm.audience_filter]}</span>
              <span className="text-slate-500">{viewComm.recipient_count} recipients</span>
              {viewComm.sent_at && <span className="text-slate-500">Sent {formatDateTime(viewComm.sent_at)}</span>}
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-sm whitespace-pre-wrap border">{viewComm.body}</div>
            {viewComm.recipients && viewComm.recipients.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recipients</h4>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-sm">
                  {viewComm.recipients.map((r) => (
                    <div key={r.id} className="px-3 py-2 flex justify-between">
                      <span>{r.contact ? `${r.contact.first_name} ${r.contact.last_name}` : `Contact #${r.contact_id}`}</span>
                      <StatusBadge value={r.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {canCancelCommunication(viewComm.status) && (
              <div className="flex gap-2">
                <button onClick={() => { handleSend(viewComm.id); setViewComm(null); }} className={`${btnPrimary} flex-1 flex items-center justify-center gap-2`}>
                  <Send className="w-4 h-4" /> Send Now
                </button>
                <button onClick={() => handleCancel(viewComm)} className={`${btnSecondary} flex items-center justify-center gap-2 text-amber-700 border-amber-200`}>
                  <Block className="w-4 h-4" /> Cancel
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </CrmLayout>
  );
};

export default CrmCommunications;
