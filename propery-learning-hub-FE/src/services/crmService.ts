import api from './api';

export interface CrmContact {
  id: number;
  contact_ref: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  notes: string | null;
  status: 'active' | 'inactive' | 'archived';
  classifications: string[];
  active_memberships: string[];
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

/** Legacy/simple contact shape used by ContactsManager + import flows. */
export interface Contact {
  id: number;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  classification: string;
  membership_status: string;
  status: string;
  notes?: string | null;
  custom_fields?: Record<string, unknown>;
  timeline?: TimelineEntry[];
  created_at?: string;
  updated_at?: string;
}

export interface CustomFieldOption {
  id?: number;
  label: string;
  value: string;
  sort_order?: number;
}

export interface CustomField {
  id: number;
  module_name: string;
  field_key: string;
  field_name: string;
  field_type: string;
  required: boolean;
  active: boolean;
  hidden?: boolean;
  sort_order?: number;
  options?: CustomFieldOption[];
}

export interface CrmContactDetail extends CrmContact {
  memberships: Membership[];
  courses: ContactCourse[];
  webinar_registrations: WebinarRegistration[];
  event_registrations: EventRegistration[];
  timeline: TimelineEntry[];
}

export interface Membership {
  id: number;
  type: string;
  status: string;
  start_date: string | null;
  renewal_date: string | null;
  expiry_date: string | null;
  payment_status: string;
  amount: number | null;
  notes: string | null;
  contact?: { id: number; contact_ref: string; full_name: string; email: string | null };
}

export interface CoursePurchaseStats {
  total: number;
  completed: number;
  in_progress: number;
  revenue: number;
}

export interface ContactCourse {
  id: number;
  course_id: number;
  course_title: string | null;
  purchase_date: string;
  completion_status: string;
  certificate_issued: boolean;
  amount_paid: number | null;
  contact?: { id: number; contact_ref: string; full_name: string };
  contact_id?: number;
}

export interface WebinarRegistration {
  id: number;
  webinar_id: number;
  webinar_title: string | null;
  contact_id?: number;
  contact_name?: string;
  contact_email?: string;
  status: string;
  attended: boolean;
  no_show: boolean;
  registered_at: string;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  event_title: string | null;
  contact_id?: number;
  contact_name?: string;
  contact_email?: string;
  attended: boolean;
  no_show: boolean;
  registered_at: string;
}

export interface TimelineEntry {
  id: number;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export interface CrmWebinar {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string;
  duration: number;
  status: string;
  live_link: string | null;
  max_attendees: number;
  price: number;
  presenter: { id: number; name: string } | null;
  platform_registrations: number;
  crm_registrations: number;
  crm_attended: number;
  // Zoom Webinar integration fields
  zoom_webinar_id: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  zoom_uuid: string | null;
  zoom_password: string | null;
  zoom_registration_url: string | null;
}

export interface CrmWebinarDetail {
  webinar: CrmWebinar & Record<string, unknown>;
  crm_registrations: WebinarRegistration[];
}

export interface CrmEvent {
  id: number;
  title: string;
  description: string | null;
  venue: string | null;
  online_link: string | null;
  capacity: number | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  presenter: { id: number; name: string } | null;
  registration_count: number;
  attendance_count: number;
  registrations?: EventRegistration[];
}

export interface Communication {
  id: number;
  type: string;
  subject: string;
  body: string;
  priority?: string;
  category?: string;
  audience_filter: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  read_count?: number;
  created_at: string;
  recipients?: Array<{ id: number; contact_id: number; status: string; contact?: { first_name: string; last_name: string; email: string } }>;
}

export interface CourseOption {
  id: number;
  title: string;
}

export interface CrmDashboard {
  membership_metrics: {
    total_contacts: number;
    active_members: number;
    expired_members: number;
    pending_members: number;
    by_type: Record<string, number>;
  };
  sales_metrics: {
    course_sales: number;
    course_revenue: number;
    membership_revenue: number;
    total_revenue: number;
  };
  engagement_metrics: {
    webinar_registrations: number;
    webinar_attendance: number;
    event_registrations: number;
    event_attendance: number;
    upcoming_webinars: number;
  };
  lead_metrics: {
    total_leads: number;
    lead_conversion_rate: number;
    new_leads_period: number;
    discovery_calls_booked: number;
  };
  classification_breakdown: Record<string, number>;
  recent_activity: Array<{
    id: number;
    type: string;
    title: string;
    contact_name: string;
    contact_ref: string;
    created_at: string;
  }>;
  renewals_due: Array<{
    membership_id: number;
    type: string;
    renewal_date: string;
    contact: { id: number; name: string; email: string; contact_ref: string };
  }>;
}

export interface CrmOptions {
  classifications: string[];
  membership_types: string[];
  membership_statuses: string[];
  payment_statuses: string[];
  course_statuses: string[];
  contact_statuses: string[];
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Presenter {
  id: number;
  name: string;
  email: string;
  role: string;
}

export type DuplicateAction = 'skip' | 'update' | 'merge';

export interface DuplicateResolution {
  row_number: number;
  action: DuplicateAction;
  field_choices?: Record<string, 'existing' | 'incoming'>;
}

export interface ContactImportRow {
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  source?: string | null;
  classification?: string | null;
  membership_status?: string | null;
  status?: string | null;
  notes?: string | null;
  [key: string]: string | number | null | undefined;
}

export interface ImportConflict {
  row_number: number;
  match_by: string;
  existing: ContactImportRow;
  incoming: ContactImportRow;
  diff_fields: string[];
}

export interface ImportAnalysis {
  summary: {
    total: number;
    new: number;
    duplicates: number;
    invalid: number;
  };
  conflicts: ImportConflict[];
  errors: string[];
}

export interface ImportPreview {
  headers: string[];
  sample_rows: unknown[][];
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  merged: number;
  errors: string[];
}

const crmService = {
  async getOptions(): Promise<CrmOptions> {
    const res = await api.get('/admin/crm/options');
    return res.data;
  },

  async getDashboard(range = '30days'): Promise<CrmDashboard> {
    const res = await api.get('/admin/crm/dashboard', { params: { range } });
    return res.data;
  },

  async getCourses(): Promise<CourseOption[]> {
    const res = await api.get('/admin/crm/courses');
    return res.data;
  },

  async getAllMemberships(): Promise<Membership[]> {
    const res = await api.get('/admin/crm/memberships');
    return res.data;
  },

  async getAllCoursePurchases(): Promise<{ purchases: ContactCourse[]; stats: CoursePurchaseStats }> {
    const res = await api.get('/admin/crm/course-purchases') as {
      data: ContactCourse[];
      stats?: CoursePurchaseStats;
    };
    const purchases = res.data ?? [];
    const stats = res.stats ?? {
      total: purchases.length,
      completed: purchases.filter((p) => p.completion_status === 'completed').length,
      in_progress: purchases.filter((p) => p.completion_status === 'in_progress').length,
      revenue: purchases.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0),
    };
    return { purchases, stats };
  },

