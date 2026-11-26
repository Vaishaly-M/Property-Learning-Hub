export const PAID_INVITE_TOKEN_KEY = 'paid_invite_token';
export const PAID_INVITE_EMAIL_KEY = 'paid_invite_email';
export const PAID_INVITE_ONBOARDING_KEY = 'paid_invite_onboarding';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export type PaidInviteStatus = 'generated' | 'open' | 'signed' | 'joined' | 'expired';

export interface PaidUserInvite {
  id: number;
  token: string;
  email: string;
  status: PaidInviteStatus;
  invite_url: string;
  expires_at: string;
  opened_at?: string | null;
  signed_at?: string | null;
  joined_at?: string | null;
  email_sent_at?: string | null;
  created_at: string;
  created_by?: {
    id: number;
    name: string;
    email: string;
  } | null;
  user_id?: number | null;
  training_agreement_id?: number | null;
  academy_payment_id?: number | null;
}

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

class PaidInviteService {
  storeInviteSession(token: string, email: string): void {
    sessionStorage.setItem(PAID_INVITE_TOKEN_KEY, token);
    sessionStorage.setItem(PAID_INVITE_EMAIL_KEY, email);
    sessionStorage.setItem(PAID_INVITE_ONBOARDING_KEY, '1');
  }

  clearInviteSession(): void {
    sessionStorage.removeItem(PAID_INVITE_TOKEN_KEY);
    sessionStorage.removeItem(PAID_INVITE_EMAIL_KEY);
    sessionStorage.removeItem(PAID_INVITE_ONBOARDING_KEY);
  }

  startOnboarding(): void {
    sessionStorage.setItem(PAID_INVITE_ONBOARDING_KEY, '1');
  }

  isOnboarding(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      sessionStorage.getItem(PAID_INVITE_ONBOARDING_KEY) === '1' &&
      !!sessionStorage.getItem(PAID_INVITE_TOKEN_KEY)
    );
  }

  finishOnboarding(): void {
    sessionStorage.removeItem(PAID_INVITE_ONBOARDING_KEY);
    sessionStorage.removeItem(PAID_INVITE_TOKEN_KEY);
    sessionStorage.removeItem(PAID_INVITE_EMAIL_KEY);
  }

  getInviteToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(PAID_INVITE_TOKEN_KEY);
  }

  getInviteEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(PAID_INVITE_EMAIL_KEY);
  }

  async visit(token: string): Promise<{ email: string; expires_at: string; status: PaidInviteStatus }> {
    const res = await fetch(`${API_BASE_URL}/paid-invites/${token}/visit`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invite link is invalid or expired.');
    }
    return data.data;
  }

  async adminList(params?: {
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ data: PaidUserInvite[]; meta?: Record<string, unknown> }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));

    const res = await fetch(`${API_BASE_URL}/admin/paid-invites?${query}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load paid invite links.');
    }
    return {
      data: data.data?.data || data.data || [],
      meta: data.data,
    };
  }

  async adminCreate(email: string): Promise<PaidUserInvite & { email_sent?: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/paid-invites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create paid invite link.');
    }
    return {
      ...data.data,
      email_sent: Boolean(data.email_sent ?? data.data?.email_sent_at),
      message: data.message,
    };
  }

  async adminResend(id: number): Promise<PaidUserInvite & { email_sent?: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/paid-invites/${id}/resend`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to resend invite email.');
    }
    return {
      ...data.data,
      email_sent: Boolean(data.email_sent ?? data.data?.email_sent_at),
      message: data.message,
    };
  }
}

export default new PaidInviteService();
