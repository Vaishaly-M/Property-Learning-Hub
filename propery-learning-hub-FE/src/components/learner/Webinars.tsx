'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import learnerWebinarService, {
  Webinar,
  WebinarRegistration,
  WebinarRecordingAccess,
  WebinarStatus,
  WebinarCategory,
  WebinarLevel,
  RegistrationStatus,
} from '../../services/learnerWebinarService';
import StripePaymentForm from '../payment/StripePaymentForm';
import { resolveStorageUrl } from '../../utils/mediaUrl';
import WebinarRecordingPlayer from '../webinars/WebinarRecordingPlayer';

// ─────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────

const CATEGORY_LABELS: Record<WebinarCategory, string> = {
  market: 'Market Trends',
  investment: 'Investment Strategies',
  tax: 'Tax Planning',
  legal: 'Legal Structures',
  beginner: 'Beginner Guides',
};

const LEVEL_LABELS: Record<WebinarLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function categoryColor(cat: WebinarCategory) {
  switch (cat) {
    case 'market':     return 'bg-blue-100 text-blue-700';
    case 'investment': return 'bg-emerald-100 text-emerald-700';
    case 'tax':        return 'bg-amber-100 text-amber-700';
    case 'legal':      return 'bg-violet-100 text-violet-700';
    case 'beginner':   return 'bg-slate-100 text-slate-600';
  }
}

function levelColor(level: WebinarLevel) {
  switch (level) {
    case 'beginner':     return 'bg-sky-50 text-sky-700';
    case 'intermediate': return 'bg-teal-50 text-teal-700';
    case 'advanced':     return 'bg-rose-50 text-rose-700';
  }
}

function statusBadge(status: WebinarStatus) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold';
  switch (status) {
    case 'upcoming':  return `${base} bg-amber-100 text-amber-700`;
    case 'live':      return `${base} bg-emerald-100 text-emerald-700 animate-pulse`;
    case 'completed': return `${base} bg-slate-100 text-slate-600`;
    case 'cancelled': return `${base} bg-red-100 text-red-600`;
  }
}

function registrationBadge(status: RegistrationStatus) {
  const base = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold';
  switch (status) {
    case 'registered': return `${base} bg-blue-100 text-blue-700`;
    case 'approved':   return `${base} bg-emerald-100 text-emerald-700`;
    case 'rejected':   return `${base} bg-red-600 text-white`;
    case 'cancelled':  return `${base} bg-slate-100 text-slate-500`;
    case 'pending':    return `${base} bg-amber-100 text-amber-700`;
    default:           return `${base} bg-slate-100 text-slate-600`;
  }
}

function canJoinLiveWebinar(webinar: Webinar, regStatus?: RegistrationStatus | null): boolean {
  if (regStatus !== 'approved' || !webinar.live_link) return false;
  if (typeof webinar.can_join_live === 'boolean') return webinar.can_join_live;
  return webinar.status === 'live' || webinar.status === 'upcoming';
}

function canRegisterForWebinar(status?: RegistrationStatus | null) {
  return !status || status === 'rejected' || status === 'cancelled';
}

function canResubmitWebinarRegistration(status?: RegistrationStatus | null) {
  return status === 'rejected' || status === 'cancelled';
}

function canLearnerCancelRegistration(status?: RegistrationStatus | null) {
  return status === 'registered'
    || status === 'pending'
    || status === 'waitlisted'
    || status === 'approved';
}

function registrationStatusLabel(status: RegistrationStatus | string) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'registered':
      return 'Pending Approval';
    case 'rejected':
      return 'Rejected';
    case 'cancelled':
      return 'Cancelled';
    case 'pending':
      return 'Pending';
    default:
      return String(status).charAt(0).toUpperCase() + String(status).slice(1);
  }
}

function formatWebinarPrice(price: string | number) {
  const amount = parseFloat(String(price));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { label: 'Free', className: 'bg-emerald-100 text-emerald-700' };
  }
  return {
    label: `£${amount.toFixed(2)}`,
    className: 'bg-amber-100 text-amber-800',
  };
}

function isRecordingAccessActive(access?: { status?: string; expires_at?: string | null; is_active?: boolean } | null): boolean {
  if (!access) return false;
  if (access.is_active === true) return true;
  if (access.status !== 'approved') return false;
  if (!access.expires_at) return true;
  return new Date(access.expires_at).getTime() > Date.now();
}

function isPaidWebinar(price: string | number | null | undefined): boolean {
  const amount = Number.parseFloat(String(price ?? ''));
  return Number.isFinite(amount) && amount > 0;
}

function isPaidRegistration(registration?: { payment_status?: string; amount_paid?: string } | null): boolean {
  return registration?.payment_status === 'paid'
    && Number.parseFloat(String(registration?.amount_paid ?? '0')) > 0;
}

function hadPaidWebinarRegistration(
  registration?: { payment_status?: string; amount_paid?: string } | null,
  webinarPrice?: string | number,
): boolean {
  const amount = Number.parseFloat(String(registration?.amount_paid ?? webinarPrice ?? '0'));
  if (!Number.isFinite(amount) || amount <= 0) {
    return false;
  }

  return registration?.payment_status === 'paid' || registration?.payment_status === 'refunded';
}

