'use client';

import { use } from 'react';
import Link from 'next/link';
import PlatformMeetingDetails from '../../../../components/meetings/PlatformMeetingDetails';

export default function AdminSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link href="/admin/sessions" className="text-sm text-blue-900 hover:underline">
        ← Back to all bookings
      </Link>
      <PlatformMeetingDetails meetingId={Number(id)} backPath="/admin/sessions" />
    </div>
  );
}
