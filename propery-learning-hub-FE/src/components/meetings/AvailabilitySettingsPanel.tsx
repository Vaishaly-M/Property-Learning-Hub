'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface AvailabilitySettings {
  working_hours_start: string;
  working_hours_end: string;
  lunch_break_start: string | null;
  lunch_break_end: string | null;
  slot_duration: number;
  timezone: string;
  admin_email?: string;
  admin_name?: string;
}

export default function AvailabilitySettingsPanel() {
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/admin/availability-settings')
      .then((res) => {
        const body = res as unknown as { data: AvailabilitySettings };
        setSettings(body.data);
      })
      .catch(() => toast.error('Failed to load availability settings.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !settings) {
    return <p className="text-slate-500 text-sm">Loading availability settings...</p>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = (await api.put('/admin/availability-settings', settings)) as {
        success: boolean;
        data: AvailabilitySettings;
      };
      setSettings(res.data);
      toast.success('Availability settings saved.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Availability Settings</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
          <input
            type="time"
            value={settings.working_hours_start}
            onChange={(e) => setSettings({ ...settings, working_hours_start: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
          <input
            type="time"
            value={settings.working_hours_end}
            onChange={(e) => setSettings({ ...settings, working_hours_end: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slot (min)</label>
          <select
            value={settings.slot_duration}
            onChange={(e) => setSettings({ ...settings, slot_duration: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <input
            type="text"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lunch start</label>
          <input
            type="time"
            value={settings.lunch_break_start ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, lunch_break_start: e.target.value || null })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Lunch end</label>
          <input
            type="time"
            value={settings.lunch_break_end ?? ''}
            onChange={(e) =>
              setSettings({ ...settings, lunch_break_end: e.target.value || null })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
