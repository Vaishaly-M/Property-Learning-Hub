"use client";

import React, { useState } from "react";
import {
  Sparkles,
  FileText,
  Home,
  Users,
  Star,
  CheckCircle2,
  Mail,
  X,
  ArrowRight,
  User,
  Phone,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { submitFreesbyTemplateLead } from "@/services/freesbyService";

// --- Type Definitions ---
interface TemplateItem {
  href: string;
  name: string;
  sub: string;
  category:
    | "Welcome & Guide"
    | "Signage"
    | "Checklists"
    | "Feedback & Reviews"
    | "Eco & Branding";
  bg: string;
  render: () => React.ReactNode;
  canvaLink: string;
}

interface TemplateCardProps {
  item: TemplateItem;
  onView: (item: TemplateItem) => void;
}

interface TemplateModalProps {
  item: TemplateItem | null;
  onClose: () => void;
}

// --- Data with Canva Links ---
const items: TemplateItem[] = [
  // Welcome & Guide Category
  {
    href: "/templates/digital-welcome-book",
    name: "Digital Welcome Book",
    sub: "Guide · Lite · Web",
    category: "Welcome & Guide",
    bg: "#010a29",
    canvaLink: "https://canva.link/9iw36bt9ipmoip1",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5 text-white"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight">
          Digital Welcome Book
        </div>
      </div>
    ),
  },
 // Checklists Category
  {
    href: "/templates/checkout-checklist",
    name: "Check-Out Checklist",
    sub: "Sign · A5 print",
    category: "Checklists",
    bg: "#010a29",
    canvaLink: "https://canva.link/axifh51l5u1oium",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight text-white">
          Check-Out Checklist
        </div>
      </div>
    ),
  },
  // Signage Category
  {
    href: "/templates/welcome-sign",
    name: "Welcome Sign",
    sub: "Sign · A5 print",
    category: "Signage",
    bg: "#010a29",
    canvaLink: "https://canva.link/3g30jawkj3prtf4",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5 text-white"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight">
          Welcome Sign
        </div>
      </div>
    ),
  },
  {
    href: "/templates/wifi-sign",
    name: "WiFi on the House",
    sub: "Sign · A5 print",
    category: "Signage",
    bg: "#010a29",
    canvaLink: "https://canva.link/d072ws2x6l4zhza",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5 text-white"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight">
          WiFi on the House
        </div>
      </div>
    ),
  },
  {
    href: "/templates/review-ratings-sign",
    name: "Review Ratings Sign",
    sub: "Sign · A5 print",
    category: "Signage",
    bg: "#010a29",
    canvaLink: "https://canva.link/qmynirsxdiwcxjq",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5 text-white"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight">
          Review Ratings Sign
        </div>
      </div>
    ),
  },

 
  {
    href: "/templates/bathroom-signs",
    name: "Bathroom Signs",
    sub: "Checklist · A4 print",
    category: "Checklists",
    bg: "#010a29",
    canvaLink: "https://canva.link/ltnqzyebz65uzk4",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight text-white">
          Bathroom Sign
        </div>
      </div>
    ),
  },

  // Eco & Branding Category
  {
    href: "/templates/eco-friendly-sign",
    name: "Eco-Friendly Sign",
    sub: "Sign · A5 print",
    category: "Eco & Branding",
    bg: "bg-green-800",
    canvaLink: "https://canva.link/bfwr5x01x4rhu4x",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5 text-white"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight">
          Eco-Friendly Sign
        </div>
      </div>
    ),
  },
  
  {
    href: "/templates/quotes",
    name: "Quotes",
    sub: "Sign · A5 print",
    category: "Feedback & Reviews",
    bg: "bg-green-800",
    canvaLink: "https://canva.link/bfwr5x01x4rhu4x",
    render: () => (
      <div
        className="flex h-full w-full flex-col items-center justify-center p-5 text-white"
        style={{ backgroundColor: "#010a29" }}
      >
        <div className="relative w-16 h-16 mb-3">
          <Image
            src="/logo.jpeg"
            alt="Freedom Property"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-center font-semibold text-[15px] leading-tight">
          Quotes
        </div>
      </div>
    ),
  },
  
];

const categories: string[] = [
  "Welcome & Guide",
  "Signage",
  "Checklists",
  "Feedback & Reviews",
  "Eco & Branding",
];

// --- Components ---