  async getPresenters(): Promise<Presenter[]> {
    const res = await api.get('/admin/crm/presenters');
    return res.data;
  },

  async exportReport(type: string, format: 'csv' | 'pdf' = 'csv', range = '30days'): Promise<void> {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('token') || localStorage.getItem('auth_token') || sessionStorage.getItem('token'))
      : '';
    const url = `${base}/admin/crm/reports/export?type=${type}&format=${format}&range=${range}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : {},
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm-${type}-${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'html' : 'csv'}`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  async getContacts(params: Record<string, string | number> = {}): Promise<{ data: CrmContact[]; pagination: Pagination }> {
    const res: { data: CrmContact[]; pagination: Pagination } = await api.get('/admin/crm/contacts', { params });
    return { data: res.data, pagination: res.pagination };
  },

  async getContact(id: number): Promise<CrmContactDetail> {
    const res = await api.get(`/admin/crm/contacts/${id}`);
    return res.data;
  },

  async createContact(data: Partial<CrmContact> & { classifications?: string[] }): Promise<CrmContact> {
    const res = await api.post('/admin/crm/contacts', data);
    return res.data;
  },

  async previewImport(file: File): Promise<ImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    const res: any = await api.post('/admin/crm/contacts/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (res?.data ?? res) as ImportPreview;
  },

