'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  ChevronLeft,
  Loader2,
  Lock,
  PenLine,
  Shield,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import SignaturePad from '@/components/agreements/SignaturePad';
import trainingAgreementService, {
  parsePhoneForCheckout,
  splitFullName,
  type AgreementType,
  type TrainingAgreementConfig,
} from '@/services/trainingAgreementService';
import freeInviteService from '@/services/freeInviteService';
import paidInviteService from '@/services/paidInviteService';
import { saveCheckoutDraft } from '@/services/checkoutDraft';

type NextPath = 'payment' | 'signup';
type Step = 'details' | 'agreement';

const fillInput =
  'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500';

function isClientPartyLine(text: string): boolean {
  return text.startsWith('(2) Client full name');
}

function isBlankLine(text: string): boolean {
  return (
    text.startsWith('Name:') ||
    text.startsWith('Position:') ||
    text.startsWith('Signature:') ||
    text.startsWith('Date:')
  );
}

function isScheduleInsertLine(text: string): boolean {
  return text.startsWith('[Insert total Fee');
}

function isHeading(text: string): boolean {
  return (
    text === 'BACKGROUND' ||
    /^\d+\.\s/.test(text) ||
    text === 'Signatures' ||
    text.startsWith('Schedule 1')
  );
}

function isTitle(text: string): boolean {
  return (
    text === 'FREEDOM PROPERTY ACADEMY' ||
    text === 'TRAINING & MEMBERSHIP SERVICES AGREEMENT' ||
    text === 'PROMOTIONAL MEMBERSHIP & MARKETING CONSIDERATION' ||
    text === 'AGREEMENT'
  );
}

function isFreeClientPartyContinuation(text: string): boolean {
  return (
    text.startsWith('of Client address') ||
    (text.startsWith('date of birth') && text.includes('“the Client”'))
  );
}

function formatDobDisplay(dob: string): string {
  if (!dob) return '—';
  try {
    return new Date(`${dob}T00:00:00`).toLocaleDateString('en-GB');
  } catch {
    return dob;
  }
}

