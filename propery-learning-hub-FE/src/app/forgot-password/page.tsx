// app/forgot-password/page.tsx
'use client';

import AuthLayout from '../../components/auth/AuthLayout';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="We'll send you a link to reset your password"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}