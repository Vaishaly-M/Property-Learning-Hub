"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mail,
  Phone,
  User,
  AlertCircle,
} from "lucide-react";
import {
  paymentService,
  type VerifyPaymentResponse,
} from "@/services/paymentService";
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
} from "@/services/checkoutDraft";
import {
  AGREEMENT_EMAIL_KEY,
  AGREEMENT_PHONE_KEY,
  AGREEMENT_TOKEN_KEY,
} from "@/services/trainingAgreementService";
import paidInviteService from "@/services/paidInviteService";

interface RegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentIntentId =
    searchParams.get("payment_intent") ||
    searchParams.get("payment_intent_id") ||
    "";

  const [verifying, setVerifying] = useState(true);
  const [payment, setPayment] = useState<VerifyPaymentResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [form, setForm] = useState<RegistrationForm>({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "+44",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<RegistrationForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [paidOnboarding, setPaidOnboarding] = useState(false);

  useEffect(() => {
    setPaidOnboarding(paidInviteService.isOnboarding());
  }, []);

  useEffect(() => {
    if (!paymentIntentId) {
      setVerifyError("Missing payment reference. Please complete payment first.");
      setVerifying(false);
      return;
    }

    const draft = loadCheckoutDraft();

    paymentService
      .verifyPayment(paymentIntentId)
      .then((data) => {
        setPayment(data);

        if (!data.paid) {
          setVerifyError("Payment has not been completed yet.");
          return;
        }

        if (!data.available_for_registration) {
          setVerifyError(
            "This payment has already been used. Please log in to your account.",
          );
          return;
        }

        setForm((prev) => ({
          ...prev,
          firstName: draft.firstName || prev.firstName,
          lastName: draft.lastName || prev.lastName,
          email: data.customer_email || draft.email || prev.email,
          countryCode: draft.countryCode || prev.countryCode,
          phoneNumber: draft.phoneNumber || prev.phoneNumber,
        }));
      })
      .catch(() => {
        setVerifyError("Could not verify your payment. Please contact support.");
      })
      .finally(() => setVerifying(false));
  }, [paymentIntentId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof RegistrationForm]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const errors: Partial<RegistrationForm> = {};

    if (!form.firstName.trim()) errors.firstName = "Required";
    if (!form.lastName.trim()) errors.lastName = "Required";
    if (!form.email.trim()) {
      errors.email = "Required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = "Invalid email";
    }
    if (!form.phoneNumber.trim()) {
      errors.phoneNumber = "Required";
    } else if (!/^\d{7,15}$/.test(form.phoneNumber)) {
      errors.phoneNumber = "Valid phone required";
    }
    if (!form.password) {
      errors.password = "Required";
    } else if (form.password.length < 8) {
      errors.password = "Min 8 characters";
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !paymentIntentId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const agreementToken = sessionStorage.getItem(AGREEMENT_TOKEN_KEY);
      if (!agreementToken) {
        router.replace("/agreement?next=payment");
        return;
      }

      const paidInviteToken = paidInviteService.getInviteToken();

      const response = await paymentService.registerAfterPayment({
        payment_intent_id: paymentIntentId,
        agreement_token: agreementToken,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone_number:
          sessionStorage.getItem(AGREEMENT_PHONE_KEY) ||
          `${form.countryCode}${form.phoneNumber}`,
        password: form.password,
        password_confirmation: form.confirmPassword,
        role: "learner",
        ...(paidInviteToken ? { paid_invite_token: paidInviteToken } : {}),
      });

      clearCheckoutDraft();
      sessionStorage.removeItem(AGREEMENT_TOKEN_KEY);
      sessionStorage.removeItem(AGREEMENT_EMAIL_KEY);
      paidInviteService.clearInviteSession();

      const token = response.access_token;
      const user = response.user;

      if (token) {
        localStorage.setItem("token", token);
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }
      }

      setSuccessMessage(
        response.message ||
          "Account created! Check your email to verify your account and set your password.",
      );

      setTimeout(() => {
        router.push(response.redirect_to || "/verify-email");
      }, 2000);
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      const firstFieldError = apiErr.errors
        ? Object.values(apiErr.errors).flat()[0]
        : null;
      setSubmitError(firstFieldError || apiErr.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <div className="flex flex-col items-center gap-3 text-gray-600 dark:text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p>Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-10 px-4">
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 border border-gray-200 dark:border-gray-800 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Unable to continue
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{verifyError}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/payment"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Back to payment
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {!paidOnboarding && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-4 group"
          >
            <ChevronLeft
              size={18}
              className="group-hover:-translate-x-1 transition-transform"
            />
            Back to Home
          </Link>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-green-800 dark:text-green-200">
                Payment successful
              </h1>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {payment?.formatted_amount
                  ? `Thank you — we received ${payment.formatted_amount}.`
                  : "Thank you for your payment."}{" "}
                A receipt has been sent to your email. Set your login password
                below to finish creating your account.
              </p>
            </div>
          </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {paidOnboarding ? 'Set your password' : 'Step 2 — Set your password'}
            </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Confirm the details from your agreement and create the password
            you&apos;ll use to log in. You can also set it later using the link in
            your confirmation email.
          </p>

          {successMessage && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
              {successMessage}
            </div>
          )}

          {submitError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Name
                </p>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {[form.firstName, form.lastName].filter(Boolean).join(" ") || "—"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Phone
                </p>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>
                    {[form.countryCode, form.phoneNumber].filter(Boolean).join(" ") ||
                      "—"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  readOnly
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none opacity-80"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* password fields continue below - removed old name/phone inputs */}
            <div className="hidden">
              {/* keep form values for submit */}
              <input type="hidden" name="firstName" value={form.firstName} />
              <input type="hidden" name="lastName" value={form.lastName} />
              <input type="hidden" name="countryCode" value={form.countryCode} />
              <input type="hidden" name="phoneNumber" value={form.phoneNumber} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Create password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!successMessage}
              className="w-full py-3.5 font-bold rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:from-green-700 hover:to-green-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create my academy account & set password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
