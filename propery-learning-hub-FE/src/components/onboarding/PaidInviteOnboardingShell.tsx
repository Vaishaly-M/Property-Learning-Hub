'use client';

import { ReactNode } from 'react';
import { CheckCircle } from 'lucide-react';
import {
  PAID_INVITE_STEPS,
  usePaidInviteOnboarding,
} from '@/hooks/usePaidInviteOnboarding';

export default function PaidInviteOnboardingShell({
  children,
}: {
  children: ReactNode;
}) {
  const { active, currentIndex } = usePaidInviteOnboarding();

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-3">
            Freedom Property Academy — registration
          </p>
          <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
            {PAID_INVITE_STEPS.map((step, index) => {
              const done = index < currentIndex;
              const current = index === currentIndex;
              return (
                <li key={step.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold border ${
                      done
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : current
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    {done ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                    )}
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </span>
                  {index < PAID_INVITE_STEPS.length - 1 && (
                    <span className="text-slate-300 hidden sm:inline">→</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {children}
    </div>
  );
}
