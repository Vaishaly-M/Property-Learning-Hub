'use client';

import { Suspense, use } from 'react';
import SessionDetails from '../../../../components/microsoft/SessionDetails';
import { Loader2 } from 'lucide-react';

function SessionDetailsContent({ sessionId }: { sessionId: number }) {
  return <SessionDetails sessionId={sessionId} />;
}

export default function LearnerSessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading session...
          </div>
        }
      >
        <SessionDetailsContent sessionId={Number(id)} />
      </Suspense>
    </div>
  );
}
