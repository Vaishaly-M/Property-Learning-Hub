"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { CreditCard, Loader2 } from "lucide-react";

interface StripePaymentFormProps {
  publishableKey: string;
  clientSecret: string;
  paymentIntentId: string;
  formattedAmount: string;
  email: string;
  onSuccess?: (paymentIntentId: string) => void | Promise<void>;
}

function PaymentForm({
  paymentIntentId,
  formattedAmount,
  email,
  onSuccess,
}: Omit<StripePaymentFormProps, "publishableKey" | "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const returnUrl = `${window.location.origin}/payment-success?payment_intent=${paymentIntentId}`;

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message || "Payment failed. Please try again.");
      setIsProcessing(false);
      return;
    }

    if (onSuccess) {
      await onSuccess(paymentIntentId);
      setIsProcessing(false);
      return;
    }

    router.push(`/payment-success?payment_intent=${paymentIntentId}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ✅ id added so tour can highlight the Stripe card fields */}
      <div id="payment-card-number">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        id="payment-submit"
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-3.5 font-bold rounded-xl transition-all duration-300 text-base flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing payment...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {formattedAmount}
          </>
        )}
      </button>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Secured by Stripe. Card details are encrypted and never stored on our
        servers.
      </p>
    </form>
  );
}

export default function StripePaymentForm({
  publishableKey,
  clientSecret,
  paymentIntentId,
  formattedAmount,
  email,
  onSuccess,
}: StripePaymentFormProps) {
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#2563eb",
        borderRadius: "12px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        paymentIntentId={paymentIntentId}
        formattedAmount={formattedAmount}
        email={email}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
