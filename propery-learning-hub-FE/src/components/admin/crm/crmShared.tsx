'use client';

import React, { ReactNode } from 'react';
import { Close } from '@mui/icons-material';
import {
  formatClassification,
  formatMembershipType,
  type Pagination,
} from '../../../services/crmService';

export const classificationColors: Record<string, string> = {
  enquiry: 'bg-slate-100 text-slate-700',
  lead: 'bg-blue-100 text-blue-700',
  freesby: 'bg-sky-100 text-sky-800',
  webinar_registrant: 'bg-purple-100 text-purple-700',
  event_registrant: 'bg-indigo-100 text-indigo-700',
  course_customer: 'bg-green-100 text-green-700',
  academy_student: 'bg-teal-100 text-teal-700',
  community_member: 'bg-cyan-100 text-cyan-700',
  aftercare_member: 'bg-amber-100 text-amber-700',
  vip_mentorship_member: 'bg-rose-100 text-rose-700',
  former_member: 'bg-gray-100 text-gray-600',
};

export const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  suspended: 'bg-orange-100 text-orange-700',
  inactive: 'bg-slate-100 text-slate-600',
  archived: 'bg-gray-100 text-gray-500',
  sent: 'bg-green-100 text-green-700',
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  completed: 'bg-teal-100 text-teal-700',
  upcoming: 'bg-blue-100 text-blue-700',
};

export const ClassificationBadge: React.FC<{ value: string }> = ({ value }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-medium ${classificationColors[value] ?? 'bg-slate-100 text-slate-700'}`}>
    {formatClassification(value)}
  </span>
);

export const StatusBadge: React.FC<{ value: string }> = ({ value }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${statusColors[value] ?? 'bg-slate-100 text-slate-600'}`}>
    {value.replace(/_/g, ' ')}
  </span>
);

export const Loading: React.FC = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
);

export const EmptyState: React.FC<{ message: string; action?: ReactNode }> = ({ message, action }) => (
  <div className="text-center py-16 text-slate-400">
    <p className="mb-4">{message}</p>
    {action}
  </div>
);

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><Close /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export const Drawer: React.FC<{
  children: ReactNode;
  onClose: () => void;
}> = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
    <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
      {children}
    </div>
    <button className="absolute inset-0 -z-10" onClick={onClose} aria-label="Close" />
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  href?: string;
}> = ({ label, value, icon, sub, href }) => {
  const inner = (
    <div className="bg-white border border-slate-200 rounded-lg p-5 h-full hover:border-blue-200 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">{icon}</div>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
};

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div>
    <label className="text-xs font-medium text-slate-600">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

export const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
export const btnPrimary = 'bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50';
export const btnSecondary = 'border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm hover:bg-slate-50';
export const btnDanger = 'text-red-600 hover:text-red-800 text-sm font-medium';

export const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
export const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleString('en-GB') : '—';
export { formatClassification, formatMembershipType };

export const activityTypeLabels: Record<string, string> = {
  contact_created: 'Contact Created',
  classification_changed: 'Classification Changed',
  webinar_registered: 'Webinar Registration',
  webinar_attended: 'Webinar Attended',
  webinar_no_show: 'Webinar No Show',
  event_registered: 'Event Registration',
  event_attended: 'Event Attended',
  course_purchased: 'Course Purchased',
  membership_purchased: 'Membership Added',
  membership_renewed: 'Membership Renewed',
  membership_expired: 'Membership Expired',
  payment_received: 'Payment Received',
  coaching_session: 'Coaching Session',
  email_sent: 'Email Sent',
  note_added: 'Note Added',
  status_changed: 'Status Changed',
};

export const PaginationBar: React.FC<{
  pagination: Pagination;
  onPage: (page: number) => void;
  label?: string;
}> = ({ pagination, onPage, label = 'items' }) => {
  if (pagination.last_page <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-slate-500">
      <span>{pagination.total} {label}</span>
      <div className="flex gap-2">
        <button disabled={pagination.current_page <= 1} onClick={() => onPage(pagination.current_page - 1)} className={btnSecondary}>Previous</button>
        <span className="px-3 py-2">Page {pagination.current_page} of {pagination.last_page}</span>
        <button disabled={pagination.current_page >= pagination.last_page} onClick={() => onPage(pagination.current_page + 1)} className={btnSecondary}>Next</button>
      </div>
    </div>
  );
};

export const ContactPicker: React.FC<{
  value: string;
  onChange: (id: string) => void;
  multiple?: boolean;
  selectedIds?: number[];
  onMultipleChange?: (ids: number[]) => void;
}> = ({ value, onChange, multiple, selectedIds = [], onMultipleChange }) => {
  const [search, setSearch] = React.useState('');
  const [contacts, setContacts] = React.useState<Array<{ id: number; full_name: string; contact_ref: string }>>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const crmService = (await import('../../../services/crmService')).default;
        const res = await crmService.getContacts({ search, per_page: 20, page: 1 });
        setContacts(res.data.map((c) => ({ id: c.id, full_name: c.full_name, contact_ref: c.contact_ref })));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  if (multiple && onMultipleChange) {
    return (
      <div className="space-y-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className={inputClass} />
        <div className="max-h-40 overflow-y-auto border rounded-lg divide-y text-sm">
          {loading ? <p className="p-3 text-slate-400">Searching...</p> : contacts.map((c) => (
            <label key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selectedIds.includes(c.id)}
                onChange={(e) => onMultipleChange(e.target.checked ? [...selectedIds, c.id] : selectedIds.filter((id) => id !== c.id))} />
              <span>{c.full_name} <span className="text-slate-400">({c.contact_ref})</span></span>
            </label>
          ))}
        </div>
        {selectedIds.length > 0 && <p className="text-xs text-slate-500">{selectedIds.length} contact(s) selected</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." className={inputClass} />
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Select contact...</option>
        {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.contact_ref})</option>)}
      </select>
      {loading && <p className="text-xs text-slate-400">Searching...</p>}
    </div>
  );
};
