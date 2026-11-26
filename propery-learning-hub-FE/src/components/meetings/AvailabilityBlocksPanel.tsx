'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import api from '../../services/api';

interface AvailabilityBlock {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

export default function AvailabilityBlocksPanel() {
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .get('/admin/availability-blocks')
      .then((res) => {
        const body = res as unknown as { data: AvailabilityBlock[] };
        setBlocks(body.data);
      })
      .catch(() => toast.error('Failed to load blocked periods.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Start and end dates are required.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/admin/availability-blocks', {
        start_time: `${startDate}T${startTime}:00`,
        end_time: `${endDate}T${endTime}:00`,
        reason: reason || undefined,
      });
      setReason('');
      toast.success('Blocked period added.');
      load();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to add block.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this blocked period?')) return;
    try {
      await api.delete(`/admin/availability-blocks/${id}`);
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Block removed.');
    } catch {
      toast.error('Failed to remove block.');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Blocked Time & Holidays</h2>
        <p className="text-sm text-slate-500 mt-1">
          These periods are excluded from bookable slots alongside Outlook calendar events.
        </p>
      </div>

      <form onSubmit={handleAdd} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">End time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Holiday, travel..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="sm:col-span-2 lg:col-span-5 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Blocked Period'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Loading blocks...</p>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-slate-500">No blocked periods configured.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {blocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {new Date(block.start_time).toLocaleString()} –{' '}
                  {new Date(block.end_time).toLocaleString()}
                </p>
                {block.reason && <p className="text-slate-500 text-xs mt-0.5">{block.reason}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(block.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                aria-label="Remove block"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
