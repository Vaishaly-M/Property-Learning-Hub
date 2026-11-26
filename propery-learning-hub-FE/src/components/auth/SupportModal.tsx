"use client";

import React, { useState } from "react";
import {
  X,
  User,
  Mail,
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultEmail?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const ISSUE_CATEGORIES = [
  { value: "login_issue", label: "Trouble Logging In / Login Failure" },
  { value: "signup_issue", label: "Registration / Sign Up Problem" },
  { value: "password_issue", label: "Password Reset Issue" },
  { value: "verification_issue", label: "Email Verification / Account Activation" },
  { value: "other", label: "Other / General Support Inquiry" },
];

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = "login_issue",
  defaultEmail = "",
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: defaultEmail,
    category: defaultCategory,
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/support-inquiries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMsg(
          data.message ||
            "Your support inquiry has been submitted successfully. Our team will contact you shortly!",
        );
        setFormData({
          name: "",
          email: "",
          category: defaultCategory,
          message: "",
        });
      } else {
        setError(data.message || "Failed to submit inquiry. Please try again.");
      }
    } catch (err) {
      console.error("Support Inquiry Error:", err);
      setError("Unable to connect to support server. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.message.trim() !== "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 border border-slate-100">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 px-6 py-5 text-white">
          <button
            onClick={onClose}
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md">
              <HelpCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Support & Inquiry Assistance</h2>
              <p className="text-xs text-blue-100/80">
                Facing issues logging in or signing up? Submit a message to our admin team.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {successMsg ? (
            <div className="my-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Inquiry Sent Successfully!</h3>
              <p className="mt-2 text-sm text-slate-600">{successMsg}</p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Issue Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <HelpCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  >
                    {ISSUE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Message Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Description of the Issue <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    name="message"
                    required
                    rows={3}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Describe what error or issue you encountered..."
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                  />
                </div>
              </div>

              {/* Submit & Cancel */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || !isFormValid}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:from-blue-800 hover:to-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Inquiry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
