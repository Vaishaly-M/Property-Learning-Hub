// components/auth/LoginForm.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, HelpCircle } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { SupportModal } from "./SupportModal";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    token: string;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      role: "admin" | "instructor" | "learner";
      status: string;
      profile_completed?: boolean;
      free_invite_pending?: boolean;
      permissions?: string[];
    };
    redirect_to?: string;
    free_invite_pending?: boolean;
  };
}

const LoginForm = () => {
  const { login } = useAdminAuth();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append("email", formData.email);
      payload.append("password", formData.password);

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: payload,
      });

      let data: LoginResponse;
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid server response");
      }

      if (response.ok && data.success && data.data?.token && data.data?.user) {
        login(data.data.token, data.data.user, false, data.data.redirect_to);
        return;
      }

      if (response.status === 429) {
        setError("Too many login attempts. Please try again later.");
      } else if (
        response.status === 403 &&
        (data as any).email_verification_required
      ) {
        setError(data.message || "Please verify your email before logging in.");
        setTimeout(() => router.push("/verify-email"), 2000);
      } else if (response.status === 403) {
        setError(
          data.message || "Your account is not active. Please contact support.",
        );
      } else if (response.status === 422) {
        setError(data.message || "Please check your email and password.");
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect to server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.email.trim() !== "" && formData.password.trim() !== "";

  return (
    <>
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          {/* Email — added id="login-email" */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-blue-900"
            >
              Email Address
            </label>
            <div className="group relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Mail className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-900" />
              </div>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password — added id="login-password" */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-blue-900"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-900 transition-colors hover:text-blue-800"
              >
                Forgot password?
              </Link>
            </div>
            <div className="group relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Lock className="h-5 w-5 text-gray-400 transition-colors group-focus-within:text-blue-900" />
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-10 text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-blue-900"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Submit — added id="login-submit" */}
        <button
          id="login-submit"
          type="submit"
          disabled={loading || !isFormValid}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3.5 font-semibold text-white transition-all duration-300 hover:from-blue-800 hover:to-blue-700 hover:shadow-lg active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="h-5 w-5" />
              <span>Sign In</span>
            </>
          )}
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-500">
              Don&apos;t have an account?
            </span>
          </div>
        </div>

        {/* Sign up link — added id="login-signup" */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Link
            id="login-signup"
            href="/agreement?next=payment"
            className="group inline-flex items-center gap-2 text-base font-medium text-blue-900 transition-colors hover:text-blue-800"
          >
            <UserPlus className="h-5 w-5" />
            <span>Create new account</span>
            <svg
              className="h-5 w-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => setIsSupportModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-900 hover:underline"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Having trouble logging in? Contact Support</span>
          </button>
        </div>
      </form>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        defaultCategory="login_issue"
        defaultEmail={formData.email}
      />
    </>
  );
};

export default LoginForm;