function isRefundedRegistration(registration?: { payment_status?: string } | null): boolean {
  return registration?.payment_status === 'refunded';
}

function getRejectedRegistrationRefundCopy(
  webinarTitle: string,
  registration?: { payment_status?: string; amount_paid?: string; rejection_reason?: string | null } | null,
  webinarPrice?: string | number,
) {
  const amountLabel = formatWebinarPrice(registration?.amount_paid ?? webinarPrice ?? 0).label;
  const refunded = isRefundedRegistration(registration);
  const wasPaid = hadPaidWebinarRegistration(registration, webinarPrice);

  if (refunded) {
    return {
      title: 'Refund processed',
      message: `Your registration for "${webinarTitle}" was declined. A refund of ${amountLabel} has been initiated to your original payment method. Refunds typically appear within 5–10 business days.`,
    };
  }

  if (wasPaid) {
    return {
      title: 'Registration declined',
      message: `Your registration for "${webinarTitle}" was declined. If you paid for this webinar, please contact support regarding your refund.`,
    };
  }

  return {
    title: 'Registration declined',
    message: registration?.rejection_reason
      ? `Your registration for "${webinarTitle}" was declined. Reason: ${registration.rejection_reason}`
      : `Your registration for "${webinarTitle}" was declined.`,
  };
}

function getCancelRegistrationCopy(
  webinarTitle: string,
  registration?: { payment_status?: string; amount_paid?: string } | null,
  webinarPrice?: string | number,
) {
  const paid = isPaidRegistration(registration)
    || (registration?.payment_status === 'paid' && isPaidWebinar(webinarPrice));
  const amountLabel = formatWebinarPrice(registration?.amount_paid ?? webinarPrice ?? 0).label;

  if (paid) {
    return {
      title: 'Cancel & Refund Registration',
      message: `Your registration for "${webinarTitle}" will be cancelled and a refund of ${amountLabel} will be returned to your original payment method. Refunds typically appear within 5–10 business days.`,
      confirmLabel: 'Cancel & Refund',
      successFallback: `Registration cancelled. A refund of ${amountLabel} has been initiated.`,
    };
  }

  return {
    title: 'Cancel Registration',
    message: `Are you sure you want to cancel your registration for "${webinarTitle}"? This action cannot be undone.`,
    confirmLabel: 'Confirm Cancellation',
    successFallback: 'Registration cancelled',
  };
}

