export const FREE_INVITE_TOKEN_KEY = 'free_invite_token';
export const FREE_INVITE_EMAIL_KEY = 'free_invite_email';
export const FREE_INVITE_OPEN_KEY = 'free_invite_open';
/** Survives signup → email verify so we always land on the thank-you page. */
export const FREE_REGISTRATION_PENDING_KEY = 'free_registration_pending';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

export type FreeInviteStatus = 'generated' | 'clicked' | 'joined' | 'expired';

export interface FreeRegistrationInvite {
  id: number;
  token: string;
  email: string | null;
  is_open?: boolean;
  status: FreeInviteStatus;
  invite_url: string;
  expires_at: string | null;
  clicked_at?: string | null;
  joined_at?: string | null;
  email_sent_at?: string | null;
  created_at: string;
  created_by?: {
    id: number;
    name: string;
    email: string;
  } | null;
  user_id?: number | null;
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

class FreeInviteService {
  storeInviteSession(token: string, email?: string | null, isOpen = false): void {
    sessionStorage.setItem(FREE_INVITE_TOKEN_KEY, token);
    if (email) {
      sessionStorage.setItem(FREE_INVITE_EMAIL_KEY, email);
    } else {
      sessionStorage.removeItem(FREE_INVITE_EMAIL_KEY);
    }
    if (isOpen) {
      sessionStorage.setItem(FREE_INVITE_OPEN_KEY, '1');
    } else {
      sessionStorage.removeItem(FREE_INVITE_OPEN_KEY);
    }
  }

  clearInviteSession(): void {
    sessionStorage.removeItem(FREE_INVITE_TOKEN_KEY);
    sessionStorage.removeItem(FREE_INVITE_EMAIL_KEY);
    sessionStorage.removeItem(FREE_INVITE_OPEN_KEY);
  }

  isOpenInvite(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(FREE_INVITE_OPEN_KEY) === '1';
  }

  markRegistrationPending(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(FREE_REGISTRATION_PENDING_KEY, '1');
  }

  isRegistrationPending(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(FREE_REGISTRATION_PENDING_KEY) === '1';
  }

  clearRegistrationPending(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(FREE_REGISTRATION_PENDING_KEY);
  }

  clearAuthSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem('admin');
      document.cookie = 'token=; path=/; max-age=0; SameSite=Lax';
    } catch {
      /* ignore */
    }
  }

  getInviteToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FREE_INVITE_TOKEN_KEY);
  }

  getInviteEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FREE_INVITE_EMAIL_KEY);
  }

  async visit(token: string): Promise<{
    email: string | null;
    is_open?: boolean;
    expires_at: string | null;
    status: FreeInviteStatus;
  }> {
    const res = await fetch(`${API_BASE_URL}/free-invites/${token}/visit`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invite link is invalid or expired.');
    }
    return data.data;
  }

  async adminGetOpenLink(): Promise<FreeRegistrationInvite> {
    const res = await fetch(`${API_BASE_URL}/admin/free-invites/open-link`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to load open invite link.');
    }
    return data.data;
  }

  async adminList(params?: {
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ data: FreeRegistrationInvite[]; meta?: Record<string, unknown> }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.per_page) query.set('per_page', String(params.per_page));

    const res = await fetch(`${API_BASE_URL}/admin/free-invites?${query}`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to load invite links.');
    }
    return {
      data: data.data?.data || data.data || [],
      meta: data.data,
    };
  }

  async adminCreate(
    emailsInput: string
  ): Promise<{
    email_sent?: boolean;
    message?: string;
    created_count?: number;
    failed_count?: number;
    failed?: Array<{ email: string; error: string }>;
    data?: FreeRegistrationInvite | FreeRegistrationInvite[];
    invite_url?: string;
  } & Partial<FreeRegistrationInvite>> {
    const res = await fetch(`${API_BASE_URL}/admin/free-invites`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email: emailsInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to create invite link.');
    }

    const first =
      Array.isArray(data.data) && data.data.length > 0
        ? data.data[0]
        : !Array.isArray(data.data)
          ? data.data
          : null;

    return {
      ...(first || {}),
      email_sent: Boolean(data.email_sent ?? first?.email_sent_at),
      message: data.message,
      created_count: data.created_count,
      failed_count: data.failed_count,
      failed: data.failed,
      data: data.data,
      invite_url: first?.invite_url,
    };
  }

  async adminResend(id: number): Promise<FreeRegistrationInvite & { email_sent?: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/free-invites/${id}/resend`, {
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

export default new FreeInviteService();
