'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Add, Edit, Visibility, PersonAdd, Delete, Block } from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { CrmWebinar, Presenter, Pagination } from '../../../services/crmService';
import {
  Loading, EmptyState, Modal, Field, StatusBadge, btnPrimary, btnSecondary, btnDanger,
  inputClass, formatDate, PaginationBar, ContactPicker,
} from './crmShared';

const CrmWebinars: React.FC = () => {
  const [webinars, setWebinars] = useState<CrmWebinar[]>([]);
  const [presenters, setPresenters] = useState<Presenter[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, per_page: 15, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editWebinar, setEditWebinar] = useState<CrmWebinar | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [registrations, setRegistrations] = useState<Awaited<ReturnType<typeof crmService.getWebinar>>['crm_registrations']>([]);
  const [registerContactId, setRegisterContactId] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '10:00', duration: 60, live_link: '', max_attendees: 100, presenter_id: '',
  });
  const [priceDraft, setPriceDraft] = useState('0');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [res, presenterList] = await Promise.all([
        crmService.getWebinars(params),
        presenters.length ? Promise.resolve(presenters) : crmService.getPresenters(),
      ]);
      setWebinars(res.data);
      setPagination(res.pagination);
      if (!presenters.length) setPresenters(presenterList as Presenter[]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, presenters.length]);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: number) => {
    const data = await crmService.getWebinar(id);
    setRegistrations(data.crm_registrations);
    setViewId(id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: priceDraft.trim() === '' ? 0 : Number(priceDraft),
        presenter_id: form.presenter_id ? Number(form.presenter_id) : undefined,
      };
      if (editWebinar) {
        await crmService.updateWebinar(editWebinar.id, payload);
        toast.success('Webinar updated');
      } else {
        await crmService.createWebinar(payload);
        toast.success('Webinar created on Zoom');
      }
      setShowForm(false);
      setEditWebinar(null);
      load(pagination.current_page);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save webinar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this webinar?')) return;
    await crmService.deleteWebinar(id);
    toast.success('Webinar deleted');
    load(pagination.current_page);
  };

  const canCancelWebinar = (status: string) => !['cancelled', 'completed'].includes(status);
  const canRegisterForWebinar = (status: string) => !['cancelled', 'completed'].includes(status);

  const handleCancel = async (w: CrmWebinar) => {
    if (!confirm(`Cancel "${w.title}"? The webinar will stay on record but no longer accept registrations. Paid learner registrations will be refunded where applicable.`)) return;

    try {
      await crmService.cancelWebinar(w.id);
      toast.success('Webinar cancelled');
      if (viewId === w.id) setViewId(null);
      load(pagination.current_page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel webinar');
    }
  };

  const openEdit = (w: CrmWebinar) => {
    setEditWebinar(w);
    setForm({
      title: w.title, description: w.description ?? '', date: w.date, time: w.time,
      duration: w.duration, live_link: w.live_link ?? '', max_attendees: w.max_attendees,
      presenter_id: w.presenter ? String(w.presenter.id) : '',
    });
    setPriceDraft(String(Number(w.price) || 0));
    setShowForm(true);
  };

  const registerContact = async () => {
    if (!viewId || !registerContactId) return;
    await crmService.registerForWebinar(viewId, Number(registerContactId));
    toast.success('Contact registered');
    setRegisterContactId('');
    loadDetail(viewId);
    load(pagination.current_page);
  };

  const toggleAttendance = async (reg: (typeof registrations)[0], field: 'attended' | 'no_show') => {
    if (!viewId) return;
    await crmService.updateWebinarRegistration(viewId, reg.id, {
      attended: field === 'attended' ? !reg.attended : reg.attended,
      no_show: field === 'no_show' ? !reg.no_show : reg.no_show,
    });
    loadDetail(viewId);
    toast.success('Updated');
  };

  const viewed = webinars.find((w) => w.id === viewId);

  return (
    <CrmLayout
      pageTitle="Webinar Management"
      actions={
        <button onClick={() => { setEditWebinar(null); setForm({ title: '', description: '', date: '', time: '10:00', duration: 60, live_link: '', max_attendees: 100, presenter_id: '' }); setPriceDraft('0'); setShowForm(true); }}
          className={`${btnPrimary} flex items-center gap-2`}>
          <Add className="w-4 h-4" /> Create Webinar
        </button>
      }
    >
      <div className="flex gap-2 mb-4">
        {['all', 'upcoming', 'live', 'completed', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <Loading /> : webinars.length === 0 ? (
        <EmptyState
          message={statusFilter === 'all' ? 'No webinars yet' : 'No webinars match this filter'}
          action={
            statusFilter === 'all' ? (
              <button onClick={() => setShowForm(true)} className={btnPrimary}>Create webinar</button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {webinars.map((w) => (
              <div key={w.id} className="bg-white border border-slate-200 rounded-lg p-5 hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-slate-800 text-lg">{w.title}</h3>
                  <StatusBadge value={w.status} />
                </div>
                {w.zoom_webinar_id && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Zoom connected
                  </span>
                )}
                {w.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{w.description}</p>}
                <div className="text-sm text-slate-600 space-y-1">
                  <p>📅 {formatDate(w.date)} at {w.time} · {w.duration} min</p>
                  {w.presenter && <p>👤 {w.presenter.name}</p>}
                  <p>👥 {w.crm_registrations} CRM / {w.platform_registrations} platform registrations · {w.crm_attended} attended</p>
                  <p>💷 {Number(w.price) > 0 ? `£${Number(w.price).toFixed(2)}` : 'Free'}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  {(w.zoom_join_url || w.live_link) && (
                    <a href={w.zoom_join_url || w.live_link || '#'} target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-block">
                      Join link →
                    </a>
                  )}
                  {w.zoom_start_url && (
                    <a href={w.zoom_start_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 inline-block">
                      Host start link →
                    </a>
                  )}
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button onClick={() => loadDetail(w.id)} className={`${btnSecondary} flex items-center gap-1 text-xs`}>
                    <Visibility className="w-3.5 h-3.5" /> Registrations
                  </button>
                  <button onClick={() => openEdit(w)} className={`${btnSecondary} flex items-center gap-1 text-xs`}>
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  {canCancelWebinar(w.status) && (
                    <button onClick={() => handleCancel(w)} className={`${btnSecondary} flex items-center gap-1 text-xs text-amber-700 border-amber-200`}>
                      <Block className="w-3.5 h-3.5" /> Cancel Webinar
                    </button>
                  )}
                  <button onClick={() => handleDelete(w.id)} className={`${btnDanger} flex items-center gap-1 text-xs`}>
                    <Delete className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <PaginationBar pagination={pagination} onPage={(p) => load(p)} label="webinars" />
        </>
      )}

      {showForm && (
        <Modal title={editWebinar ? 'Edit Webinar' : 'Create Webinar'} onClose={() => setShowForm(false)} wide>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              Zoom creates the join and host links automatically when you save. If your account has no Webinar license, a scheduled Zoom meeting is used instead.
            </div>
            <Field label="Title *"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} /></Field>
            <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} rows={3} /></Field>
            <Field label="Presenter">
              <select value={form.presenter_id} onChange={(e) => setForm({ ...form, presenter_id: e.target.value })} className={inputClass}>
                <option value="">Default presenter</option>
                {presenters.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Date *"><input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} /></Field>
              <Field label="Time *"><input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={inputClass} /></Field>
              <Field label="Duration (min)"><input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} className={inputClass} /></Field>
            </div>
            <Field label={editWebinar?.zoom_webinar_id ? 'Meeting Link (from Zoom)' : 'Fallback Meeting Link (optional)'}>
              <input
                value={form.live_link}
                onChange={(e) => setForm({ ...form, live_link: e.target.value })}
                className={inputClass}
                placeholder={editWebinar?.zoom_webinar_id ? 'Managed by Zoom' : 'Used only if Zoom is unavailable'}
                readOnly={Boolean(editWebinar?.zoom_webinar_id)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Max Attendees"><input type="number" min={1} value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: Number(e.target.value) })} className={inputClass} /></Field>
              <Field label="Price (£)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  className={inputClass}
                  placeholder="0.00 for free"
                />
              </Field>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={`${btnPrimary} flex-1`}>
                {saving ? 'Saving...' : editWebinar ? 'Save Webinar' : 'Create on Zoom'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {viewId && viewed && (
        <Modal title={`Registrations — ${viewed.title}`} onClose={() => setViewId(null)} wide>
          {canCancelWebinar(viewed.status) && (
            <div className="flex justify-end mb-4">
              <button onClick={() => handleCancel(viewed)} className={`${btnSecondary} text-sm flex items-center gap-1 text-amber-700 border-amber-200`}>
                <Block className="w-4 h-4" /> Cancel Webinar
              </button>
            </div>
          )}
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <ContactPicker value={registerContactId} onChange={setRegisterContactId} />
            </div>
            <button
              onClick={registerContact}
              disabled={!registerContactId || !canRegisterForWebinar(viewed.status)}
              className={`${btnPrimary} flex items-center gap-1 self-end`}
            >
              <PersonAdd className="w-4 h-4" /> Register
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2">Contact</th>
                <th className="text-left px-3 py-2">Registered</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.contact_name}</p>
                    <p className="text-xs text-slate-400">{r.contact_email}</p>
                  </td>
                  <td className="px-3 py-2">{new Date(r.registered_at).toLocaleDateString()}</td>
                  <td className="px-3 py-2"><StatusBadge value={r.status} /></td>
                  <td className="px-3 py-2 space-x-2">
                    <button onClick={() => toggleAttendance(r, 'attended')}
                      className={`text-xs px-2 py-1 rounded ${r.attended ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                      Attended
                    </button>
                    <button onClick={() => toggleAttendance(r, 'no_show')}
                      className={`text-xs px-2 py-1 rounded ${r.no_show ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>
                      No Show
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 && <p className="text-center py-8 text-slate-400">No CRM registrations yet</p>}
        </Modal>
      )}
    </CrmLayout>
  );
};

export default CrmWebinars;
