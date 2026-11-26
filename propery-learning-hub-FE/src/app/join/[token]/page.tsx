'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import paidInviteService from '@/services/paidInviteService';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === 'string' ? params.token : '';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.');
      setLoading(false);
      return;
    }

    paidInviteService
      .visit(token)
      .then((data) => {
        paidInviteService.storeInviteSession(token, data.email);
        router.replace('/agreement?next=payment');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Invite link is invalid or expired.');
        setLoading(false);
      });
  }, [token, router]);

  if (loading && !error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-600">Validating your registration invite…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Registration link unavailable</h1>
        <p className="text-slate-600 text-sm mb-6">{error}</p>
        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-700 text-white font-semibold hover:bg-indigo-800"
          >
            <Mail className="w-4 h-4" />
            Log in instead
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-indigo-700">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
