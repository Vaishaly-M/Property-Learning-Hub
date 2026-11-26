'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import freeInviteService from '@/services/freeInviteService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

type VerifiedUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: 'admin' | 'instructor' | 'learner';
  status?: string;
  profile_completed?: boolean;
};

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useAdminAuth();
  const [status, setStatus] = useState<'pending' | 'verifying' | 'verified' | 'error'>('pending');
  const [message, setMessage] = useState('Please verify your email address to continue.');
  const [resending, setResending] = useState(false);
  const [redirectTo, setRedirectTo] = useState('/login');

  useEffect(() => {
    const id = searchParams.get('id');
    const hash = searchParams.get('hash');

    if (id && hash) {
      verifyFromLink(id, hash);
    }
  }, [searchParams]);

  const verifyFromLink = async (id: string, hash: string) => {
    setStatus('verifying');
    try {
      const response = await axios.post(`${API_BASE_URL}/email/verify`, { id, hash });
      const nextRedirect = response.data.redirect_to || '/profile/learner';
      setRedirectTo(nextRedirect);
      setStatus('verified');
      setMessage(response.data.message || 'Email verified successfully!');

      freeInviteService.clearInviteSession();
      freeInviteService.clearRegistrationPending();

      if (response.data.access_token && response.data.user) {
        const verifiedUser = response.data.user as VerifiedUser;
        establishSession(
          response.data.access_token,
          {
            ...verifiedUser,
            status: verifiedUser.status ?? 'active',
          },
          true
        );
      }

      setTimeout(() => {
        router.push(nextRedirect);
      }, 2000);
    } catch (error: unknown) {
      setStatus('error');
      const axiosError = error as { response?: { data?: { message?: string } } };
      setMessage(axiosError.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
    }
  };

  const resendEmail = async () => {
    setResending(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (!token) {
        setMessage('Please log in or register again to resend the verification email.');
        setStatus('error');
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/email/verification-notification`,
        {},
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      );
      setMessage(response.data.message || 'Verification email sent.');
      setStatus('pending');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      setMessage(axiosError.response?.data?.message || 'Failed to resend verification email.');
      setStatus('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {status === 'verified' ? (
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        ) : status === 'error' ? (
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        ) : (
          <Mail className="w-16 h-16 text-blue-900 mx-auto mb-4" />
        )}

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'verified' ? 'Email Verified' : 'Verify Your Email'}
        </h1>

        <p className="text-gray-600 mb-6">{message}</p>

        {status === 'verified' && (
          <p className="text-sm text-gray-500 mb-4">
            Redirecting you to continue setup...
          </p>
        )}

        {status === 'verifying' && (
          <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto" />
        )}

        {status !== 'verified' && status !== 'verifying' && (
          <div className="space-y-3">
            <button
              onClick={resendEmail}
              disabled={resending}
              className="w-full py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === 'verified' && (
          <button
            onClick={() => router.push(redirectTo)}
            className="w-full py-3 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