  async analyzeImport(
    file: File,
    columnMapping: Record<string, string> = {},
  ): Promise<ImportAnalysis> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('column_mapping', JSON.stringify(columnMapping));
    const res: any = await api.post('/admin/crm/contacts/import/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (res?.data ?? res) as ImportAnalysis;
  },

  async importContactsWithMapping(
    file: File,
    updateExisting: boolean,
    columnMapping: Record<string, string> = {},
    duplicateResolutions?: DuplicateResolution[],
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('update_existing', updateExisting ? '1' : '0');
    formData.append('column_mapping', JSON.stringify(columnMapping));
    if (duplicateResolutions?.length) {
      formData.append('duplicate_resolutions', JSON.stringify(duplicateResolutions));
    }
    const res: any = await api.post('/admin/crm/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (res?.data ?? res) as ImportResult;
  },

  async updateContact(id: number, data: Partial<CrmContact> & { classifications?: string[] }): Promise<CrmContact> {
    const res = await api.put(`/admin/crm/contacts/${id}`, data);
    return res.data;
  },

  async deleteContact(id: number): Promise<void> {
    await api.delete(`/admin/crm/contacts/${id}`);
  },

  async addNote(contactId: number, note: string): Promise<void> {
    await api.post(`/admin/crm/contacts/${contactId}/notes`, { note });
  },

  async addMembership(contactId: number, data: Partial<Membership>): Promise<Membership> {
    const res = await api.post(`/admin/crm/contacts/${contactId}/memberships`, data);
    return res.data;
  },

  async updateMembership(contactId: number, membershipId: number, data: Partial<Membership>): Promise<Membership> {
    const res = await api.put(`/admin/crm/contacts/${contactId}/memberships/${membershipId}`, data);
    return res.data;
  },

  async deleteMembership(contactId: number, membershipId: number): Promise<void> {
    await api.delete(`/admin/crm/contacts/${contactId}/memberships/${membershipId}`);
  },

  async addCourse(contactId: number, data: { course_id: number; purchase_date?: string; amount_paid?: number | null; completion_status?: string; certificate_issued?: boolean }): Promise<ContactCourse> {
    const res = await api.post(`/admin/crm/contacts/${contactId}/courses`, data);
    return res.data;
  },

  async updateCourse(
    contactId: number,
    courseRecordId: number,
    data: Partial<ContactCourse> & { amount_paid?: number | null }
  ): Promise<ContactCourse> {
    const res = await api.put(`/admin/crm/contacts/${contactId}/courses/${courseRecordId}`, data);
    return res.data;
  },

  async deleteCourse(contactId: number, courseRecordId: number): Promise<void> {
    await api.delete(`/admin/crm/contacts/${contactId}/courses/${courseRecordId}`);
  },

  async getWebinars(params: Record<string, string | number> = {}): Promise<{ data: CrmWebinar[]; pagination: Pagination }> {
    const res: { data: CrmWebinar[]; pagination: Pagination } = await api.get('/admin/crm/webinars', { params });
    return { data: res.data, pagination: res.pagination };
  },

  async getWebinar(id: number): Promise<CrmWebinarDetail> {
    const res = await api.get(`/admin/crm/webinars/${id}`);
    return res.data;
  },

  async createWebinar(data: Record<string, unknown>): Promise<CrmWebinar> {
    const res = await api.post('/admin/crm/webinars', data);
    return res.data;
  },

  async updateWebinar(id: number, data: Record<string, unknown>): Promise<CrmWebinar> {
    const res = await api.put(`/admin/crm/webinars/${id}`, data);
    return res.data;
  },

  async cancelWebinar(id: number): Promise<void> {
    await api.post(`/admin/crm/webinars/${id}/cancel`);
  },

  async deleteWebinar(id: number): Promise<void> {
    await api.delete(`/admin/crm/webinars/${id}`);
  },

  async registerForWebinar(webinarId: number, contactId: number): Promise<void> {
    await api.post(`/admin/crm/webinars/${webinarId}/register`, { contact_id: contactId });
  },

  async updateWebinarRegistration(webinarId: number, registrationId: number, data: { attended?: boolean; no_show?: boolean; status?: string }): Promise<void> {
    await api.put(`/admin/crm/webinars/${webinarId}/registrations/${registrationId}`, data);
  },

  async getEvents(params: Record<string, string | number> = {}): Promise<{ data: CrmEvent[]; pagination: Pagination }> {
    const res: { data: CrmEvent[]; pagination: Pagination } = await api.get('/admin/crm/events', { params });
    return { data: res.data, pagination: res.pagination };
  },

  async getEvent(id: number): Promise<CrmEvent> {
    const res = await api.get(`/admin/crm/events/${id}`);
    return res.data;
  },

  async createEvent(data: Record<string, unknown>): Promise<CrmEvent> {
    const res = await api.post('/admin/crm/events', data);
    return res.data;
  },

  async updateEvent(id: number, data: Record<string, unknown>): Promise<CrmEvent> {
    const res = await api.put(`/admin/crm/events/${id}`, data);
    return res.data;
  },

  async deleteEvent(id: number): Promise<void> {
    await api.delete(`/admin/crm/events/${id}`);
  },

  async registerForEvent(eventId: number, contactId: number): Promise<void> {
    await api.post(`/admin/crm/events/${eventId}/register`, { contact_id: contactId });
  },

  async updateEventRegistration(eventId: number, registrationId: number, data: { attended?: boolean; no_show?: boolean }): Promise<void> {
    await api.put(`/admin/crm/events/${eventId}/registrations/${registrationId}`, data);
  },

  async getCommunications(params: Record<string, string | number> = {}): Promise<{ data: Communication[]; pagination: Pagination }> {
    const res: { data: Communication[]; pagination: Pagination } = await api.get('/admin/crm/communications', { params });
    return { data: res.data, pagination: res.pagination };
  },

  async getCommunication(id: number): Promise<Communication> {
    const res = await api.get(`/admin/crm/communications/${id}`) as { success?: boolean; data: Communication };
    return res.data ?? (res as unknown as Communication);
  },

  async createCommunication(data: Record<string, unknown>): Promise<Communication> {
    const res = await api.post('/admin/crm/communications', data);
    return res.data;
  },

  async updateCommunication(id: number, data: Record<string, unknown>): Promise<Communication> {
    const res = await api.put(`/admin/crm/communications/${id}`, data);
    return res.data;
  },

  async sendCommunication(id: number): Promise<Communication> {
    const res = await api.post(`/admin/crm/communications/${id}/send`);
    return res.data;
  },

  async cancelCommunication(id: number): Promise<Communication> {
    const res = await api.post(`/admin/crm/communications/${id}/cancel`);
    return res.data;
  },

  async deleteCommunication(id: number): Promise<void> {
    await api.delete(`/admin/crm/communications/${id}`);
  },

  async getCustomFields(moduleName: string): Promise<CustomField[]> {
    const res: any = await api.get('/admin/crm/custom-fields', {
      params: { module_name: moduleName },
    });
    return (res?.data ?? res ?? []) as CustomField[];
  },

  async createCustomField(payload: {
    module_name: string;
    field_name: string;
    field_type: string;
    required?: boolean;
    options?: CustomFieldOption[];
  }): Promise<CustomField> {
    const res: any = await api.post('/admin/crm/custom-fields', payload);
    return (res?.data ?? res) as CustomField;
  },

  async deleteCustomField(fieldId: number): Promise<void> {
    await api.delete(`/admin/crm/custom-fields/${fieldId}`);
  },
};

export const formatClassification = (key: string): string =>
  key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const formatMembershipType = (key: string): string =>
  key === 'vip_mentorship' ? 'VIP Mentorship' : key.charAt(0).toUpperCase() + key.slice(1);

export default crmService;
