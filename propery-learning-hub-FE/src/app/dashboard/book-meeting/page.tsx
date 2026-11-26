'use client';

import Link from 'next/link';
import MeetingBookingForm from '../../../components/meetings/MeetingBookingForm';
import { useAdminAuth } from '../../../context/AdminAuthContext';

export default function BookMeetingDashboardPage() {
  const { admin } = useAdminAuth();

  const currentUser = admin
    ? {
        name: `${admin.first_name} ${admin.last_name}`.trim() || admin.email,
        email: admin.email,
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <Link href="/dashboard/my-meetings" className="text-sm text-blue-900 hover:underline">
          ← My meetings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Book a Meeting</h1>
        <p className="text-slate-600">Schedule a session with the platform admin via Microsoft Teams or Zoom.</p>
      </div>

      <MeetingBookingForm
        variant="authenticated"
        currentUser={currentUser}
        successPath="/dashboard/my-meetings"
      />
    </div>
  );
}