export default function TrainingAgreementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteFlow, setInviteFlow] = useState<'free' | 'paid' | null>(null);
  const next = (
    inviteFlow === 'paid'
      ? 'payment'
      : searchParams.get('next') === 'signup'
        ? 'signup'
        : 'payment'
  ) as NextPath;

  const [step, setStep] = useState<Step>('details');
  const [config, setConfig] = useState<TrainingAgreementConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'instalments'>('full');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [paidInviteToken, setPaidInviteToken] = useState<string | null>(null);
  const [inviteEmailLocked, setInviteEmailLocked] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    toast.error(msg);
  };

  const verifyEmailAvailable = async (
    value: string,
    opts?: { toastOnFail?: boolean }
  ): Promise<boolean> => {
    const toastOnFail = opts?.toastOnFail !== false;
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setEmailError(null);
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      const msg = 'Please enter a valid email address.';
      setEmailError(msg);
      if (toastOnFail) toast.error(msg);
      return false;
    }

    setCheckingEmail(true);
    try {
      const result = await trainingAgreementService.checkEmail(trimmed);
      if (result.registered) {
        const msg =
          result.message || 'This email is already registered. Please log in instead.';
        setEmailError(msg);
        if (toastOnFail) toast.error(msg);
        return false;
      }
      setEmailError(null);
      return true;
    } catch {
      setEmailError(null);
      return true;
    } finally {
      setCheckingEmail(false);
    }
  };

  const verifyPhoneAvailable = async (
    value: string,
    opts?: { toastOnFail?: boolean }
  ): Promise<boolean> => {
    const toastOnFail = opts?.toastOnFail !== false;
    const trimmed = value.trim();
    if (!trimmed) {
      setPhoneError(null);
      return false;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7) {
      const msg = 'Please enter a valid phone number.';
      setPhoneError(msg);
      if (toastOnFail) toast.error(msg);
      return false;
    }

    setCheckingPhone(true);
    try {
      const result = await trainingAgreementService.checkPhone(trimmed);
      if (result.registered) {
        const msg =
          result.message ||
          'This phone number is already registered. Please log in instead.';
        setPhoneError(msg);
        if (toastOnFail) toast.error(msg);
        return false;
      }
      setPhoneError(null);
      return true;
    } catch {
      setPhoneError(null);
      return true;
    } finally {
      setCheckingPhone(false);
    }
  };

  const agreementType: AgreementType = inviteFlow === 'free' ? 'free_membership' : 'training';
  const documentTitle =
    config?.document_title ||
    (agreementType === 'free_membership'
      ? 'Promotional Membership & Marketing Consideration Agreement'
      : 'Training & Membership Services Agreement');

  useEffect(() => {
    let configType: AgreementType = 'training';
    const storedPaidToken = paidInviteService.getInviteToken();
    const storedPaidEmail = paidInviteService.getInviteEmail();
    if (storedPaidToken && storedPaidEmail) {
      setPaidInviteToken(storedPaidToken);
      setInviteEmailLocked(true);
      setInviteFlow('paid');
      setEmail(storedPaidEmail);
      configType = 'training';
    } else {
      const storedInviteToken = freeInviteService.getInviteToken();
      const storedInviteEmail = freeInviteService.getInviteEmail();
      const isOpenInvite = freeInviteService.isOpenInvite();
      if (storedInviteToken && (storedInviteEmail || isOpenInvite)) {
        setInviteToken(storedInviteToken);
        setInviteEmailLocked(Boolean(storedInviteEmail) && !isOpenInvite);
        setInviteFlow('free');
        if (storedInviteEmail) {
          setEmail(storedInviteEmail);
        }
        configType = 'free_membership';
      } else if (searchParams.get('next') === 'payment') {
        configType = 'training';
      }
    }

    trainingAgreementService
      .getConfig(configType)
      .then(setConfig)
      .catch(() => {
        const msg = 'Unable to load agreement details.';
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const submitLabel = useMemo(
    () =>
      next === 'signup'
        ? 'Sign & continue to registration'
        : 'Sign & continue to payment',
    [next]
  );

  const documentParagraphs = config?.document_paragraphs || [];

  const sections = useMemo(() => {
    const clientSignIdx = documentParagraphs.findIndex((p) => p === 'Signed by the Client:');
    const academySignIdx = documentParagraphs.findIndex((p) =>
      p.startsWith('Signed for and on behalf of')
    );
    const scheduleIdx = documentParagraphs.findIndex((p) => p.startsWith('Schedule 1'));
    return { clientSignIdx, academySignIdx, scheduleIdx };
  }, [documentParagraphs]);

  const filledPartyLine = useMemo(() => {
    return `(2) Client full name, ${fullName.trim()} of ${address.trim()}, date of birth ${formatDobDisplay(dob)} (“the Client”, “you”, “your”),`;
  }, [fullName, address, dob]);

  const handleContinueToAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      showError('Please enter your full legal name.');
      return;
    }
    if (!address.trim()) {
      showError('Please enter your address.');
      return;
    }
    if (!dob) {
      showError('Please enter your date of birth.');
      return;
    }
    {
      const dobDate = new Date(`${dob}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!(dobDate < today)) {
        showError('The date of birth must be a date before today.');
        return;
      }
    }
    if (!email.trim()) {
      showError('Please enter your email.');
      return;
    }
    if (inviteEmailLocked) {
      const lockedEmail =
        paidInviteToken
          ? paidInviteService.getInviteEmail()
          : freeInviteService.getInviteEmail();
      if (lockedEmail && email.trim().toLowerCase() !== lockedEmail.toLowerCase()) {
        showError(`This invite link is only valid for ${lockedEmail}.`);
        return;
      }
    }
    if (!phone.trim()) {
      showError('Please enter your phone number.');
      return;
    }

    // Clear stale field errors — submit re-checks email/phone in one pass
    setEmailError(null);
    setPhoneError(null);
    setContinuing(true);
    try {
      const [emailOk, phoneOk] = await Promise.all([
        verifyEmailAvailable(email, { toastOnFail: true }),
        verifyPhoneAvailable(phone, { toastOnFail: true }),
      ]);
      if (!emailOk || !phoneOk) return;

      setAccepted(false);
      setSignature(null);
      setStep('agreement');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setContinuing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !address.trim() || !email.trim()) {
      showError('Please complete your details first.');
      setStep('details');
      return;
    }

    const emailOk = await verifyEmailAvailable(email);
    if (!emailOk) {
      setStep('details');
      return;
    }

    if (!phone.trim()) {
      showError('Please enter your phone number.');
      setStep('details');
      return;
    }

    const phoneOk = await verifyPhoneAvailable(phone);
    if (!phoneOk) {
      setStep('details');
      return;
    }

    if (!dob) {
      showError('Please enter your date of birth.');
      setStep('details');
      return;
    }
    {
      const dobDate = new Date(`${dob}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!(dobDate < today)) {
        showError('The date of birth must be a date before today.');
        setStep('details');
        return;
      }
    }
    if (!signature) {
      showError('Please sign in the Client signature box.');
      return;
    }
    if (!accepted) {
      showError('Please confirm you have read and agree to this Agreement.');
      return;
    }

    setSubmitting(true);
    try {
      const agreement = await trainingAgreementService.clientSign({
        client_full_name: fullName.trim(),
        client_address: address.trim(),
        client_dob: dob,
        client_email: email.trim().toLowerCase(),
        client_phone: phone.trim() || undefined,
        payment_plan: agreementType === 'free_membership' ? undefined : paymentPlan,
        schedule_notes: agreementType === 'free_membership' ? undefined : scheduleNotes.trim() || undefined,
        client_signature_data: signature,
        accepted_terms: true,
        invite_token: inviteToken || undefined,
        paid_invite_token: paidInviteToken || undefined,
        agreement_type: agreementType,
      });

      trainingAgreementService.storeSignedAgreement(
        agreement.public_token,
        agreement.client_email,
        {
          fullName: agreement.client_full_name,
          // Prefer API-normalized phone so signup matches exactly
          phone: agreement.client_phone || phone.trim() || undefined,
        }
      );

      const { firstName, lastName } = splitFullName(agreement.client_full_name);
      const phoneParts = parsePhoneForCheckout(phone.trim() || agreement.client_phone || '');
      saveCheckoutDraft({
        firstName,
        lastName,
        email: agreement.client_email,
        countryCode: phoneParts.countryCode,
        phoneNumber: phoneParts.phoneNumber,
      });

      toast.success('Agreement signed successfully.');
      router.push(next === 'signup' ? '/signup' : '/payment');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to submit agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  const inClientSignBlock = (idx: number) => {
    const { clientSignIdx, scheduleIdx } = sections;
    if (clientSignIdx < 0) return false;
    const end = scheduleIdx > clientSignIdx ? scheduleIdx : documentParagraphs.length;
    return idx > clientSignIdx && idx < end;
  };

  const inAcademySignBlock = (idx: number) => {
    const { academySignIdx, clientSignIdx } = sections;
    if (academySignIdx < 0) return false;
    const end = clientSignIdx > academySignIdx ? clientSignIdx : documentParagraphs.length;
    return idx > academySignIdx && idx < end;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 py-6 px-4 sm:px-6 lg:px-8 ${
        step === 'agreement' ? 'pb-32' : 'pb-10'
      }`}
    >
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
        {inviteFlow !== 'paid' && (
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

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {documentTitle}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
            {step === 'details'
              ? 'Enter your details first. We’ll then show the agreement with your information filled in.'
              : `Review the filled agreement, sign, then ${
                  next === 'signup' ? 'continue to free registration' : 'continue to payment'
                }.`}
          </p>

          {inviteFlow === 'free' && inviteEmailLocked && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              You are registering with a free invite link. You will sign the{' '}
              <strong>Free Membership Agreement</strong>. Your email is locked to{' '}
              <strong>{email}</strong> and this link expires in 7 days.
            </div>
          )}

          {inviteFlow === 'free' && !inviteEmailLocked && inviteToken && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              You are registering with a free membership invite. Enter your details and sign the{' '}
              <strong>Free Membership Agreement</strong>.
            </div>
          )}

          {inviteEmailLocked && inviteFlow === 'paid' && (
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              You are registering with a paid invite link. Your email is locked to{' '}
              <strong>{email}</strong>. After signing, you&apos;ll complete payment and set up your account.
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                step === 'details'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
              }`}
            >
              1. Your details
            </span>
            <span className="text-gray-400">→</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                step === 'agreement'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              2. Review &amp; sign
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
            {agreementType !== 'free_membership' && (
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                Fee {config?.formatted_fee ?? '£3,000'}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-green-600" />
              Secure e-sign
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              PDF emailed automatically after you verify your email
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {step === 'details' ? (
          <form
            onSubmit={handleContinueToAgreement}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-4 sm:px-8 flex items-center gap-3 text-white">
              <UserRound className="w-6 h-6 text-green-400 shrink-0" />
              <div>
                <p className="font-bold text-sm sm:text-base">Your details</p>
                <p className="text-blue-100 text-xs sm:text-sm">
                  These will be filled into the agreement automatically
                </p>
              </div>
            </div>

            <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full legal name *
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full legal name"
                  className={`${fillInput} mt-1.5`}
                  autoComplete="name"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address *
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full postal address"
                  rows={3}
                  className={`${fillInput} mt-1.5`}
                  autoComplete="street-address"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-xs">
                Date of birth *
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className={`${fillInput} mt-1.5`}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                  <input
                    type="email"
                    required
                    value={email}
                    readOnly={inviteEmailLocked}
                    onChange={(e) => {
                      if (inviteEmailLocked) return;
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => {
                      if (email.trim()) {
                        void verifyEmailAvailable(email, { toastOnFail: true });
                      }
                    }}
                    placeholder="you@example.com"
                    className={`${fillInput} mt-1.5 ${inviteEmailLocked ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : ''}`}
                    autoComplete="email"
                  />
                  {checkingEmail && (
                    <p className="text-xs text-gray-500 mt-1">Checking email…</p>
                  )}
                  {emailError && (
                    <p className="text-xs text-red-600 mt-1">
                      {emailError}{' '}
                      <Link href="/login" className="underline font-semibold text-blue-700">
                        Log in
                      </Link>
                    </p>
                  )}
                </label>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone *
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    onBlur={() => {
                      if (phone.trim()) {
                        void verifyPhoneAvailable(phone, { toastOnFail: true });
                      }
                    }}
                    placeholder="+44 7712 345678"
                    className={`${fillInput} mt-1.5`}
                    autoComplete="tel"
                  />
                  {checkingPhone && (
                    <p className="text-xs text-gray-500 mt-1">Checking phone…</p>
                  )}
                  {phoneError && (
                    <p className="text-xs text-red-600 mt-1">
                      {phoneError}{' '}
                      <Link href="/login" className="underline font-semibold text-blue-700">
                        Log in
                      </Link>
                    </p>
                  )}
                </label>
              </div>

              <div className="pt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="submit"
                  // Prevent input blur from disabling this button before the click lands
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={continuing || !!emailError || !!phoneError}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 transition-all"
                >
                  {continuing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {continuing ? 'Checking details…' : 'Continue to agreement'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 shadow-sm p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Details filled into agreement
                  </p>
                  <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <dt className="text-xs text-gray-500">Name</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{fullName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Date of birth</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">
                        {formatDobDisplay(dob)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Email</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Phone</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{phone}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-gray-500">Address</dt>
                      <dd className="font-medium text-gray-900 dark:text-white whitespace-pre-line">
                        {address}
                      </dd>
                    </div>
                  </dl>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('details');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300"
                >
                  Edit details
                </button>
              </div>
            </div>

            <form
              id="training-agreement-form"
              onSubmit={handleSubmit}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-4 sm:px-8 flex items-center gap-3 text-white">
                <ShieldCheck className="w-6 h-6 text-green-400 shrink-0" />
                <div>
                  <p className="font-bold text-sm sm:text-base">Freedom Property Academy</p>
                  <p className="text-blue-100 text-xs sm:text-sm">{documentTitle}</p>
                </div>
              </div>

              <div className="space-y-3 px-5 py-6 sm:px-8 sm:py-8 text-sm">
                {documentParagraphs.length === 0 ? (
                  <p className="text-red-600">Agreement text could not be loaded.</p>
                ) : (
                  documentParagraphs.map((para, idx) => {
                    if (isTitle(para)) {
                      return (
                        <p
                          key={idx}
                          className={`text-center font-extrabold tracking-wide text-gray-900 dark:text-white ${
                            para === 'FREEDOM PROPERTY ACADEMY'
                              ? 'text-lg sm:text-xl'
                              : 'text-sm sm:text-base text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {para}
                        </p>
                      );
                    }

                    if (isFreeClientPartyContinuation(para)) {
                      return null;
                    }

                    if (isClientPartyLine(para)) {
                      return (
                        <p
                          key={idx}
                          className="my-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 text-gray-800 dark:text-gray-200 leading-relaxed"
                        >
                          {filledPartyLine}
                        </p>
                      );
                    }

                    if (
                      para === 'Signed by the Client:' ||
                      para.startsWith('Signed for and on behalf of')
                    ) {
                      return (
                        <p
                          key={idx}
                          className="pt-5 font-bold text-gray-900 dark:text-white text-base"
                        >
                          {para}
                        </p>
                      );
                    }

                    if (inClientSignBlock(idx) && isBlankLine(para)) {
                      if (para.startsWith('Name:')) {
                        return (
                          <p key={idx} className="text-gray-700 dark:text-gray-300">
                            Name:{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {fullName.trim()}
                            </span>
                          </p>
                        );
                      }
                      if (para.startsWith('Signature:')) {
                        return (
                          <div
                            key={idx}
                            className="my-3 space-y-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 p-4 sm:p-5"
                          >
                            <div className="flex items-center gap-2 text-sm font-bold text-green-800 dark:text-green-300">
                              <PenLine className="w-4 h-4" />
                              Client signature
                            </div>
                            <SignaturePad onChange={setSignature} />
                          </div>
                        );
                      }
                      if (para.startsWith('Date:')) {
                        return (
                          <p key={idx} className="text-gray-700 dark:text-gray-300">
                            Date:{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {new Date().toLocaleDateString('en-GB')}
                            </span>
                          </p>
                        );
                      }
                    }

                    if (inAcademySignBlock(idx)) {
                      const signatory = config?.academy_signatory;
                      if (para.startsWith('Name:')) {
                        return (
                          <p key={idx} className="text-gray-700 dark:text-gray-300">
                            Name:{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {signatory?.name || 'Andrei Bosancu'}
                            </span>
                          </p>
                        );
                      }
                      if (para.startsWith('Position:')) {
                        return (
                          <p key={idx} className="text-gray-700 dark:text-gray-300">
                            Position:{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {signatory?.position || 'CEO'}
                            </span>
                          </p>
                        );
                      }
                      if (para.startsWith('Signature:')) {
                        return signatory?.signature_data_url ? (
                          <div key={idx} className="my-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Signature:</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={signatory.signature_data_url}
                              alt="Freedom Property Academy signature"
                              className="max-h-20 border border-gray-200 dark:border-gray-700 rounded-lg bg-white p-2"
                            />
                          </div>
                        ) : (
                          <p key={idx} className="text-gray-400 dark:text-gray-500">
                            {para}
                          </p>
                        );
                      }
                      if (para.startsWith('Date:')) {
                        return (
                          <p key={idx} className="text-gray-700 dark:text-gray-300">
                            Date:{' '}
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {signatory?.date_display ||
                                new Date().toLocaleDateString('en-GB')}
                            </span>
                          </p>
                        );
                      }
                    }

                    if (inAcademySignBlock(idx) && isBlankLine(para)) {
                      return (
                        <p key={idx} className="text-gray-400 dark:text-gray-500">
                          {para}
                        </p>
                      );
                    }

                    if (isScheduleInsertLine(para) && agreementType === 'training') {
                      return (
                        <div
                          key={idx}
                          className="my-3 space-y-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 sm:p-5"
                        >
                          <p className="text-gray-700 dark:text-gray-300">
                            Total Fee:{' '}
                            <strong className="text-blue-700 dark:text-blue-400">
                              {config?.formatted_fee ?? '£3,000'}
                            </strong>
                          </p>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Payment
                            <select
                              className={`${fillInput} mt-1.5`}
                              value={paymentPlan}
                              onChange={(e) =>
                                setPaymentPlan(e.target.value as 'full' | 'instalments')
                              }
                            >
                              <option value="full">
                                in full on or before the Commencement Date
                              </option>
                              <option value="instalments">
                                in instalments as set out in Schedule 1
                              </option>
                            </select>
                          </label>
                          {paymentPlan === 'instalments' && (
                            <textarea
                              value={scheduleNotes}
                              onChange={(e) => setScheduleNotes(e.target.value)}
                              rows={3}
                              className={fillInput}
                              placeholder="Instalment plan, payment method, and due dates"
                            />
                          )}
                        </div>
                      );
                    }

                    if (isHeading(para)) {
                      return (
                        <p
                          key={idx}
                          className="pt-4 font-bold text-gray-900 dark:text-white"
                        >
                          {para}
                        </p>
                      );
                    }

                    return (
                      <p
                        key={idx}
                        className="text-gray-700 dark:text-gray-300 leading-relaxed"
                      >
                        {para}
                      </p>
                    );
                  })
                )}
              </div>
            </form>
          </>
        )}
      </div>

      {step === 'agreement' && (
        <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <label className="flex max-w-xl items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                form="training-agreement-form"
              />
              <span>
                I have read, understood, and agree to be bound by this Agreement.
              </span>
            </label>
            <button
              type="submit"
              form="training-agreement-form"
              onMouseDown={(e) => e.preventDefault()}
              disabled={submitting || !!emailError || !!phoneError}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:from-green-700 hover:to-green-800 disabled:opacity-60 transition-all"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {submitLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
