"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  HelpCircle,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  X,
} from "lucide-react";

interface SupportInquiry {
  id: number;
  name: string;
  email: string;
  category: string;
  message: string;
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const CATEGORY_LABELS: Record<string, string> = {
  login_issue: "Login Failure",
  signup_issue: "Sign Up Problem",
  password_issue: "Password Reset",
  verification_issue: "Account Verification",
  other: "Other / General",
};

export default function AdminSupportInquiriesPage() {
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<SupportInquiry | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const url = new URL(`${API_BASE_URL}/admin/support-inquiries`);
      if (statusFilter !== "all") url.searchParams.append("status", statusFilter);
      if (search.trim()) url.searchParams.append("search", search.trim());

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInquiries(data.data.data || data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch inquiries:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/admin/support-inquiries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
        );
        if (selectedInquiry?.id === id) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus as any } : null));
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle className="h-3 w-3" /> Resolved
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <Clock className="h-3 w-3" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <AlertCircle className="h-3 w-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Login & Signup Support Inquiries</h1>
          <p className="text-sm text-slate-500">
            Manage inquiries submitted by users facing issues with Login or Account Registration.
          </p>
        </div>

        <button
          onClick={fetchInquiries}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between border border-slate-200/80">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {["all", "pending", "in_progress", "resolved"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-2 text-lg font-semibold text-slate-700">No Support Inquiries Found</h3>
            <p className="text-sm text-slate-500">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters or search query."
                : "No inquiries have been submitted yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Issue Category</th>
                  <th className="px-6 py-4">Message Snippet</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-900 font-bold text-xs">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs truncate text-slate-600">
                      {item.message}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedInquiry(item)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-900 hover:text-blue-700"
                      >
                        View Details <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail View */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setSelectedInquiry(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-900">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Support Inquiry #{selectedInquiry.id}</h3>
                <p className="text-xs text-slate-500">
                  Submitted on {new Date(selectedInquiry.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Name</span>
                  <span className="text-slate-800 font-medium">{selectedInquiry.name}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Email</span>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-blue-900 font-medium hover:underline">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Category</span>
                  <span className="text-slate-800 font-medium">
                    {CATEGORY_LABELS[selectedInquiry.category] || selectedInquiry.category}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Current Status</span>
                  {getStatusBadge(selectedInquiry.status)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Message / Problem Description
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Change Status Dropdown */}
              <div className="pt-2">
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Update Resolution Status
                </label>
                <select
                  disabled={updatingStatus}
                  value={selectedInquiry.status}
                  onChange={(e) => handleStatusUpdate(selectedInquiry.id, e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-sm text-slate-800 outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="mt-6 text-right">
              <button
                onClick={() => setSelectedInquiry(null)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