function TemplateCard({ item, onView }: TemplateCardProps) {
  return (
    <div className="group block">
      <div className="rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_22px_-14px_rgba(0,0,0,0.15)] transition-all duration-200 group-hover:-translate-y-[3px] group-hover:shadow-[0_1px_2px_rgba(0,0,0,0.08),0_18px_30px_-16px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between px-1.5 pb-2 pt-0.5">
          <div className="h-[7px] w-[7px] rounded-full bg-blue-300" />
          <div className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-blue-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-2.5 w-2.5 opacity-65"
            >
              <path
                d="M7 17L17 7M9 7h8v8"
                stroke="#2563EB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div
          className={`relative flex aspect-[4/3] w-full flex-col overflow-hidden rounded-[11px] ${item.bg}`}
        >
          {item.render()}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[7px] bg-blue-600">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M12 3L4 9v12h16V9l-8-6z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="truncate text-[15px] font-semibold text-gray-900">
            {item.name}
          </div>
        </div>
        <span className="flex-none rounded-[5px] bg-green-600 px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.05em] text-white">
          FREE
        </span>
      </div>
      <div className="pt-1 font-mono text-[12px] text-gray-500">{item.sub}</div>

      <button
        type="button"
        onClick={() => onView(item)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-blue-600 py-2.5 text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700"
      >
        View Template
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function TemplateModal({ item, onClose }: TemplateModalProps) {
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
  }>({});

  if (!item) return null;

  // Your Laravel backend URL - CHANGE THIS TO YOUR ACTUAL BACKEND URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const validateForm = (): boolean => {
    const newErrors: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required.";
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      newErrors.email = "Enter a valid email address.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitFreesbyTemplateLead({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        template: item.name,
      });
      setSubmitted(true);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to submit your request";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSubmitted(false);
    setError(null);
    setSubmitting(false);
    setSubmitError(null);
    setErrors({});
    setLoading(false);
    setRedirecting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[440px] rounded-[20px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={16} />
        </button>

        {!submitted ? (
          <>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-blue-100">
              <Mail size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter your details to access this template on Canva.
            </p>

            {error && (
              <div className="mt-3 rounded-[10px] bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5">
              <div className="mb-3.5">
                <label
                  htmlFor="template-fullname"
                  className="mb-1.5 block text-xs font-medium text-gray-700"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <User size={16} />
                  </div>
                  <input
                    id="template-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                    className={`w-full rounded-[10px] border ${
                      errors.fullName ? "border-red-500" : "border-gray-200"
                    } pl-9 pr-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 disabled:opacity-60`}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
                )}
              </div>

              <div className="mb-3.5">
                <label
                  htmlFor="template-email"
                  className="mb-1.5 block text-xs font-medium text-gray-700"
                >
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="template-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  className={`w-full rounded-[10px] border ${
                    errors.email ? "border-red-500" : "border-gray-200"
                  } px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 disabled:opacity-60`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <label
                  htmlFor="template-phone"
                  className="mb-1.5 block text-xs font-medium text-gray-700"
                >
                  Phone Number <span className="text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Phone size={16} />
                  </div>
                  <input
                    id="template-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    disabled={loading}
                    className="w-full rounded-[10px] border border-gray-200 pl-9 pr-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {submitError && (
                <p className="mb-3 text-sm text-red-600">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "View Template"}
                {!submitting && <ArrowRight size={15} />}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-[12px] bg-green-100">
              <CheckCircle2 size={22} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {redirecting ? "Redirecting..." : "Thank you!"}
            </h3>
            <p className="mt-1.5 text-sm text-gray-500">
              {redirecting ? (
                <>
                  Opening <span className="font-semibold text-gray-700">{item.name}</span> on Canva...
                </>
              ) : (
                <>
                  Your <span className="font-semibold text-gray-700">{item.name}</span> is ready!
                </>
              )}
            </p>
            {redirecting && (
              <div className="mt-4 flex justify-center">
                <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {!redirecting && (
              <button
                type="button"
                onClick={() => {
                  window.open(item.canvaLink, '_blank');
                  handleClose();
                }}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700"
              >
                Open in Canva
                <ExternalLink size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HostKitPage() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeTemplate, setActiveTemplate] = useState<TemplateItem | null>(
    null,
  );

  const filteredItems: TemplateItem[] =
    activeCategory === "All"
      ? items
      : items.filter((item) => item.category === activeCategory);

  const categoriesWithAll: string[] = ["All", ...categories];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-green-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 px-6 py-3 rounded-full mb-8 shadow-lg border border-blue-200">
              <Sparkles size={18} className="text-blue-600" />
              <span className="font-semibold text-sm text-blue-700">
                Free Resource
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-4">
              The Free Airbnb
            </h1>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-blue-600 mb-6">
              Starter Pack
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Twelve small things guests notice first. Welcome signs, WiFi
              cards, checkout lists the little printable touches that make a
              rental feel hosted.
            </p>

          
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-gray-400 flex justify-center">
            <div className="w-1 h-2 bg-gray-400 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 mr-2">
            Filter:
          </span>
          {categoriesWithAll.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-16">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-900">
            {activeCategory === "All" ? "All Templates" : activeCategory}
          </h2>
          <p className="text-xs text-gray-500">
            {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "template" : "templates"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <TemplateCard
              key={item.href}
              item={item}
              onView={setActiveTemplate}
            />
          ))}
        </div>
      </section>

      <TemplateModal
        item={activeTemplate}
        onClose={() => setActiveTemplate(null)}
      />
    </div>
  );
}