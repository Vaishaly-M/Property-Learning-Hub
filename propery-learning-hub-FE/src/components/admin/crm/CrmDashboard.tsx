'use client';

import React, { useEffect, useState } from 'react';
import {
  People, CardMembership, TrendingUp, Videocam, Event, Email, Refresh, Add,
  PersonSearch, Download,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import CrmLayout from './CrmLayout';
import crmService, { type CrmDashboard as CrmDashboardData } from '../../../services/crmService';
import {
  StatCard, Loading, formatClassification, formatMembershipType, activityTypeLabels, btnPrimary,
} from './crmShared';

const CrmDashboard: React.FC = () => {
  const [data, setData] = useState<CrmDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30days');

  const load = async () => {
    setLoading(true);
    try {
      setData(await crmService.getDashboard(range));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [range]);

  const handleExport = async (type: string, format: 'csv' | 'pdf') => {
    try {
      await crmService.exportReport(type, format, range);
      toast.success(`${format.toUpperCase()} export started`);
    } catch {
      toast.error('Export failed');
    }
  };

  if (loading || !data) {
    return <CrmLayout pageTitle="Dashboard"><Loading /></CrmLayout>;
  }

  const { membership_metrics: m, sales_metrics: s, engagement_metrics: e, lead_metrics: l } = data;

  return (
    <CrmLayout
      pageTitle="Dashboard & Reports"
      actions={
        <div className="flex gap-2 items-center">
          <select value={range} onChange={(ev) => setRange(ev.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
            <option value="1year">Last year</option>
          </select>
          <button onClick={load} className="p-2 text-slate-500 hover:text-blue-600 border rounded-lg"><Refresh className="w-5 h-5" /></button>
          <button onClick={() => handleExport('dashboard', 'csv')} className="border rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:bg-slate-50">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => handleExport('dashboard', 'pdf')} className="border rounded-lg px-3 py-2 text-sm flex items-center gap-1 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Report
          </button>
        </div>
      }
    >
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a href="/admin/crm/contacts" className={`${btnPrimary} flex items-center gap-2`}><Add className="w-4 h-4" /> New Contact</a>
        <a href="/admin/crm/communications" className="border border-slate-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50">
          <Email className="w-4 h-4" /> Send Communication
        </a>
        <a href="/admin/crm/webinars" className="border border-slate-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50">
          <Videocam className="w-4 h-4" /> Manage Webinars
        </a>
        <a href="/admin/crm/events" className="border border-slate-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50">
          <Event className="w-4 h-4" /> Manage Events
        </a>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Contacts" value={m.total_contacts} icon={<People />} href="/admin/crm/contacts" />
        <StatCard label="Active Members" value={m.active_members} icon={<CardMembership />} href="/admin/crm/memberships" sub={`${m.expired_members} expired`} />
        <StatCard label="Total Revenue" value={`£${s.total_revenue.toLocaleString()}`} icon={<TrendingUp />} sub={`${s.course_sales} course sales`} href="/admin/crm/courses" />
        <StatCard label="Total Leads" value={l.total_leads} icon={<PersonSearch />} sub={`${l.lead_conversion_rate}% conversion · ${l.new_leads_period} new`} />
      </div>

      {/* Membership metrics */}
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Membership Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Members" value={m.active_members} icon={<CardMembership />} />
        <StatCard label="Expired Members" value={m.expired_members} icon={<CardMembership />} />
        <StatCard label="Pending" value={m.pending_members} icon={<CardMembership />} />
        <StatCard label="Community" value={m.by_type.community ?? 0} icon={<CardMembership />} />
        <StatCard label="VIP Mentorship" value={m.by_type.vip_mentorship ?? 0} icon={<CardMembership />} />
      </div>

      {/* Sales + Engagement + Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Sales Metrics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Course Sales</span><span className="font-bold">{s.course_sales}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Course Revenue</span><span className="font-bold">£{s.course_revenue.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Membership Revenue</span><span className="font-bold">£{s.membership_revenue.toLocaleString()}</span></div>
            <div className="flex justify-between border-t pt-3"><span className="text-slate-800 font-medium">Total Revenue</span><span className="font-bold text-green-600">£{s.total_revenue.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Videocam className="w-4 h-4" /> Engagement Metrics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Webinar Registrations</span><span className="font-bold">{e.webinar_registrations}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Webinar Attendance</span><span className="font-bold">{e.webinar_attendance}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Event Registrations</span><span className="font-bold">{e.event_registrations}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Event Attendance</span><span className="font-bold">{e.event_attendance}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Upcoming Webinars</span><span className="font-bold">{e.upcoming_webinars}</span></div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><PersonSearch className="w-4 h-4" /> Lead Metrics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Total Leads</span><span className="font-bold">{l.total_leads}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Conversion Rate</span><span className="font-bold">{l.lead_conversion_rate}%</span></div>
            <div className="flex justify-between"><span className="text-slate-600">New Leads (period)</span><span className="font-bold">{l.new_leads_period}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Discovery Calls</span><span className="font-bold">{l.discovery_calls_booked}</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classifications */}
        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Classification Breakdown</h3>
          <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {Object.entries(data.classification_breakdown).map(([cls, count]) => (
              <div key={cls} className="flex justify-between items-center">
                <span className="text-slate-600">{formatClassification(cls)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (count / m.total_contacts) * 100)}%` }} />
                  </div>
                  <span className="font-medium w-6 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(data.classification_breakdown).length === 0 && <p className="text-slate-400">No data</p>}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.recent_activity.map((a) => (
              <div key={a.id} className="text-sm border-b border-slate-100 pb-3 last:border-0">
                <p className="font-medium text-slate-700">{a.title}</p>
                <p className="text-slate-500">{a.contact_name} · {a.contact_ref}</p>
                <p className="text-xs text-slate-400">{activityTypeLabels[a.type] ?? a.type} · {new Date(a.created_at).toLocaleString()}</p>
              </div>
            ))}
            {data.recent_activity.length === 0 && <p className="text-slate-400">No activity</p>}
          </div>
        </div>

        {/* Renewals due */}
        <div className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Renewals Due (30 days)</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.renewals_due.map((r) => (
              <div key={r.membership_id} className="flex justify-between items-center text-sm border-b border-slate-100 pb-3 last:border-0">
                <div>
                  <a href={`/admin/crm/contacts/${r.contact.id}`} className="font-medium text-blue-600 hover:underline">{r.contact.name}</a>
                  <p className="text-slate-500">{formatMembershipType(r.type)}</p>
                </div>
                <span className="text-amber-600 font-medium text-xs">{r.renewal_date}</span>
              </div>
            ))}
            {data.renewals_due.length === 0 && <p className="text-slate-400 text-sm">No renewals due</p>}
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default CrmDashboard;
