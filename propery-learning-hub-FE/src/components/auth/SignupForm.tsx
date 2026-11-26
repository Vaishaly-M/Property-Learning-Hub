// app/components/SignupFormCompact.tsx
"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, HelpCircle } from "lucide-react";
import { SupportModal } from "./SupportModal";
import {
  AGREEMENT_EMAIL_KEY,
  AGREEMENT_NAME_KEY,
  AGREEMENT_PHONE_KEY,
  AGREEMENT_TOKEN_KEY,
  parsePhoneForCheckout,
  splitFullName,
  trainingAgreementService,
} from "@/services/trainingAgreementService";
import freeInviteService from "@/services/freeInviteService";

interface CountryCode {
  code: string;
  country: string;
}

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
  role: "learner";
}

const countryCodes: CountryCode[] = [
  { code: "+1", country: "USA/Canada" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "India" },
  { code: "+94", country: "Sri Lanka" },
  { code: "+61", country: "Australia" },
  { code: "+971", country: "UAE" },
  { code: "+966", country: "Saudi Arabia" },
];

const SignupForm: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    countryCode: "+44",
    password: "",
    confirmPassword: "",
    role: "learner",
  });

  const [errors, setErrors] = useState<Partial<SignupFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [apiResponse, setApiResponse] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [agreementReady, setAgreementReady] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false);
  const [agreementPhoneLocked, setAgreementPhoneLocked] = useState(false);
  const [agreementPhoneRaw, setAgreementPhoneRaw] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(AGREEMENT_TOKEN_KEY);
    if (!token) {
      router.replace("/agreement?next=signup");
      return;
    }

    const agreementEmail = sessionStorage.getItem(AGREEMENT_EMAIL_KEY);
    const storedInviteToken = freeInviteService.getInviteToken();
    const storedInviteEmail = freeInviteService.getInviteEmail();
    const isOpenInvite = freeInviteService.isOpenInvite();
    if (storedInviteToken && (storedInviteEmail || isOpenInvite)) {
      setInviteToken(storedInviteToken);
      setInviteEmailLocked(Boolean(storedInviteEmail) && !isOpenInvite);
      const emailToUse = storedInviteEmail || agreementEmail;
      if (emailToUse) {
        setFormData((prev) => ({ ...prev, email: emailToUse }));
      }
    } else if (agreementEmail) {
      setFormData((prev) => ({ ...prev, email: agreementEmail }));
    }

    const agreementName = sessionStorage.getItem(AGREEMENT_NAME_KEY);
    const sessionPhone = sessionStorage.getItem(AGREEMENT_PHONE_KEY);

    const applyPhone = (rawPhone: string) => {
      setAgreementPhoneRaw(rawPhone);
      setAgreementPhoneLocked(true);
      const { countryCode, phoneNumber } = parsePhoneForCheckout(rawPhone);
      setFormData((prev) => ({
        ...prev,
        countryCode: countryCode || prev.countryCode,
        phoneNumber: phoneNumber || prev.phoneNumber,
      }));
    };

    if (agreementName) {
      const { firstName, lastName } = splitFullName(agreementName);
      setFormData((prev) => ({
        ...prev,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
      }));
    }

    if (sessionPhone) {
      applyPhone(sessionPhone);
    }

    // Always re-load phone from the signed agreement so signup cannot drift from storage.
    trainingAgreementService
      .getByToken(token)
      .then((agreement) => {
        if (agreement.client_phone) {
          sessionStorage.setItem(AGREEMENT_PHONE_KEY, agreement.client_phone);
          applyPhone(agreement.client_phone);
        }
        if (agreement.client_full_name) {
          const { firstName, lastName } = splitFullName(agreement.client_full_name);
          setFormData((prev) => ({
            ...prev,
            firstName: firstName || prev.firstName,
            lastName: lastName || prev.lastName,
          }));
        }
      })
      .catch(() => {
        /* session values already applied */
      })
      .finally(() => setAgreementReady(true));
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name as keyof SignupFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "Required";
    if (!formData.lastName.trim()) newErrors.lastName = "Required";
    if (!formData.email.trim()) {
      newErrors.email = "Required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email";
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Required";
    } else if (!/^\d{7,15}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = "7-15 digits";
    }
    if (!formData.password) {
      newErrors.password = "Required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Min 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords mismatch";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setApiResponse(null);

    try {
      const agreementToken = sessionStorage.getItem(AGREEMENT_TOKEN_KEY);
      if (!agreementToken) {
        router.replace("/agreement?next=signup");
        return;
      }

      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        // Always send the exact phone stored on the signed agreement (never re-compose with country code).
        phone_number:
          agreementPhoneRaw ||
          sessionStorage.getItem(AGREEMENT_PHONE_KEY) ||
          `${formData.countryCode}${formData.phoneNumber}`,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
        role: formData.role,
        agreement_token: agreementToken,
        invite_token: inviteToken || undefined,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/register`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      sessionStorage.removeItem(AGREEMENT_TOKEN_KEY);
      sessionStorage.removeItem(AGREEMENT_EMAIL_KEY);

      if (inviteToken || response.data.free_invite_pending) {
        freeInviteService.markRegistrationPending();
      }
      freeInviteService.clearInviteSession();

      setApiResponse({
        type: "success",
        message:
          response.data.message ||
          (response.data.verification_email_sent === false
            ? "Registration successful, but we could not send a verification email. Use resend on the verify email page."
            : "Registration successful! Please check your email to verify your account."),
      });

      const token = response.data.access_token;
      const user = response.data.user;

      // Keep a short-lived token only so "resend verification" works; free-invite
      // users are cleared again after verify and never enter the dashboard.
      if (token) {
        localStorage.setItem("token", token);
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }
      }

      setTimeout(() => {
        router.push("/verify-email");
      }, 2000);

      // Clear form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        countryCode: "+1",
        password: "",
        confirmPassword: "",
        role: "learner",
      });
    } catch (error: any) {
      const backendErrors = error.response?.data?.errors;
      const prioritizedField =
        backendErrors?.email?.[0] ||
        backendErrors?.phone_number?.[0] ||
        backendErrors?.phoneNumber?.[0] ||
        backendErrors?.password?.[0] ||
        backendErrors?.first_name?.[0] ||
        backendErrors?.last_name?.[0];

      if (backendErrors?.email?.[0]) {
        setErrors((prev) => ({ ...prev, email: backendErrors.email[0] }));
      }
      if (backendErrors?.phone_number?.[0]) {
        setErrors((prev) => ({ ...prev, phoneNumber: backendErrors.phone_number[0] }));
      }

      setApiResponse({
        type: "error",
        message:
          prioritizedField ||
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!agreementReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-500">Checking training agreement…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            Join Our Community
          </h1>
          <p className="text-gray-600">
            Create your account to start learning or teaching
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          {apiResponse && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                apiResponse.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{apiResponse.message}</span>
                {apiResponse.type === "success" && (
                  <div className="flex items-center text-sm text-green-600">
                    <svg
                      className="animate-spin h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Redirecting...
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First Name"
                  className={`w-full px-3 py-2.5 text-gray-600 rounded-lg border ${errors.firstName ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent`}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last Name"
                  className={`w-full px-3 py-2.5 text-gray-600 rounded-lg border ${errors.lastName ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent`}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly={inviteEmailLocked}
                onChange={handleChange}
                placeholder="Email Address"
                className={`w-full px-3 py-2.5 text-gray-600 rounded-lg border ${errors.email ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent ${inviteEmailLocked ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {inviteEmailLocked && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                This free invite is locked to {formData.email}.
              </p>
            )}

            {/* Phone */}
            <div className="grid grid-cols-3 gap-3">
              <select
                name="countryCode"
                value={formData.countryCode}
                onChange={handleChange}
                disabled={agreementPhoneLocked}
                className={`px-3 py-2.5 text-gray-600 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                  agreementPhoneLocked ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
              >
                {countryCodes.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.code}
                  </option>
                ))}
              </select>
              <div className="col-span-2">
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  readOnly={agreementPhoneLocked}
                  placeholder="Phone Number"
                  className={`w-full px-3 py-2.5 text-gray-600 rounded-lg border ${
                    errors.phoneNumber ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent ${
                    agreementPhoneLocked ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.phoneNumber}
                  </p>
                )}
              </div>
            </div>
            {agreementPhoneLocked && (
              <p className="text-xs text-slate-600 -mt-1">
                Phone is locked to the number used on your signed agreement.
              </p>
            )}

            {/* Password Fields */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className={`w-full px-3 py-2.5 pr-10 text-gray-600 rounded-lg border ${errors.password ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-900"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  className={`w-full px-3 py-2.5 pr-10 text-gray-600 rounded-lg border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-900"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>

            {/* Terms & Login */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center mb-3">
                By signing up, you agree to our{" "}
                <a
                  href="#"
                  className="text-blue-900 hover:text-blue-700 font-medium"
                >
                  Terms
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-blue-900 hover:text-blue-700 font-medium"
                >
                  Privacy Policy
                </a>
              </p>

              <div className="flex flex-col items-center gap-2.5 mt-2">
                <p className="text-sm text-gray-600 text-center">
                  Already have an account?{" "}
                  <a
                    href="/login"
                    className="text-blue-900 hover:text-blue-700 font-medium"
                  >
                    Sign In
                  </a>
                </p>

                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-900 hover:underline"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Having trouble signing up? Contact Support</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Brand Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Freedom Property Academy
          </p>
        </div>
      </div>

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        defaultCategory="signup_issue"
        defaultEmail={formData.email}
      />
    </div>
  );
};

export default SignupForm;
