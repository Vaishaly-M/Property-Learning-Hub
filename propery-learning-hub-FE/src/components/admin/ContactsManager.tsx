'use client';

import { useEffect, useMemo, useState } from 'react';
import { Add, Save, Search } from '@mui/icons-material';
import toast from 'react-hot-toast';
import crmService, { Contact, CrmContact, CrmContactDetail } from '../../services/crmService';

const EMPTY_CONTACT: Partial<Contact> = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company: '',
  source: '',
  classification: 'enquiries',
  membership_status: 'none',
  status: 'active',
  notes: '',
};

function mapCrmListItem(c: CrmContact): Contact {
  return {
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone_number,
    company: '',
    source: '',
    classification: c.classifications?.[0] || 'enquiries',
    membership_status: c.active_memberships?.[0] || 'none',
    status: c.status,
    notes: c.notes,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

function mapCrmDetail(data: CrmContactDetail): Contact {
  return {
    ...mapCrmListItem(data),
    timeline: data.timeline,
  };
}

export default function ContactsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<Partial<Contact>>(EMPTY_CONTACT);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await crmService.getContacts({ search, per_page: 50 });
      setContacts((res.data || []).map(mapCrmListItem));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const loadContact = async (id: number) => {
    try {
      const data = await crmService.getContact(id);
      const mapped = mapCrmDetail(data);
      setSelectedContact(mapped);
      setForm({
        first_name: mapped.first_name,
        last_name: mapped.last_name || '',
        email: mapped.email || '',
        phone: mapped.phone || '',
        company: mapped.company || '',
        source: mapped.source || '',
        classification: mapped.classification,
        membership_status: mapped.membership_status,
        status: mapped.status,
        notes: mapped.notes || '',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load contact');
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadContacts(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (selectedContactId) {
      loadContact(selectedContactId);
    } else {
      setSelectedContact(null);
      setForm(EMPTY_CONTACT);
    }
  }, [selectedContactId]);

  const isCreateMode = useMemo(() => selectedContactId === null, [selectedContactId]);

  const handleSave = async () => {
    if (!form.first_name?.trim()) {
      toast.error('First name is required');
      return;
    }

    setSaving(true);
    try {
      const status: 'active' | 'inactive' | 'archived' =
        form.status === 'inactive' || form.status === 'archived' ? form.status : 'active';
      const payload: Partial<CrmContact> & { classifications?: string[] } = {
        first_name: form.first_name,
        last_name: form.last_name || '',
        email: form.email || null,
        phone_number: form.phone || null,
        notes: form.notes || null,
        status,
        classifications: form.classification ? [form.classification] : undefined,
      };

      if (isCreateMode) {
        const created = await crmService.createContact(payload);
        toast.success('Contact created');
        setSelectedContactId(created.id);
      } else if (selectedContactId) {
        await crmService.updateContact(selectedContactId, payload);
        toast.success('Contact updated');
      }
      await loadContacts();
      if (selectedContactId) {
        await loadContact(selectedContactId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof Contact, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-xl overflow-hidden flex">
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Contacts</h2>
            <button
              onClick={() => setSelectedContactId(null)}
              className="p-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800"
              title="New contact"
            >
              <Add fontSize="small" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2 text-slate-400" fontSize="small" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-400 p-4">Loading...</p>
          ) : contacts.length === 0 ? (
            <p className="text-sm text-slate-400 p-4">No contacts found</p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedContactId(c.id)}
                className={`w-full text-left p-3 border-b border-slate-100 hover:bg-slate-50 ${
                  selectedContactId === c.id ? 'bg-blue-50 border-l-4 border-l-blue-900' : ''
                }`}
              >
                <p className="text-sm font-semibold text-slate-800">
                  {`${c.first_name} ${c.last_name || ''}`.trim()}
                </p>
                <p className="text-xs text-slate-500 truncate">{c.email || c.phone || 'No email/phone'}</p>
                <p className="text-[10px] uppercase tracking-wide text-blue-700 mt-1">{c.classification}</p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {isCreateMode ? 'Create Contact' : 'Contact Details'}
          </h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-900 text-white rounded-lg disabled:opacity-50"
          >
            <Save sx={{ fontSize: 16 }} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="First name" value={form.first_name || ''} onChange={(e) => updateField('first_name', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Last name" value={form.last_name || ''} onChange={(e) => updateField('last_name', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Email" value={form.email || ''} onChange={(e) => updateField('email', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Phone" value={form.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Company" value={form.company || ''} onChange={(e) => updateField('company', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Source" value={form.source || ''} onChange={(e) => updateField('source', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Classification" value={form.classification || ''} onChange={(e) => updateField('classification', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Membership status" value={form.membership_status || ''} onChange={(e) => updateField('membership_status', e.target.value)} />
              <input className="px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Status" value={form.status || ''} onChange={(e) => updateField('status', e.target.value)} />
            </div>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={4}
              placeholder="Notes"
              value={form.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Activity Timeline</h4>
            {!selectedContact?.timeline?.length ? (
              <p className="text-xs text-slate-500">No activity yet.</p>
            ) : (
              <div className="space-y-3 max-h-[28rem] overflow-y-auto">
                {selectedContact.timeline.map((item) => (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-2">
                    <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                    {item.description && <p className="text-xs text-slate-600 mt-1">{item.description}</p>}
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
