'use client';

import React, { Suspense } from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic'; // Prevent pre-rendering

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Create a strong new password for your account"
    >
      <Suspense fallback={<div>Loading form...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
