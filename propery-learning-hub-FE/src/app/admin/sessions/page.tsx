'use client';

import { Suspense } from 'react';
import MeetingsHub from '../../../components/meetings/MeetingsHub';

function MeetingsHubFallback() {
  return (
    <div className="max-w-7xl mx-auto py-12 text-center text-slate-500">
      Loading meetings...
    </div>
  );
}

export default function AdminSessionsPage() {
  return (
    <Suspense fallback={<MeetingsHubFallback />}>
      <MeetingsHub />
    </Suspense>
  );
}