async function openLiveWebinar(
  webinar: Webinar,
  toast?: (msg: string, t?: ToastType) => void,
) {
  if (!webinar.live_link) {
    toast?.('No live meeting link is available yet', 'error');
    return;
  }

  try {
    const res = await learnerWebinarService.joinLiveWebinar(webinar.id);
    if (!res.success) {
      toast?.(res.message ?? 'Unable to join webinar', 'error');
      return;
    }

    const liveLink = res.data?.live_link ?? webinar.live_link;
    window.open(liveLink, '_blank', 'noopener,noreferrer');
  } catch (err: unknown) {
    toast?.(err instanceof Error ? err.message : 'Unable to join webinar', 'error');
  }
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function formatCountdown(dateStr: string, timeStr: string): string {
  const dt = new Date(`${dateStr}T${timeStr}`);
  const diff = dt.getTime() - Date.now();
  if (diff <= 0) return 'Starting soon';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface ToastMsg { id: number; type: ToastType; text: string; }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const counter = useRef(0);
  const push = useCallback((text: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white
          ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-slate-700'}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Confirmation Modal
// ─────────────────────────────────────────────

function ConfirmationModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  loading,
  confirmLabel = 'Confirm',
}: { 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void; 
  loading: boolean;
  confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          </div>
          <p className="text-slate-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg font-medium hover:bg-blue-800 transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modal shell
// ─────────────────────────────────────────────

function Modal({ title, subtitle, onClose, footer, children, size = 'md' }: {
  title: string; subtitle?: string; onClose: () => void;
  footer?: React.ReactNode; children: React.ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl ${widths[size]} w-full max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-start justify-between p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition ml-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
        {footer && <div className="border-t border-slate-100 p-4 flex justify-end gap-3 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Countdown
// ─────────────────────────────────────────────

function Countdown({ date, time }: { date: string; time: string }) {
  const [label, setLabel] = useState(() => formatCountdown(date, time));
  useEffect(() => {
    const id = setInterval(() => setLabel(formatCountdown(date, time)), 30000);
    return () => clearInterval(id);
  }, [date, time]);
  return (
    <div className="inline-flex items-center gap-1.5 bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">
      <span>⏱</span> Starts in {label}
    </div>
  );
}

// ─────────────────────────────────────────────
// Webinar Detail Modal
// ─────────────────────────────────────────────

function WebinarDetailModal({ webinar: initialWebinar, onClose, toast, onRegistrationChange }: {
  webinar: Webinar;
  onClose: () => void;
  toast: (msg: string, t?: ToastType) => void;
  onRegistrationChange: () => void;
}) {
  const [webinar, setWebinar] = useState(initialWebinar);
  const [loading, setLoading] = useState(false);
  const [recordingLoading, setRecordingLoading] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [paymentCheckout, setPaymentCheckout] = useState<{
    client_secret: string;
    payment_intent_id: string;
    formatted_amount: string;
    publishable_key: string;
  } | null>(null);
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [player, setPlayer] = useState<{ title: string; streamUrl: string } | null>(null);

  // Reload full detail
  const reload = useCallback(async () => {
    try {
      const res = await learnerWebinarService.getWebinar(webinar.id);
      if (res.success && res.data) setWebinar(res.data as Webinar);
    } catch { /* silent */ }
  }, [webinar.id]);

  useEffect(() => { reload(); }, [reload]);

  const regStatus = webinar.my_registration?.status ?? webinar.my_registration_status;
  const recordingAccess = webinar.my_recording_access;
  const isFull = Boolean(webinar.is_full);
  const price = parseFloat(webinar.price);
  const isResubmission = canResubmitWebinarRegistration(regStatus);
  const myRegistration = webinar.my_registration;
  const paidRegistration = isPaidRegistration(myRegistration);
  const rejectedRefundCopy = regStatus === 'rejected'
    ? getRejectedRegistrationRefundCopy(webinar.title, myRegistration, webinar.price)
    : null;
  const cancelCopy = getCancelRegistrationCopy(webinar.title, myRegistration, webinar.price);

  const handleRegisterWithForm = async (formData: { email: string }) => {
    if (isPaidWebinar(webinar.price)) {
      setLoading(true);
      try {
        const paymentRes = await learnerWebinarService.createRegistrationPaymentIntent(webinar.id);
        if (!paymentRes.success || !paymentRes.data) {
          toast(paymentRes.message ?? 'Unable to start payment', 'error');
          return;
        }

        const checkout = paymentRes.data;
        if (!checkout.client_secret || !checkout.payment_intent_id || !checkout.publishable_key) {
          toast('Payment is not available right now. Please contact support.', 'error');
          return;
        }

        setRegistrationEmail(formData.email);
        setPaymentCheckout(checkout);
      } catch {
        toast('Unable to start payment', 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await learnerWebinarService.register(webinar.id);
      if (res.success) {
        toast(
          isResubmission
            ? 'Registration resubmitted! Awaiting instructor approval.'
            : 'Registration submitted! Awaiting instructor approval.',
          'success'
        );
        reload();
        onRegistrationChange();
      } else {
        toast(res.message ?? 'Registration failed', 'error');
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error registering', 'error');
    } finally { setLoading(false); }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setLoading(true);
    try {
      const res = await learnerWebinarService.register(webinar.id, paymentIntentId);
      if (res.success) {
        toast('Payment received! Registration submitted for approval.', 'success');
        setPaymentCheckout(null);
        reload();
        onRegistrationChange();
      } else {
        toast(res.message ?? 'Registration failed after payment', 'error');
      }
    } catch {
      toast('Registration failed after payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRegistration = async () => {
    setShowConfirmation(false);

    if (isPaidWebinar(webinar.price)) {
      await handleRegisterWithForm({ email: registrationEmail });
      return;
    }

    setLoading(true);
    try {
      const res = await learnerWebinarService.register(webinar.id);
      if (res.success) {
        toast(
          isResubmission
            ? 'Registration resubmitted! Awaiting instructor approval.'
            : 'Registration submitted! Awaiting instructor approval.',
          'success'
        );
        reload();
        onRegistrationChange();
      } else {
        toast(res.message ?? 'Registration failed', 'error');
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Error registering', 'error');
    } finally { setLoading(false); }
  };

  const handleRegisterClick = () => {
    if (isPaidWebinar(webinar.price)) {
      void handleRegisterWithForm({ email: registrationEmail });
      return;
    }

    setShowConfirmation(true);
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await learnerWebinarService.cancelRegistration(webinar.id);
      if (res.success) {
        toast(res.message ?? cancelCopy.successFallback, 'success');
        setShowCancelConfirmation(false);
        reload();
        onRegistrationChange();
      } else {
        toast(res.message ?? 'Failed to cancel', 'error');
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    } finally { setLoading(false); }
  };

  const handleRequestAccess = async () => {
    setRecordingLoading(true);
    try {
      const res = await learnerWebinarService.requestRecordingAccess(webinar.id, requestMessage || undefined);
      if (res.success) {
        toast('Recording access requested!', 'success');
        setShowRequestForm(false);
        reload();
      } else {
        toast(res.message ?? 'Failed', 'error');
      }
    } catch { toast('Error', 'error'); }
    finally { setRecordingLoading(false); }
  };

  const handleDownload = async () => {
    try {
      const fileName = webinar.recording_original_name ?? `${webinar.title}.mp4`;
      await learnerWebinarService.downloadRecording(webinar.id, fileName);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Download failed', 'error');
    }
  };

  const handleStream = async () => {
    try {
      const res = await learnerWebinarService.streamRecording(webinar.id);
      const streamUrl = res.data?.stream_url ?? (res as { stream_url?: string }).stream_url;

      if (res.success && streamUrl) {
        setPlayer({ title: webinar.title, streamUrl });
      } else {
        toast(res.message ?? 'Failed to get stream', 'error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      toast(message, 'error');
    }
  };

  const capacityPct = pct(webinar.total_registrations ?? 0, webinar.max_attendees);
  const priceBadge = formatWebinarPrice(webinar.price);

  return (
    <>
      <Modal title={webinar.title} subtitle={`${CATEGORY_LABELS[webinar.category]} · ${LEVEL_LABELS[webinar.level]}`} onClose={onClose} size="lg"
        footer={<button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Close</button>}>
        <div className="space-y-5">
          {/* Status + badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadge(webinar.status)}>{webinar.status.toUpperCase()}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor(webinar.category)}`}>{CATEGORY_LABELS[webinar.category]}</span>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${levelColor(webinar.level)}`}>{LEVEL_LABELS[webinar.level]}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priceBadge.className}`}>{priceBadge.label}</span>
          </div>

          {/* Thumbnail */}
          {webinar.thumbnail_url && (
            <img src={resolveStorageUrl(webinar.thumbnail_url) ?? webinar.thumbnail_url} alt="" className="w-full h-48 object-cover rounded-xl border border-slate-100" />
          )}

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">{webinar.description}</p>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Date & Time</p>
              <p className="font-medium text-slate-700">📅 {webinar.date} at {webinar.time}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Duration</p>
              <p className="font-medium text-slate-700">⏱ {webinar.duration} minutes</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Host</p>
              <p className="font-medium text-slate-700">👤 {webinar.instructor ? `${webinar.instructor.first_name} ${webinar.instructor.last_name}` : 'Instructor'}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Capacity</p>
              <p className="font-medium text-slate-700">👥 {webinar.total_registrations ?? 0} / {webinar.max_attendees}</p>
            </div>
          </div>

          {/* Capacity bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Capacity</span><span>{capacityPct}% filled</span>
            </div>
            <ProgressBar value={capacityPct} color={capacityPct >= 90 ? 'bg-red-400' : 'bg-blue-400'} />
            {isFull && webinar.status === 'upcoming' && (
              <p className="text-xs text-red-500 mt-1 font-medium">This webinar is full.</p>
            )}
          </div>

          {/* Countdown */}
          {webinar.status === 'upcoming' && (
            <Countdown date={webinar.date} time={webinar.time} />
          )}

          {/* Learning Objectives */}
          {webinar.learning_objectives && webinar.learning_objectives.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">What you'll learn</h4>
              <ul className="space-y-1">
                {webinar.learning_objectives.map(obj => (
                  <li key={obj.id} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 mt-0.5">✓</span> {obj.objective}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {webinar.tags && webinar.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {webinar.tags.map(t => (
                <span key={t.id} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs">{t.tag}</span>
              ))}
            </div>
          )}

          {/* ── Registration Section ─────────────────── */}
          {webinar.status === 'upcoming' && (
            <div className="border-t border-slate-100 pt-5">
              {regStatus && !canRegisterForWebinar(regStatus) ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Your registration status</p>
                    <span className={`mt-1 ${registrationBadge(regStatus)}`}>{regStatus.charAt(0).toUpperCase() + regStatus.slice(1)}</span>
                    {regStatus === 'registered' && <p className="text-xs text-slate-500 mt-1">Awaiting instructor approval.</p>}
                    {(regStatus === 'pending' || regStatus === 'waitlisted') && (
                      <p className="text-xs text-slate-500 mt-1">
                        {regStatus === 'waitlisted' ? 'You are on the waitlist.' : 'Your registration is pending review.'}
                      </p>
                    )}
                    {paidRegistration && (
                      <p className="text-xs text-amber-700 mt-1">
                        Paid {formatWebinarPrice(myRegistration?.amount_paid ?? webinar.price).label}
                        {myRegistration?.payment_status === 'refunded' ? ' · Refunded' : ' · Refund available if you cancel before the webinar starts'}
                      </p>
                    )}
                    {regStatus === 'approved' && webinar.live_link && canJoinLiveWebinar(webinar, regStatus) && (
                      <button
                        type="button"
                        onClick={() => void openLiveWebinar(webinar, toast)}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition"
                      >
                        ▶ Join Webinar
                      </button>
                    )}
                    {regStatus === 'approved' && webinar.live_link && !canJoinLiveWebinar(webinar, regStatus) && (
                      <p className="text-xs text-slate-500 mt-2">Join opens 15 minutes before the scheduled start.</p>
                    )}
                  </div>
                  {canLearnerCancelRegistration(regStatus) && (
                    <button disabled={loading} onClick={() => setShowCancelConfirmation(true)}
                      className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 border border-red-200 transition disabled:opacity-50">
                      {loading ? 'Cancelling...' : paidRegistration ? 'Cancel & Refund' : 'Cancel Registration'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    {regStatus === 'rejected' && (
                      <div className="mb-3 space-y-2">
                        <span className={registrationBadge('rejected')}>Rejected</span>
                        {rejectedRefundCopy && (
                          <div className={`rounded-lg border px-3 py-2.5 text-xs ${
                            isRefundedRegistration(myRegistration)
                              ? 'border-amber-200 bg-amber-50 text-amber-900'
                              : 'border-red-200 bg-red-50 text-red-800'
                          }`}>
                            <p className="font-semibold">{rejectedRefundCopy.title}</p>
                            <p className="mt-1 leading-relaxed">{rejectedRefundCopy.message}</p>
                            {myRegistration?.rejection_reason && !rejectedRefundCopy.message.includes(myRegistration.rejection_reason) && (
                              <p className="mt-1">Reason: {myRegistration.rejection_reason}</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-slate-600">You can submit a new registration below.</p>
                      </div>
                    )}
                    {regStatus === 'cancelled' && (
                      <div className="mb-2">
                        <span className={registrationBadge('cancelled')}>Cancelled</span>
                        <p className="text-xs text-slate-600 mt-1">You can register again below.</p>
                      </div>
                    )}
                    <p className="text-sm text-slate-600">{isFull ? 'This webinar is full.' : isResubmission ? 'Submit a new registration request.' : 'Secure your spot now.'}</p>
                  </div>
                  {!isFull && (
                    <button disabled={loading} onClick={handleRegisterClick}
                      className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition disabled:opacity-50 shadow-sm">
                      {loading
                        ? 'Registering...'
                        : isPaidWebinar(webinar.price)
                          ? (isResubmission ? '💳 Register Again & Pay' : '💳 Register & Pay')
                          : (isResubmission ? '📅 Register Again' : '📅 Register Now')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Live Join ─────────────────────────────── */}
          {canJoinLiveWebinar(webinar, regStatus) && (
            <div className="border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => void openLiveWebinar(webinar, toast)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition animate-pulse"
              >
                🔴 Join Live Webinar
              </button>
            </div>
          )}

          {/* ── Recording Section ─────────────────────── */}
          {webinar.status === 'completed' && (
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <h4 className="text-sm font-semibold text-slate-700">Recording</h4>
              {!webinar.has_recording ? (
                <p className="text-sm text-slate-500">No recording available for this webinar yet.</p>
              ) : (
                <>
                  {!recordingAccess || recordingAccess.status === 'rejected' || recordingAccess.status === 'revoked' ? (
                    <>
                      {!showRequestForm ? (
                        <button onClick={() => setShowRequestForm(true)}
                          className="px-5 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-xl hover:bg-blue-800 transition">
                          🎬 Request Recording Access
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                            rows={3}
                            placeholder="Optional message to the instructor..."
                            value={requestMessage}
                            onChange={e => setRequestMessage(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <button disabled={recordingLoading} onClick={handleRequestAccess}
                              className="px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition disabled:opacity-50">
                              {recordingLoading ? 'Requesting...' : 'Send Request'}
                            </button>
                            <button onClick={() => setShowRequestForm(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg hover:bg-slate-200">Cancel</button>
                          </div>
                        </div>
                      )}
                      {recordingAccess?.status === 'rejected' && (
                        <p className="text-xs text-red-500">Your previous request was rejected. {recordingAccess.rejection_reason && `Reason: ${recordingAccess.rejection_reason}`}</p>
                      )}
                    </>
                  ) : recordingAccess.status === 'pending' ? (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-lg">
                      <span>⏳</span> Your recording access request is pending review.
                    </div>
                  ) : isRecordingAccessActive(recordingAccess) ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg">
                        <span>✓</span> You have approved access to this recording.
                        {recordingAccess.expires_at && (
                          <span className="text-xs ml-auto opacity-70">Expires {new Date(recordingAccess.expires_at).toLocaleDateString()}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleStream}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition">
                          ▶ Watch Online
                        </button>
                        <button onClick={handleDownload}
                          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition">
                          ⬇ Download
                        </button>
                      </div>
                    </div>
                  ) : recordingAccess.status === 'approved' ? (
                    <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-4 py-3 rounded-lg">
                      <span>⏰</span> Your recording access has expired. Please request access again.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          title="Confirm Registration"
          message={`Are you sure you want to register for "${webinar.title}" `}
          onConfirm={handleConfirmRegistration}
          onCancel={() => setShowConfirmation(false)}
          loading={loading}
          confirmLabel={isResubmission ? 'Confirm Re-registration' : 'Confirm Registration'}
        />
      )}

      {showCancelConfirmation && (
        <ConfirmationModal
          title={cancelCopy.title}
          message={cancelCopy.message}
          onConfirm={handleCancel}
          onCancel={() => setShowCancelConfirmation(false)}
          loading={loading}
          confirmLabel={cancelCopy.confirmLabel}
        />
      )}

      {paymentCheckout && (
        <Modal
          title="Complete Payment"
          subtitle={webinar.title}
          onClose={() => setPaymentCheckout(null)}
          size="md"
        >
          <StripePaymentForm
            publishableKey={paymentCheckout.publishable_key}
            clientSecret={paymentCheckout.client_secret}
            paymentIntentId={paymentCheckout.payment_intent_id}
            formattedAmount={paymentCheckout.formatted_amount}
            email={registrationEmail}
            onSuccess={handlePaymentSuccess}
          />
        </Modal>
      )}

      {player && (
        <WebinarRecordingPlayer
          title={player.title}
          streamUrl={player.streamUrl}
          onClose={() => setPlayer(null)}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Webinar Card
// ─────────────────────────────────────────────

function WebinarCard({ webinar, onView, onRegister, registering }: {
  webinar: Webinar;
  onView: () => void;
  onRegister: () => void;
  registering: boolean;
}) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const regStatus = webinar.my_registration?.status ?? webinar.my_registration_status;
  const myRegistration = webinar.my_registration;
  const rejectedRefundCopy = regStatus === 'rejected'
    ? getRejectedRegistrationRefundCopy(webinar.title, myRegistration, webinar.price)
    : null;
  const isFull = Boolean(webinar.is_full);
  const capacityPct = pct(webinar.total_registrations ?? 0, webinar.max_attendees);
  const canRegister = canRegisterForWebinar(regStatus);
  const isResubmission = canResubmitWebinarRegistration(regStatus);
  const price = parseFloat(webinar.price);
  const priceBadge = formatWebinarPrice(webinar.price);

  const handleRegisterClick = () => {
    if (isResubmission || isPaidWebinar(webinar.price)) {
      onView();
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmRegister = () => {
    setShowConfirmation(false);
    onRegister();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group">
        <div className="flex gap-4">
          {webinar.thumbnail_url && (
            <img src={resolveStorageUrl(webinar.thumbnail_url) ?? webinar.thumbnail_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 border border-slate-100" />
          )}
          <div className="flex-1 min-w-0">
            {/* Title + badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-slate-800 truncate max-w-lg group-hover:text-blue-900 transition-colors">{webinar.title}</h3>
              <span className={statusBadge(webinar.status)}>{webinar.status.toUpperCase()}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priceBadge.className}`}>{priceBadge.label}</span>
              {regStatus && (
                <span className={registrationBadge(regStatus)}>
                  {registrationStatusLabel(regStatus)}
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-2">
              <span>📅 {webinar.date}</span>
              <span>🕐 {webinar.time} · {webinar.duration} min</span>
              {webinar.instructor && <span>👤 {webinar.instructor.first_name} {webinar.instructor.last_name}</span>}
              <span className={`px-2 py-0.5 rounded-full font-medium ${categoryColor(webinar.category)}`}>{CATEGORY_LABELS[webinar.category]}</span>
              <span className={`px-2 py-0.5 rounded-lg font-medium ${levelColor(webinar.level)}`}>{LEVEL_LABELS[webinar.level]}</span>
            </div>

            <p className="text-sm text-slate-500 line-clamp-2 mb-3">{webinar.description}</p>

            {rejectedRefundCopy && (
              <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
                isRefundedRegistration(myRegistration)
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}>
                <p className="font-semibold">{rejectedRefundCopy.title}</p>
                <p className="mt-1">{rejectedRefundCopy.message}</p>
              </div>
            )}

            {/* Capacity */}
            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
              <span>👥 {webinar.total_registrations ?? 0} / {webinar.max_attendees}</span>
              <div className="flex-1 max-w-[100px]">
                <ProgressBar value={capacityPct} color={capacityPct >= 90 ? 'bg-red-400' : 'bg-blue-400'} />
              </div>
              <span>{capacityPct}%</span>
              {isFull && <span className="text-red-500 font-medium">Full</span>}
            </div>

            {/* Countdown for upcoming */}
            {webinar.status === 'upcoming' && (
              <div className="mb-3">
                <Countdown date={webinar.date} time={webinar.time} />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 mt-1">
          <button onClick={onView} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
            👁 View Details
          </button>

          {webinar.status === 'upcoming' && regStatus === 'rejected' && (
            <span className={registrationBadge('rejected')}>
              {registrationStatusLabel('rejected')}
            </span>
          )}

          {/* Register button for upcoming, no reg yet */}
          {webinar.status === 'upcoming' && canRegister && !isFull && (
            <button disabled={registering} onClick={handleRegisterClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-900 text-white hover:bg-blue-800 transition-colors disabled:opacity-50">
              {registering
                ? 'Registering...'
                : isResubmission
                  ? (price > 0 ? '💳 Register Again & Pay' : '📅 Register Again')
                  : (price > 0 ? '💳 Register & Pay' : '📅 Register')}
            </button>
          )}

          {/* Show registration status if already registered */}
          {webinar.status === 'upcoming' && regStatus && !canRegister && (
            <span className={registrationBadge(regStatus)}>
              {registrationStatusLabel(regStatus)}
            </span>
          )}

          {/* Join if approved + upcoming */}
          {webinar.status === 'upcoming' && canJoinLiveWebinar(webinar, regStatus) && (
            <button
              type="button"
              onClick={() => void openLiveWebinar(webinar)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              ▶ Join Webinar
            </button>
          )}

          {/* Join live */}
          {(webinar.status === 'live' || webinar.can_join_live) && regStatus === 'approved' && webinar.live_link && canJoinLiveWebinar(webinar, regStatus) && (
            <button
              type="button"
              onClick={() => void openLiveWebinar(webinar)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors animate-pulse"
            >
              🔴 Join Live
            </button>
          )}

          {/* Recording access for completed */}
          {webinar.status === 'completed' && (
            <button onClick={onView}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              🎬 Recording
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <ConfirmationModal
          title="Confirm Registration"
          message={`Are you sure you want to register for "${webinar.title}"`}
          onConfirm={handleConfirmRegister}
          onCancel={() => setShowConfirmation(false)}
          loading={registering}
          confirmLabel={isResubmission ? 'Confirm Re-registration' : 'Confirm Registration'}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// My Registrations Tab
// ─────────────────────────────────────────────

function MyRegistrationsTab({ toast }: { toast: (msg: string, t?: ToastType) => void }) {
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Webinar | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ webinarId: number; webinar: Webinar; registration: WebinarRegistration } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learnerWebinarService.getMyRegistrations({ per_page: 10, page });
      if (res.success && res.data) {
        setRegistrations(res.data.data);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      }
    } catch { toast('Failed to load registrations', 'error'); }
    finally { setLoading(false); }
  }, [page, toast]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      const res = await learnerWebinarService.cancelRegistration(cancelTarget.webinarId);
      if (res.success) {
        const copy = getCancelRegistrationCopy(
          cancelTarget.webinar.title,
          cancelTarget.registration,
          cancelTarget.webinar.price,
        );
        toast(res.message ?? copy.successFallback, 'success');
        load();
        setCancelTarget(null);
      } else {
        toast(res.message ?? 'Failed', 'error');
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed to cancel', 'error');
    } finally { setCancelling(false); }
  };

  const cancelCopy = cancelTarget
    ? getCancelRegistrationCopy(cancelTarget.webinar.title, cancelTarget.registration, cancelTarget.webinar.price)
    : null;

  if (loading) return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />)}
    </div>
  );

  if (registrations.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
      <div className="text-5xl mb-3">📋</div>
      <p className="text-slate-500">You haven't registered for any webinars yet.</p>
    </div>
  );

  return (
    <>
      {selected && (
        <WebinarDetailModal
          webinar={selected}
          onClose={() => setSelected(null)}
          toast={toast}
          onRegistrationChange={load}
        />
      )}
      
      {/* Cancel Confirmation Modal */}
      {cancelTarget && cancelCopy && (
        <ConfirmationModal
          title={cancelCopy.title}
          message={cancelCopy.message}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          loading={cancelling}
          confirmLabel={cancelCopy.confirmLabel}
        />
      )}
      
      <div className="space-y-4">
        {registrations.map(reg => {
          const w = reg.webinar;
          if (!w) return null;
          const rejectedRefundCopy = reg.status === 'rejected'
            ? getRejectedRegistrationRefundCopy(w.title, reg, w.price)
            : null;
          return (
            <div key={reg.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 flex-1 min-w-0">
                  {w.thumbnail_url && (
                    <img src={resolveStorageUrl(w.thumbnail_url) ?? w.thumbnail_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-100" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-800 truncate">{w.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-500">
                      <span>📅 {w.date} at {w.time}</span>
                      <span>⏱ {w.duration} min</span>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${categoryColor(w.category)}`}>{CATEGORY_LABELS[w.category]}</span>
                      <span className={statusBadge(w.status)}>{w.status.toUpperCase()}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={registrationBadge(reg.status)}>
                        Registration: {registrationStatusLabel(reg.status)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${formatWebinarPrice(w.price).className}`}>
                        {formatWebinarPrice(w.price).label}
                      </span>
                      {reg.attended && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✓ Attended</span>}
                      {isPaidRegistration(reg) && (
                        <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                          Paid {formatWebinarPrice(reg.amount_paid ?? w.price).label}
                        </span>
                      )}
                      {isRefundedRegistration(reg) && (
                        <span className="text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded-full">
                          Refunded {formatWebinarPrice(reg.amount_paid ?? w.price).label}
                        </span>
                      )}
                    </div>
                    {rejectedRefundCopy && (
                      <div className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                        isRefundedRegistration(reg)
                          ? 'border-amber-200 bg-amber-50 text-amber-900'
                          : 'border-red-200 bg-red-50 text-red-800'
                      }`}>
                        <p className="font-semibold">{rejectedRefundCopy.title}</p>
                        <p className="mt-1 leading-relaxed">{rejectedRefundCopy.message}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => setSelected(w)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
                    View
                  </button>
                  {(reg.status === 'registered' || reg.status === 'approved') && w.status === 'upcoming' && (
                    <button
                      onClick={() => setCancelTarget({ webinarId: w.id, webinar: w, registration: reg })}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 border border-red-200 transition"
                    >
                      {isPaidRegistration(reg) ? 'Cancel & Refund' : 'Cancel'}
                    </button>
                  )}
                  {reg.status === 'approved' && canJoinLiveWebinar(w, reg.status) && (
                    <button
                      type="button"
                      onClick={() => void openLiveWebinar(w, toast)}
                      className={`px-3 py-1.5 text-white rounded-lg text-sm font-medium transition text-center ${
                        w.status === 'live' ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {w.status === 'live' ? '🔴 Live' : 'Join'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">← Prev</button>
          <span className="text-sm text-slate-500">Page {page} of {lastPage} · {total} total</span>
          <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">Next →</button>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

type MainTab = 'all' | 'my';
type StatusFilter = WebinarStatus | 'all';

export default function LearnerWebinars() {
  const searchParams = useSearchParams();
  const { toasts, push: toast } = useToast();

  const [mainTab, setMainTab] = useState<MainTab>('all');
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming');
  const [categoryFilter, setCategoryFilter] = useState<WebinarCategory | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<WebinarLevel | 'all'>('all');
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail modal
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const hasHandledParam = useRef(false);

  const loadWebinars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learnerWebinarService.getWebinars({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        level: levelFilter === 'all' ? undefined : levelFilter,
        search: search || undefined,
        per_page: 10,
        page,
      });
      if (res.success && res.data) {
        setWebinars(res.data.data);
        setLastPage(res.data.last_page);
        setTotal(res.data.total);
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to load webinars', 'error');
    }
    finally { setLoading(false); }
  }, [statusFilter, categoryFilter, levelFilter, search, page, toast]);

  useEffect(() => {
    if (mainTab === 'all') loadWebinars();
  }, [mainTab, loadWebinars]);

  const openWebinarById = useCallback(async (webinarId: number) => {
    if (!Number.isFinite(webinarId)) return;

    const existing = webinars.find((webinar) => webinar.id === webinarId);
    if (existing) {
      setSelectedWebinar(existing);
      return;
    }

    try {
      const res = await learnerWebinarService.getWebinar(webinarId);
      if (res.success && res.data) {
        setSelectedWebinar(res.data as Webinar);
      }
    } catch {
      toast('Unable to open webinar', 'error');
    }
  }, [webinars, toast]);

  useEffect(() => {
    if (hasHandledParam.current) return;

    const webinarIdParam = searchParams.get('webinarId')
      ?? sessionStorage.getItem('learner_open_webinar_id');
    if (!webinarIdParam) return;

    const webinarId = Number(webinarIdParam);
    if (!Number.isFinite(webinarId)) {
      sessionStorage.removeItem('learner_open_webinar_id');
      return;
    }

    hasHandledParam.current = true;

    void openWebinarById(webinarId).finally(() => {
      sessionStorage.removeItem('learner_open_webinar_id');
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('webinarId')) {
          url.searchParams.delete('webinarId');
          window.history.replaceState({}, '', url.pathname + url.search);
        }
      } catch (e) {
        console.error('Error clearing webinarId param:', e);
      }
    });
  }, [searchParams, openWebinarById]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, levelFilter, search]);

  const handleRegister = async (webinar: Webinar) => {
    if (isPaidWebinar(webinar.price)) {
      setSelectedWebinar(webinar);
      return;
    }

    if (!canRegisterForWebinar(webinar.my_registration?.status ?? webinar.my_registration_status)) {
      setSelectedWebinar(webinar);
      return;
    }

    setRegistering(webinar.id);
    try {
      const res = await learnerWebinarService.register(webinar.id);
      if (res.success) {
        const regStatus = webinar.my_registration?.status ?? webinar.my_registration_status;
        toast(
          regStatus === 'rejected' || regStatus === 'cancelled'
            ? 'Registration resubmitted! Awaiting instructor approval.'
            : 'Registration submitted! Awaiting instructor approval.',
          'success'
        );
        loadWebinars();
      } else {
        toast(res.message ?? 'Registration failed', 'error');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error registering';
      toast(message, 'error');
    } finally { setRegistering(null); }
  };

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'upcoming', label: '📅 Upcoming' },
    { id: 'live', label: '🔴 Live' },
    { id: 'completed', label: '✅ Completed' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <ToastStack toasts={toasts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Webinars & Events</h1>
          <p className="text-slate-500 mt-1">Browse, register, and access recorded webinars</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setMainTab('all')}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
            mainTab === 'all' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🌐 All Webinars
        </button>
        <button
          onClick={() => setMainTab('my')}
          className={`px-6 py-3 text-sm font-medium transition-all border-b-2 ${
            mainTab === 'my' ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 My Registrations
        </button>
      </div>

      {/* Detail Modal */}
      {selectedWebinar && (
        <WebinarDetailModal
          webinar={selectedWebinar}
          onClose={() => setSelectedWebinar(null)}
          toast={toast}
          onRegistrationChange={loadWebinars}
        />
      )}

      {mainTab === 'my' ? (
        <MyRegistrationsTab toast={toast} />
      ) : (
        <>
          {/* Status sub-tabs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 flex-wrap">
              {statusTabs.map(t => (
                <button key={t.id} onClick={() => setStatusFilter(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    statusFilter === t.id ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              className="flex-1 max-w-xs px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              placeholder="Search webinars…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as WebinarCategory | 'all')}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <select
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value as WebinarLevel | 'all')}
            >
              <option value="all">All Levels</option>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Webinar list */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-36 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          ) : webinars.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-14 text-center">
              <div className="text-5xl mb-3">🎬</div>
              <p className="text-slate-500">No webinars found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webinars.map(w => (
                <WebinarCard
                  key={w.id}
                  webinar={w}
                  onView={() => setSelectedWebinar(w)}
                  onRegister={() => handleRegister(w)}
                  registering={registering === w.id}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <span className="text-sm text-slate-500">Page {page} of {lastPage} · {total} total</span>
              <button disabled={page === lastPage} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}