'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowBack, Edit, Delete, Add, History, CardMembership, School, Videocam, Event,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, {
  type CrmContactDetail,
  type CrmOptions, type Membership, type ContactCourse, type CourseOption,
} from '../../../services/crmService';
import {
  ClassificationBadge, StatusBadge, Loading, Modal, Field,
  inputClass, btnPrimary, btnSecondary, btnDanger,
  formatDate, formatDateTime, formatMembershipType, activityTypeLabels,
} from './crmShared';
import { ContactFormModal } from './CrmContacts';

type Tab = 'timeline' | 'memberships' | 'courses' | 'webinars' | 'events';

export const ContactDetailView: React.FC<{ contactId: number }> = ({ contactId }) => {
  const router = useRouter();
  const [contact, setContact] = useState<CrmContactDetail | null>(null);
  const [options, setOptions] = useState<CrmOptions | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [tab, setTab] = useState<Tab>('timeline');
  const [note, setNote] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showMembershipForm, setShowMembershipForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [editingCourse, setEditingCourse] = useState<ContactCourse | null>(null);

  const [membershipForm, setMembershipForm] = useState({
    type: 'community', status: 'active', start_date: '', renewal_date: '', expiry_date: '',
    payment_status: 'paid', amount: '', notes: '',
  });
  const [courseForm, setCourseForm] = useState({
    course_id: '', purchase_date: new Date().toISOString().slice(0, 10), amount_paid: '', completion_status: 'not_started',
    certificate_issued: false,
  });

  const load = useCallback(async () => {
    const [c, opts, courseList] = await Promise.all([
      crmService.getContact(contactId),
      crmService.getOptions(),
      crmService.getCourses(),
    ]);
    setContact(c);
    setOptions(opts);
    setCourses(courseList);
  }, [contactId]);

  useEffect(() => { load().catch(() => toast.error('Failed to load contact')); }, [load]);

  const addNote = async () => {
    if (!note.trim()) return;
    await crmService.addNote(contactId, note);
    setNote('');
    load();
    toast.success('Note added');
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contact permanently?')) return;
    await crmService.deleteContact(contactId);
    toast.success('Contact deleted');
    router.push('/admin/crm/contacts');
  };

  const saveMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      type: membershipForm.type,
      amount: membershipForm.amount ? Number(membershipForm.amount) : null,
      start_date: membershipForm.start_date || null,
      renewal_date: membershipForm.renewal_date || null,
      expiry_date: membershipForm.expiry_date || null,
      payment_status: membershipForm.payment_status,
      notes: membershipForm.notes || null,
    };
    if (editingMembership) {
      await crmService.updateMembership(contactId, editingMembership.id, {
        ...payload,
        status: membershipForm.status,
      });
      toast.success('Membership updated');
    } else {
      await crmService.addMembership(contactId, payload);
      toast.success('Membership added');
    }
    setShowMembershipForm(false);
    setEditingMembership(null);
    load();
  };

  const updateMembershipStatus = async (membership: Membership, status: string) => {
    if (membership.status === status) return;

    try {
      await crmService.updateMembership(contactId, membership.id, { status });
      toast.success('Membership status updated');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.course_id && !editingCourse) return;
    const payload = {
      course_id: Number(courseForm.course_id || editingCourse?.course_id),
      purchase_date: courseForm.purchase_date,
      amount_paid: courseForm.amount_paid !== '' ? Number(courseForm.amount_paid) : null,
      completion_status: courseForm.completion_status,
      certificate_issued: courseForm.certificate_issued,
    };
    if (editingCourse) {
      await crmService.updateCourse(contactId, editingCourse.id, payload);
      toast.success('Course updated');
    } else {
      await crmService.addCourse(contactId, payload);
      toast.success('Course added');
    }
    setShowCourseForm(false);
    setEditingCourse(null);
    load();
  };

  const openEditMembership = (m: Membership) => {
    setEditingMembership(m);
    setMembershipForm({
      type: m.type, status: m.status,
      start_date: m.start_date ?? '', renewal_date: m.renewal_date ?? '', expiry_date: m.expiry_date ?? '',
      payment_status: m.payment_status, amount: m.amount?.toString() ?? '', notes: m.notes ?? '',
    });
    setShowMembershipForm(true);
  };

  const openEditCourse = (c: ContactCourse) => {
    setEditingCourse(c);
    setCourseForm({
      course_id: String(c.course_id), purchase_date: c.purchase_date,
      amount_paid: c.amount_paid?.toString() ?? '', completion_status: c.completion_status,
      certificate_issued: c.certificate_issued,
    });
    setShowCourseForm(true);
  };

  const deleteMembership = async (membershipId: number) => {
    if (!confirm('Remove this membership?')) return;
    await crmService.deleteMembership(contactId, membershipId);
    toast.success('Membership removed');
    load();
  };

  if (!contact || !options) {
    return <CrmLayout pageTitle="Contact"><Loading /></CrmLayout>;
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'timeline', label: 'Activity Timeline', icon: <History className="w-4 h-4" />, count: contact.timeline.length },
    { key: 'memberships', label: 'Memberships', icon: <CardMembership className="w-4 h-4" />, count: contact.memberships.length },
    { key: 'courses', label: 'Courses', icon: <School className="w-4 h-4" />, count: contact.courses.length },
    { key: 'webinars', label: 'Webinars', icon: <Videocam className="w-4 h-4" />, count: contact.webinar_registrations.length },
    { key: 'events', label: 'Events', icon: <Event className="w-4 h-4" />, count: contact.event_registrations.length },
  ];

  return (
    <CrmLayout
      pageTitle={contact.full_name}
      actions={
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/crm/contacts')} className={`${btnSecondary} flex items-center gap-1`}>
            <ArrowBack className="w-4 h-4" /> Back
          </button>
          <button onClick={() => setShowEdit(true)} className={`${btnSecondary} flex items-center gap-1`}>
            <Edit className="w-4 h-4" /> Edit
          </button>
          <button onClick={handleDelete} className={`${btnSecondary} flex items-center gap-1 text-red-600 border-red-200`}>
            <Delete className="w-4 h-4" /> Delete
          </button>
        </div>
      }
    >
      {/* Header card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-slate-500 mb-1">{contact.contact_ref}</p>
            <h3 className="text-xl font-bold text-slate-800">{contact.full_name}</h3>
            <p className="text-slate-600 mt-1">{contact.email ?? 'No email'} · {contact.phone_number ?? 'No phone'}</p>
            <div className="flex flex-wrap gap-1 mt-3">
              {contact.classifications.map((cls) => <ClassificationBadge key={cls} value={cls} />)}
            </div>
          </div>
          <div className="text-right text-sm space-y-1">
            <div><StatusBadge value={contact.status} /></div>
            <p className="text-slate-500">Created {formatDate(contact.created_at)}</p>
            {contact.active_memberships.length > 0 && (
              <p className="text-green-600 font-medium">
                {contact.active_memberships.map(formatMembershipType).join(', ')}
              </p>
            )}
          </div>
        </div>
        {contact.notes && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border-l-4 border-blue-400">
            {contact.notes}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
              tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.icon} {t.label}
            {t.count !== undefined && <span className="bg-slate-100 text-slate-600 px-1.5 rounded text-xs">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {tab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex gap-2 bg-white border rounded-lg p-4">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note to the timeline..."
              className={`${inputClass} flex-1`} onKeyDown={(e) => e.key === 'Enter' && addNote()} />
            <button onClick={addNote} className={btnPrimary}>Add Note</button>
          </div>
          <div className="bg-white border rounded-lg divide-y">
            {contact.timeline.map((a) => (
              <div key={a.id} className="flex gap-4 p-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <History className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <p className="font-medium text-slate-800">{a.title}</p>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {activityTypeLabels[a.type] ?? a.type}
                    </span>
                  </div>
                  {a.description && <p className="text-sm text-slate-600 mt-1">{a.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDateTime(a.created_at)}
                    {a.performed_by && ` · by ${a.performed_by}`}
                  </p>
                </div>
              </div>
            ))}
            {contact.timeline.length === 0 && <p className="p-8 text-center text-slate-400">No activity recorded yet</p>}
          </div>
        </div>
      )}

      {/* Memberships */}
      {tab === 'memberships' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => {
              setEditingMembership(null);
              setMembershipForm({
                type: 'community',
                status: 'active',
                start_date: '',
                renewal_date: '',
                expiry_date: '',
                payment_status: 'paid',
                amount: '',
                notes: '',
              });
              setShowMembershipForm(true);
            }} className={`${btnPrimary} flex items-center gap-1`}>
              <Add className="w-4 h-4" /> Add Membership
            </button>
          </div>
          <div className="grid gap-4">
            {contact.memberships.map((m) => (
              <div key={m.id} className="bg-white border rounded-lg p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-lg">{formatMembershipType(m.type)}</h4>
                    {options ? (
                      <select
                        value={m.status}
                        onChange={(e) => void updateMembershipStatus(m, e.target.value)}
                        className={`${inputClass} mt-2 py-1.5 text-xs capitalize min-w-[110px]`}
                      >
                        {options.membership_statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <StatusBadge value={m.status} />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditMembership(m)} className="text-blue-600 text-sm">Edit</button>
                    <button onClick={() => deleteMembership(m.id)} className={btnDanger}>Remove</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div><p className="text-slate-500">Start</p><p className="font-medium">{formatDate(m.start_date)}</p></div>
                  <div><p className="text-slate-500">Renewal</p><p className="font-medium">{formatDate(m.renewal_date)}</p></div>
                  <div><p className="text-slate-500">Expiry</p><p className="font-medium">{formatDate(m.expiry_date)}</p></div>
                  <div><p className="text-slate-500">Payment</p><p className="font-medium capitalize">{m.payment_status} · £{m.amount ?? 0}</p></div>
                </div>
                {m.notes && <p className="text-sm text-slate-600 mt-3 border-t pt-3">{m.notes}</p>}
              </div>
            ))}
            {contact.memberships.length === 0 && <p className="text-center py-12 text-slate-400 bg-white border rounded-lg">No memberships assigned</p>}
          </div>
        </div>
      )}

      {/* Courses */}
      {tab === 'courses' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditingCourse(null); setShowCourseForm(true); }} className={`${btnPrimary} flex items-center gap-1`}>
              <Add className="w-4 h-4" /> Add Course Purchase
            </button>
          </div>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Course</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Purchase Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Certificate</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Amount</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {contact.courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.course_title}</td>
                    <td className="px-4 py-3">{formatDate(c.purchase_date)}</td>
                    <td className="px-4 py-3"><StatusBadge value={c.completion_status} /></td>
                    <td className="px-4 py-3">{c.certificate_issued ? '✓ Issued' : '—'}</td>
                    <td className="px-4 py-3">£{c.amount_paid ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditCourse(c)} className="text-blue-600 text-sm mr-2">Edit</button>
                      <button onClick={async () => {
                        if (confirm('Remove course record?')) {
                          await crmService.deleteCourse(contactId, c.id);
                          load();
                          toast.success('Removed');
                        }
                      }} className={btnDanger}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contact.courses.length === 0 && <p className="text-center py-12 text-slate-400">No courses purchased</p>}
          </div>
        </div>
      )}

      {/* Webinars */}
      {tab === 'webinars' && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Webinar</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Registered</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contact.webinar_registrations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.webinar_title}</td>
                  <td className="px-4 py-3">{formatDateTime(r.registered_at)}</td>
                  <td className="px-4 py-3"><StatusBadge value={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.attended ? <span className="text-green-600">Attended</span> : r.no_show ? <span className="text-red-600">No show</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contact.webinar_registrations.length === 0 && <p className="text-center py-12 text-slate-400">No webinar registrations</p>}
        </div>
      )}

      {/* Events */}
      {tab === 'events' && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Registered</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contact.event_registrations.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.event_title}</td>
                  <td className="px-4 py-3">{formatDateTime(r.registered_at)}</td>
                  <td className="px-4 py-3">
                    {r.attended ? <span className="text-green-600">Attended</span> : r.no_show ? <span className="text-red-600">No show</span> : 'Registered'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contact.event_registrations.length === 0 && <p className="text-center py-12 text-slate-400">No event registrations</p>}
        </div>
      )}

      {showEdit && (
        <ContactFormModal contact={contact} options={options} onClose={() => setShowEdit(false)} onSaved={load} />
      )}

      {showMembershipForm && (
        <Modal title={editingMembership ? 'Edit Membership' : 'Add Membership'} onClose={() => setShowMembershipForm(false)}>
          <form onSubmit={saveMembership} className="space-y-4">
            <Field label="Type">
              <select value={membershipForm.type} onChange={(e) => setMembershipForm({ ...membershipForm, type: e.target.value })}
                className={inputClass} disabled={!!editingMembership}>
                {options.membership_types.map((t) => <option key={t} value={t}>{formatMembershipType(t)}</option>)}
              </select>
            </Field>
            {editingMembership ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                  <select value={membershipForm.status} onChange={(e) => setMembershipForm({ ...membershipForm, status: e.target.value })} className={inputClass}>
                    {options.membership_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Payment Status">
                  <select value={membershipForm.payment_status} onChange={(e) => setMembershipForm({ ...membershipForm, payment_status: e.target.value })} className={inputClass}>
                    {options.payment_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
            ) : (
              <>
                <Field label="Payment Status">
                  <select value={membershipForm.payment_status} onChange={(e) => setMembershipForm({ ...membershipForm, payment_status: e.target.value })} className={inputClass}>
                    {options.payment_statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <p className="text-xs text-slate-500">
                  Status is set automatically: <strong>active</strong> when paid, <strong>pending</strong> otherwise.
                  Update it from the memberships list after creation.
                </p>
              </>
            )}
            <div className="grid grid-cols-3 gap-4">
              <Field label="Start Date"><input type="date" value={membershipForm.start_date} onChange={(e) => setMembershipForm({ ...membershipForm, start_date: e.target.value })} className={inputClass} /></Field>
              <Field label="Renewal Date"><input type="date" value={membershipForm.renewal_date} onChange={(e) => setMembershipForm({ ...membershipForm, renewal_date: e.target.value })} className={inputClass} /></Field>
              <Field label="Expiry Date"><input type="date" value={membershipForm.expiry_date} onChange={(e) => setMembershipForm({ ...membershipForm, expiry_date: e.target.value })} className={inputClass} /></Field>
            </div>
            <Field label="Amount (£)"><input type="number" step="0.01" value={membershipForm.amount} onChange={(e) => setMembershipForm({ ...membershipForm, amount: e.target.value })} className={inputClass} /></Field>
            <Field label="Notes"><textarea value={membershipForm.notes} onChange={(e) => setMembershipForm({ ...membershipForm, notes: e.target.value })} className={inputClass} rows={2} /></Field>
            <div className="flex gap-3">
              <button type="submit" className={`${btnPrimary} flex-1`}>Save Membership</button>
              <button type="button" onClick={() => setShowMembershipForm(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {showCourseForm && (
        <Modal title={editingCourse ? 'Edit Course' : 'Add Course Purchase'} onClose={() => setShowCourseForm(false)}>
          <form onSubmit={saveCourse} className="space-y-4">
            {!editingCourse && (
              <Field label="Course">
                <select required value={courseForm.course_id} onChange={(e) => setCourseForm({ ...courseForm, course_id: e.target.value })} className={inputClass}>
                  <option value="">Select course...</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Purchase Date"><input type="date" value={courseForm.purchase_date} onChange={(e) => setCourseForm({ ...courseForm, purchase_date: e.target.value })} className={inputClass} /></Field>
              <Field label="Amount (£)"><input type="number" step="0.01" value={courseForm.amount_paid} onChange={(e) => setCourseForm({ ...courseForm, amount_paid: e.target.value })} className={inputClass} /></Field>
            </div>
            <Field label="Completion Status">
              <select value={courseForm.completion_status} onChange={(e) => setCourseForm({ ...courseForm, completion_status: e.target.value })} className={inputClass}>
                {options.course_statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            {editingCourse && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={courseForm.certificate_issued}
                  onChange={(e) => setCourseForm({ ...courseForm, certificate_issued: e.target.checked })} />
                Certificate issued
              </label>
            )}
            <div className="flex gap-3">
              <button type="submit" className={`${btnPrimary} flex-1`}>Save</button>
              <button type="button" onClick={() => setShowCourseForm(false)} className={btnSecondary}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </CrmLayout>
  );
};

export default ContactDetailView;
