//app/login/page.tsx
"use client";

import LoginForm from "../../components/auth/LoginForm";
import AuthLayout from "../../components/auth/AuthLayout";
import { loginSteps } from "@/tours/loginSteps";
import { TourButton } from "@/components/onbording/tourButton";

export default function LoginPage() {
  return (
    <>
      <AuthLayout
        title="Welcome Back"
        subtitle="Sign in to access your dashboard"
      >
        <LoginForm />
      </AuthLayout>

      {/* Floating tour button */}
      <TourButton steps={loginSteps} />
    </>
  );
}
