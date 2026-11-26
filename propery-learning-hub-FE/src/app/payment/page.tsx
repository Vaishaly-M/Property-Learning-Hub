"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, Shield, Lock, Loader2, ChevronLeft } from "lucide-react";
import { paymentService, type PaymentConfig } from "@/services/paymentService";
import AcademyCheckoutForm from "@/components/payment/AcademyCheckoutForm";
import { TourButton } from "@/components/onbording/tourButton";
import { paymentSteps } from "@/tours/paymentSteps";

const FEATURES = [
  "Weekly Live Meetings",
  "Live Personal Mentorship",
  "Full Community Access",
  "Networking Opportunities",
  "Bonus Content & Updates",
  "Templates & Contracts",
  "Live Q&A Sessions",
  "Priority Support",
];

const FALLBACK_CONFIG: PaymentConfig = {
  publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  product_name: "Freedom Property Journey",
  amount: 300000,
  currency: "gbp",
  formatted_amount: "£3,000.00",
};

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PaymentPageContent />
    </Suspense>
  );
}

function PaymentPageContent() {
  const [config, setConfig] = useState<PaymentConfig>(FALLBACK_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    paymentService
      .getConfig()
      .then((data) => {
        if (data) setConfig(data);
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

  const publishableKey =
    config.publishable_key ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "";

  return (
    // ✅ Added pb-32 so content doesn't hide behind the fixed buttons
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-6 px-4 sm:px-6 lg:px-8 pb-32">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
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

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Column */}
          <div id="payment-product-info">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {config.product_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
              Learn proven property investment strategies
            </p>

            <div id="payment-price" className="mt-4 mb-6">
              <span className="text-3xl sm:text-4xl font-bold text-blue-700 dark:text-blue-400">
                {loadingConfig ? "..." : config.formatted_amount}
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm uppercase">
                {config.currency}
              </span>
            </div>

            <div
              id="payment-features"
              className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800"
            >
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                What's included
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {config.product_name}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {config.formatted_amount}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-900 dark:text-white">
                  Total due today
                </span>
                <span className="text-blue-700 dark:text-blue-400">
                  {config.formatted_amount}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Shield className="w-3.5 h-3.5" />
                Secure checkout
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                Encrypted payment
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Complete your enrollment
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enter your details and payment below. You&apos;ll set your
                password on the next step after payment succeeds.
              </p>
            </div>

            {publishableKey ? (
              <AcademyCheckoutForm
                config={config}
                publishableKey={publishableKey}
              />
            ) : (
              !loadingConfig && (
                <p className="text-sm text-red-500 text-center">
                  Stripe publishable key is not configured.
                </p>
              )
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
              Already paid?{" "}
              <Link
                href="/login"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Log in
              </Link>
              {" or "}
              <Link
                href="/payment-success"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                complete registration
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Fixed bottom bar — Stripe badge on top, tour button below, no overlap */}
      <div className="fixed bottom-0 right-0 z-50 flex flex-col items-end gap-2 p-4">
        {/* Stripe badge — shown by Stripe itself, we just give it space */}
        <div className="h-8" /> {/* spacer for Stripe's own badge */}
        {/* Tour button */}
        <TourButton steps={paymentSteps} label="How to enroll" />
      </div>
    </div>
  );
}
