"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  CreditCard,
  Loader2,
  Mail,
  Phone,
  User,
  AlertCircle,
} from "lucide-react";
import { paymentService, type PaymentConfig } from "@/services/paymentService";
import {
  AGREEMENT_EMAIL_KEY,
  AGREEMENT_TOKEN_KEY,
} from "@/services/trainingAgreementService";
import paidInviteService from "@/services/paidInviteService";
import {
  clearCheckoutDraft,
  emptyCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
  type CheckoutDraft,
} from "@/services/checkoutDraft";

export type { CheckoutDraft };
export { loadCheckoutDraft, saveCheckoutDraft, clearCheckoutDraft };

const emptyDraft = emptyCheckoutDraft;

function validateDraft(draft: CheckoutDraft) {
  const errors: Partial<Record<keyof CheckoutDraft, string>> = {};
  if (!draft.firstName.trim()) errors.firstName = "Required";
  if (!draft.lastName.trim()) errors.lastName = "Required";
  if (!draft.email.trim() || !/\S+@\S+\.\S+/.test(draft.email)) {
    errors.email = "Valid email required";
  }
  if (!draft.phoneNumber.trim() || !/^\d{7,15}$/.test(draft.phoneNumber)) {
    errors.phoneNumber = "Valid phone required";
  }
  return errors;
}

function AccountFields({
  draft,
  fieldErrors,
  emailError,
}: {
  draft: CheckoutDraft;
  setDraft: React.Dispatch<React.SetStateAction<CheckoutDraft>>;
  fieldErrors: Partial<Record<keyof CheckoutDraft, string>>;
  setFieldErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<keyof CheckoutDraft, string>>>
  >;
  emailError: string | null;
  setEmailError: (v: string | null) => void;
}) {
  const fullName = [draft.firstName, draft.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const phoneDisplay = [draft.countryCode, draft.phoneNumber]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Your details
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Name and phone are taken from your signed Training Agreement. After
          payment, you&apos;ll set your password on the next step.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div
          id="payment-first-name"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Name
          </p>
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{fullName || "—"}</span>
          </div>
        </div>

        <div
          id="payment-phone"
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Phone
          </p>
          <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
            <Phone className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{phoneDisplay || "—"}</span>
          </div>
        </div>
      </div>

      <div
        id="payment-email"
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3"
      >
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Email
        </p>
        <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <span>{draft.email || "—"}</span>
        </div>
      </div>

      {(fieldErrors.firstName ||
        fieldErrors.lastName ||
        fieldErrors.phoneNumber ||
        fieldErrors.email ||
        emailError) && (
        <p className="text-xs text-red-500">
          {emailError ||
            fieldErrors.email ||
            "Missing agreement details."}{" "}
          {!emailError && (
            <Link href="/agreement?next=payment" className="underline text-blue-600">
              Re-sign the agreement
            </Link>
          )}
          {emailError?.toLowerCase().includes("already registered") && (
            <Link href="/login" className="text-blue-600 underline ml-1">
              Log in
            </Link>
          )}
        </p>
      )}
    </div>
  );
}

function UnifiedCheckoutForm({
  config,
  paymentIntentId,
}: {
  config: PaymentConfig;
  paymentIntentId: string;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();

  const [draft, setDraft] = useState<CheckoutDraft>(emptyDraft);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CheckoutDraft, string>>
  >({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setDraft(loadCheckoutDraft());
  }, []);

  const goToSuccess = (intentId: string) => {
    router.push(
      `/payment-success?payment_intent=${encodeURIComponent(intentId)}`,
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const errors = validateDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsProcessing(true);
    setError(null);
    setEmailError(null);
    saveCheckoutDraft(draft);
    sessionStorage.setItem("academy_payment_intent", paymentIntentId);

    const returnUrl = `${window.location.origin}/payment-success?payment_intent=${paymentIntentId}`;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed.");
      setIsProcessing(false);
      return;
    }

    try {
      const verify = await paymentService.verifyPayment(paymentIntentId);
      if (!verify.paid) {
        setError("Payment could not be confirmed. Please try again.");
        setIsProcessing(false);
        return;
      }
      goToSuccess(paymentIntentId);
    } catch (err) {
      const apiErr = err as Error & { errors?: Record<string, string[]> };
      const first = apiErr.errors
        ? Object.values(apiErr.errors).flat()[0]
        : null;
      setError(first || apiErr.message || "Could not complete checkout.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AccountFields
        draft={draft}
        setDraft={setDraft}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        emailError={emailError}
        setEmailError={setEmailError}
      />

      {/* Payment element */}
      <div
        id="payment-card"
        className="pt-2 border-t border-gray-200 dark:border-gray-800"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Payment
        </h3>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        id="payment-submit"
        type="submit"
        disabled={isProcessing || !stripe}
        className="w-full py-4 font-bold rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg hover:from-green-700 hover:to-green-800 disabled:opacity-60 flex items-center justify-center gap-2 text-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {config.formatted_amount} &amp; continue
          </>
        )}
      </button>
    </form>
  );
}

interface AcademyCheckoutFormProps {
  config: PaymentConfig;
  publishableKey: string;
}

export default function AcademyCheckoutForm({
  config,
  publishableKey,
}: AcademyCheckoutFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPaymentIntent = searchParams.get("payment_intent");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  const prepareIntent = useCallback(async () => {
    setIsPreparing(true);
    setPrepareError(null);
    try {
      const agreementToken = sessionStorage.getItem(AGREEMENT_TOKEN_KEY);
      if (!agreementToken) {
        router.replace("/agreement?next=payment");
        return;
      }

      const agreementEmail = sessionStorage.getItem(AGREEMENT_EMAIL_KEY) || undefined;
      if (agreementEmail) {
        const draft = loadCheckoutDraft();
        saveCheckoutDraft({ ...draft, email: agreementEmail });
      }

      const paidInviteToken = paidInviteService.getInviteToken() || undefined;

      const data = await paymentService.createPaymentIntent(
        agreementEmail,
        agreementToken,
        paidInviteToken,
      );
      if (!data?.client_secret || !data?.payment_intent_id) {
        throw new Error("Unable to prepare payment.");
      }
      setClientSecret(data.client_secret);
      setPaymentIntentId(data.payment_intent_id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment could not be prepared.";
      if (/agreement/i.test(message)) {
        sessionStorage.removeItem(AGREEMENT_TOKEN_KEY);
        router.replace("/agreement?next=payment");
        return;
      }
      setPrepareError(message);
    } finally {
      setIsPreparing(false);
    }
  }, [router]);

  useEffect(() => {
    if (returnPaymentIntent) {
      router.replace(
        `/payment-success?payment_intent=${encodeURIComponent(returnPaymentIntent)}`,
      );
      return;
    }
    prepareIntent();
  }, [returnPaymentIntent, prepareIntent, router]);

  const elementsOptions: StripeElementsOptions | undefined = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: { colorPrimary: "#16a34a", borderRadius: "12px" },
        },
      }
    : undefined;

  if (returnPaymentIntent) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p>Redirecting to complete your account...</p>
      </div>
    );
  }

  if (isPreparing || !elementsOptions || !paymentIntentId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-600">
        {prepareError ? (
          <div className="text-center space-y-3">
            <p className="text-red-600 text-sm">{prepareError}</p>
            <button
              type="button"
              onClick={prepareIntent}
              className="text-blue-600 underline text-sm"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            <p>Loading secure checkout...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={elementsOptions}
      key={clientSecret}
    >
      <UnifiedCheckoutForm config={config} paymentIntentId={paymentIntentId} />
    </Elements>
  );
}
