'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import TrainingAgreementForm from '@/components/agreements/TrainingAgreementForm';

export default function AgreementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <TrainingAgreementForm />
    </Suspense>
  );
}
