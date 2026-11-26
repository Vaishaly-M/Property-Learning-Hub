'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Completing Microsoft connection...');

  useEffect(() => {
    const connected = searchParams.get('connected');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      setMessage(decodeURIComponent(error));
      return;
    }

    if (connected === '1') {
      setMessage(
        email
          ? `Microsoft account ${decodeURIComponent(email)} connected successfully!`
          : 'Microsoft account connected successfully!'
      );
      setTimeout(() => router.replace('/instructor/calendar'), 2500);
    }
  }, [searchParams, router]);

  const isError = searchParams.get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border p-8 text-center">
        {isError ? (
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
        ) : (
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        )}
        <h1 className="text-xl font-bold text-slate-900 mb-2">Microsoft Connection</h1>
        <p className="text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export default function MicrosoftCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
