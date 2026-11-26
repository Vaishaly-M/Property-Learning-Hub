'use client';

import { useMemo, useState } from 'react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { CreditCard, Loader2 } from 'lucide-react';

interface WebinarPaymentFormProps {
  publishableKey: string;
  clientSecret: string;
  paymentIntentId: string;
  formattedAmount: string;
  email: string;
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
}

function PaymentForm({
  paymentIntentId,
  formattedAmount,
  email,
  onSuccess,
}: Omit<WebinarPaymentFormProps, 'publishableKey' | 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        receipt_email: email,
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    const intentId = paymentIntent?.id || paymentIntentId;
    await onSuccess(intentId);
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing}
        className="w-full py-3 font-semibold rounded-lg transition-colors text-base flex items-center justify-center gap-2 bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
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

      <p className="text-center text-xs text-slate-500">
        Secured by Stripe. Your registration is completed only after payment succeeds.
      </p>
    </form>
  );
}

export default function WebinarPaymentForm({
  publishableKey,
  clientSecret,
  paymentIntentId,
  formattedAmount,
  email,
  onSuccess,
}: WebinarPaymentFormProps) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#1e3a8a',
        borderRadius: '12px',
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
