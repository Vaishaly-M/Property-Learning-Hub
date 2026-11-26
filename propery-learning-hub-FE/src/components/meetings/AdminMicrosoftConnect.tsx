'use client';

import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

interface MicrosoftStatus {
  connected: boolean;
  ready_for_booking: boolean;
  data: { email: string } | null;
}

export default function AdminMicrosoftConnect() {
  const [status, setStatus] = useState<MicrosoftStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/microsoft/status')
      .then((res) => setStatus(res as unknown as MicrosoftStatus))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !status) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking calendar connection...
      </div>
    );
  }

  if (status.ready_for_booking) {
    return (
      <div className="rounded-xl border border-green-300 bg-green-50 p-4 flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-900">
          <p className="font-semibold">Microsoft calendar ready</p>
          {status.data?.email && (
            <p className="mt-1 text-green-800">Calendar: {status.data.email}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-900">
        <p className="font-semibold">Microsoft calendar not connected</p>
        <p className="mt-1 text-amber-800">
          Meeting bookings that sync with Outlook are unavailable until the calendar is configured.
        </p>
      </div>
    </div>
  );
}
