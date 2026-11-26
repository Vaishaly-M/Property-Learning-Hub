'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Add, Edit, Delete, Visibility, PersonAdd, Block } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { CrmEvent, EventRegistration, Pagination, Presenter } from '../../../services/crmService';
import {
  Loading, EmptyState, Modal, Field, StatusBadge, btnPrimary, btnSecondary, btnDanger, inputClass, formatDateTime,
  PaginationBar, ContactPicker,
} from './crmShared';

const CrmEvents: React.FC = () => {
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [presenters, setPresenters] = useState<Presenter[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<CrmEvent | null>(null);
  const [viewEvent, setViewEvent] = useState<CrmEvent | null>(null);
  const [registerContactId, setRegisterContactId] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const emptyForm = {
    title: '', description: '', venue: '', online_link: '', capacity: 50,
    starts_at: '', ends_at: '', status: 'draft', presenter_id: '',
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [res, presenterList] = await Promise.all([
        crmService.getEvents(params),
        presenters.length ? Promise.resolve(presenters) : crmService.getPresenters(),
      ]);
      setEvents(res.data);
      setPagination(res.pagination);
      if (!presenters.length) setPresenters(presenterList as Presenter[]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, presenters.length]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: number) => {
    setViewEvent(await crmService.getEvent(id));
  };

  const buildEventPayload = () => ({
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    venue: form.venue.trim() || undefined,
    online_link: form.online_link.trim() || undefined,
    capacity: form.capacity > 0 ? form.capacity : undefined,
    starts_at: form.starts_at,
    ends_at: form.ends_at || undefined,
    status: editEvent ? form.status : 'published',
    presenter_id: form.presenter_id ? Number(form.presenter_id) : undefined,
  });

  const validateForm = () => {
    if (!form.starts_at) {
      return 'Start date and time are required.';
    }
    if (form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      return 'End date must be after the start date.';
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = buildEventPayload();
      if (editEvent) {
        await crmService.updateEvent(editEvent.id, payload);
        toast.success('Event updated');
      } else {
        await crmService.createEvent(payload);
        toast.success('Event created');
      }
      setShowForm(false);
      setEditEvent(null);
      load(pagination.current_page);
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      const firstFieldError = apiErr.errors
        ? Object.values(apiErr.errors).flat()[0]
        : null;
      toast.error(firstFieldError || apiErr.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const canCancelEvent = (status: string) => ['draft', 'published'].includes(status);
  const canRegisterForEvent = (status: string) => !['cancelled', 'completed'].includes(status);

  const handleCancel = async (ev: CrmEvent) => {
    if (!confirm(`Cancel "${ev.title}"? The event will stay on record but no longer accept registrations.`)) return;
    try {
      await crmService.updateEvent(ev.id, { status: 'cancelled' });
      toast.success('Event cancelled');
      if (viewEvent?.id === ev.id) setViewEvent(null);
      load(pagination.current_page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel event');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    await crmService.deleteEvent(id);
    toast.success('Event deleted');
    load();
  };

  const openEdit = (ev: CrmEvent) => {
    setEditEvent(ev);
    setForm({
      title: ev.title, description: ev.description ?? '', venue: ev.venue ?? '',
      online_link: ev.online_link ?? '', capacity: ev.capacity ?? 50,
      starts_at: ev.starts_at?.slice(0, 16) ?? '', ends_at: ev.ends_at?.slice(0, 16) ?? '',
      status: ev.status, presenter_id: ev.presenter ? String(ev.presenter.id) : '',
    });
    setShowForm(true);
  };

  const registerContact = async () => {
    if (!viewEvent || !registerContactId) return;
    await crmService.registerForEvent(viewEvent.id, Number(registerContactId));
    toast.success('Contact registered');
    setRegisterContactId('');
    loadDetail(viewEvent.id);
    load();
  };

  const toggleAttendance = async (reg: EventRegistration, field: 'attended' | 'no_show') => {
    if (!viewEvent) return;
    await crmService.updateEventRegistration(viewEvent.id, reg.id, {
      attended: field === 'attended' ? !reg.attended : reg.attended,
      no_show: field === 'no_show' ? !reg.no_show : reg.no_show,
    });
    loadDetail(viewEvent.id);
    toast.success('Updated');
  };

  return (
    <CrmLayout
      pageTitle="Event Management"
      actions={
        <button onClick={() => { setEditEvent(null); setForm(emptyForm); setShowForm(true); }}
          className={`${btnPrimary} flex items-center gap-2`}>
          <Add className="w-4 h-4" /> Create Event
        </button>
      }
    >
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'published', 'completed', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : events.length === 0 ? (
        <EmptyState message="No events yet" />
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white border rounded-lg p-5">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{ev.title}</h3>
                <StatusBadge value={ev.status} />
              </div>
              {ev.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{ev.description}</p>}
              <div className="text-sm text-slate-600 space-y-1">
                <p>📅 {formatDateTime(ev.starts_at)}</p>
                {ev.venue && <p>📍 {ev.venue}</p>}
                {ev.online_link && <a href={ev.online_link} className="text-blue-600 text-xs">Online link →</a>}
                <p>👥 {ev.registration_count}/{ev.capacity ?? '∞'} registered · {ev.attendance_count} attended</p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button onClick={() => loadDetail(ev.id)} className={`${btnSecondary} text-xs flex items-center gap-1`}>
                  <Visibility className="w-3.5 h-3.5" /> Manage
                </button>
                <button onClick={() => openEdit(ev)} className={`${btnSecondary} text-xs flex items-center gap-1`}>
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                {canCancelEvent(ev.status) && (
                  <button onClick={() => handleCancel(ev)} className={`${btnSecondary} text-xs flex items-center gap-1 text-amber-700 border-amber-200`}>
                    <Block className="w-3.5 h-3.5" /> Cancel Event
                  </button>
                )}
                <button onClick={() => handleDelete(ev.id)} className={`${btnDanger} text-xs flex items-center gap-1`}>
                  <Delete className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <PaginationBar pagination={pagination} onPage={(p) => load(p)} label="events" />
        </>
      )}

      {showForm && (
        <Modal title={editEvent ? 'Edit Event' : 'Create Event'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Title *"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></Field>
            <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={3} /></Field>
            <Field label="Presenter">
              <select value={form.presenter_id} onChange={(e) => setForm({ ...form, presenter_id: e.target.value })} className={inputClass}>
                <option value="">No presenter</option>
                {presenters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Venue"><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={inputClass} /></Field>
              <Field label="Capacity"><input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className={inputClass} /></Field>
            </div>
            <Field label="Online Link"><input value={form.online_link} onChange={(e) => setForm({ ...form, online_link: e.target.value })} className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Starts At *"><input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputClass} /></Field>
              <Field label="Ends At"><input type="datetime-local" value={form.ends_at} min={form.starts_at || undefined} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputClass} /></Field>
            </div>
            {editEvent && (
              <Field label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  {['draft', 'published', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>Save Event</button>
              <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {viewEvent && (
        <Modal title={viewEvent.title} onClose={() => setViewEvent(null)} wide>
          <div className="mb-4 p-4 bg-slate-50 rounded-lg text-sm grid grid-cols-2 gap-2">
            <p><strong>When:</strong> {formatDateTime(viewEvent.starts_at)}</p>
            <p><strong>Capacity:</strong> {viewEvent.registration_count}/{viewEvent.capacity ?? '∞'}</p>
            {viewEvent.venue && <p><strong>Venue:</strong> {viewEvent.venue}</p>}
            <p><strong>Status:</strong> <StatusBadge value={viewEvent.status} /></p>
            <p><strong>Attended:</strong> {viewEvent.attendance_count}</p>
          </div>
          {canCancelEvent(viewEvent.status) && (
            <div className="mb-4">
              <button onClick={() => handleCancel(viewEvent)} className={`${btnSecondary} text-sm flex items-center gap-1 text-amber-700 border-amber-200`}>
                <Block className="w-4 h-4" /> Cancel Event
              </button>
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <ContactPicker value={registerContactId} onChange={setRegisterContactId} />
            </div>
            <button
              onClick={registerContact}
              disabled={!registerContactId || !canRegisterForEvent(viewEvent.status)}
              className={`${btnPrimary} flex items-center gap-1 self-end disabled:opacity-50`}
            >
              <PersonAdd className="w-4 h-4" /> Register
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Registered</th>
                <th className="text-left px-3 py-2">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(viewEvent.registrations ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.contact_name}</p>
                    <p className="text-xs text-slate-400">{r.contact_email}</p>
                  </td>
                  <td className="px-3 py-2">{new Date(r.registered_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button onClick={() => toggleAttendance(r, 'attended')}
                      className={`text-xs px-2 py-1 rounded ${r.attended ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>Attended</button>
                    <button onClick={() => toggleAttendance(r, 'no_show')}
                      className={`text-xs px-2 py-1 rounded ${r.no_show ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>No Show</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(viewEvent.registrations ?? []).length === 0 && <p className="text-center py-8 text-slate-400">No registrations</p>}
        </Modal>
      )}
    </CrmLayout>
  );
};

export default CrmEvents;
