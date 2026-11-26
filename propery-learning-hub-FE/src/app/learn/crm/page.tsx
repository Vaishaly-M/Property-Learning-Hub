'use client';

import { PeopleAlt } from '@mui/icons-material';
import Link from 'next/link';

export default function LearnerCrmComingSoonPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-slate-200 bg-white shadow-sm px-8 py-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <PeopleAlt />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">CRM</h1>
        <p className="text-slate-600 mb-6">Coming soon</p>
        <Link
          href="/learn/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
