'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import { CheckCircle2, LogIn, Mail, Sparkles } from 'lucide-react';

export default function RegistrationReceivedPage() {
  useEffect(() => {
    // Clear onboarding session leftovers after thank-you; login starts a fresh session
    try {
      localStorage.removeItem('free_registration_pending');
      sessionStorage.removeItem('free_invite_token');
      sessionStorage.removeItem('free_invite_email');
      sessionStorage.removeItem('free_invite_open');
      sessionStorage.removeItem('training_agreement_token');
      sessionStorage.removeItem('training_agreement_email');
      sessionStorage.removeItem('training_agreement_name');
      sessionStorage.removeItem('training_agreement_phone');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1f3a] text-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, #1d4ed8 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, #0ea5e9 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-white/95 text-slate-900 rounded-3xl shadow-2xl border border-white/20 px-6 sm:px-10 py-10 sm:py-12 text-center">
          <div className="flex justify-center mb-8">
            <Image
              src="/landingImages/logo.jpeg"
              alt="Freedom Property Academy"
              width={280}
              height={120}
              className="h-28 sm:h-36 w-auto rounded-xl object-contain bg-white p-3 shadow-sm border border-slate-100"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-800 px-3 py-1 text-xs font-semibold mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Registration complete
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Thank you for registering
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-6 max-w-md mx-auto">
            We have received your registration and verified your email. You can log in now, and we
            will also inform you with further information shortly.
          </p>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 mb-8 space-y-3 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <LogIn className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
              <span>Use the email and password you created to log in to your account.</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <Mail className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
              <span>Please watch your inbox — our team may contact you with next steps.</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>Complete your profile after login to get the most from the academy.</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-800 hover:bg-blue-900 text-white font-semibold px-6 py-3 transition-colors w-full sm:w-auto"
            >
              <LogIn className="w-4 h-4" />
              Log in
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 transition-colors w-full sm:w-auto"
            >
              Back to home
            </Link>
          </div>
        </div>

        <p className="text-center text-sm text-blue-100/70 mt-8">
          Freedom Property Academy — we look forward to welcoming you.
        </p>
      </div>
    </div>
  );
}
