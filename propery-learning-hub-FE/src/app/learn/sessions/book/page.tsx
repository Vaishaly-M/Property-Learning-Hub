'use client';

import { useAdminAuth } from '../../../../context/AdminAuthContext';
import BookingForm from '../../../../components/microsoft/BookingForm';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function LearnerBookSessionPage() {
  const { admin } = useAdminAuth();
  const router = useRouter();
  const [mentorId, setMentorId] = useState('');

  if (!admin) return null;

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div>
        <Link href="/learn/sessions" className="text-sm text-blue-900 hover:underline">
          ← Back to sessions
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Book a Mentor Session</h1>
        <p className="text-slate-600 mt-1">
          Select an available slot to schedule a Microsoft Teams session with your mentor.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Mentor User ID</label>
        <input
          type="number"
          value={mentorId}
          onChange={(e) => setMentorId(e.target.value)}
          placeholder="Enter mentor user ID"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          required
        />
      </div>

      {mentorId && (
        <BookingForm
          mentorId={Number(mentorId)}
          studentId={Number(admin.id)}
          onSuccess={() => router.push('/learn/sessions')}
        />
      )}
    </div>
  );
}
