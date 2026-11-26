const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const AGREEMENT_TOKEN_KEY = 'training_agreement_token';
export const AGREEMENT_EMAIL_KEY = 'training_agreement_email';
export const AGREEMENT_NAME_KEY = 'training_agreement_name';
export const AGREEMENT_PHONE_KEY = 'training_agreement_phone';

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function parsePhoneForCheckout(raw: string): {
  countryCode: string;
  phoneNumber: string;
} {
  const cleaned = raw.replace(/[\s\-()]/g, '');
  // Longest codes first so +971 wins over +91, +44 over +4, etc.
  const codes = ['+971', '+966', '+94', '+91', '+61', '+44', '+1'];
  for (const code of codes) {
    if (cleaned.startsWith(code)) {
      return {
        countryCode: code,
        phoneNumber: cleaned.slice(code.length).replace(/^0+/, ''),
      };
    }
  }
  // Digits-only international (e.g. 94769178622)
  const digitCodes = ['971', '966', '94', '91', '61', '44', '1'];
  const digitsOnly = cleaned.replace(/\D/g, '');
  for (const cc of digitCodes) {
    if (
      digitsOnly.startsWith(cc) &&
      digitsOnly.length > cc.length + 6 &&
      !cleaned.startsWith('0')
    ) {
      return {
        countryCode: `+${cc}`,
        phoneNumber: digitsOnly.slice(cc.length).replace(/^0+/, ''),
      };
    }
  }
  if (cleaned.startsWith('00')) {
    return parsePhoneForCheckout(`+${cleaned.slice(2)}`);
  }
  if (cleaned.startsWith('0')) {
    return { countryCode: '+44', phoneNumber: cleaned.slice(1).replace(/\D/g, '') };
  }
  // National digits without country code — keep as-is; do not invent a +44 prefix in storage.
  return { countryCode: '+44', phoneNumber: digitsOnly };
}

export type AgreementType = 'training' | 'free_membership';

export interface TrainingAgreementConfig {
  agreement_type?: AgreementType;
  document_title?: string;
  version: string;
  company_name: string;
  company_number: string;
  company_address: string;
  trading_as: string;
  fee_amount_pence: number;
  fee_currency: string;
  formatted_fee: string;
  privacy_policy_url: string;
  document_paragraphs?: string[];
  academy_signatory?: {
    name: string;
    position: string;
    signature_data_url?: string | null;
    date_display: string;
  };
}

export interface TrainingAgreement {
  id: number;
  public_token: string;
  status: 'client_signed' | 'completed' | string;
  agreement_type?: AgreementType;
  agreement_version: string;
  client_full_name: string;
  client_email: string;
  client_phone?: string | null;
  client_address: string;
  client_dob?: string | null;
  fee_amount_pence: number;
  fee_currency: string;
  formatted_fee: string;
  payment_plan: string;
  schedule_notes?: string | null;
  client_signed_at?: string | null;
  admin_signed_name?: string | null;
  admin_signed_position?: string | null;
  admin_signed_at?: string | null;
  completed_at?: string | null;
  has_pdf: boolean;
  pdf_emailed_at?: string | null;
  user_id?: number | null;
  academy_payment_id?: number | null;
  created_at?: string | null;
  client_signature_data?: string | null;
  admin_signature_data?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    email_verified?: boolean;
    email_verified_at?: string | null;
  } | null;
  admin_user?: { id: number; name: string; email: string } | null;
}

export interface ClientSignPayload {
  client_full_name: string;
  client_address: string;
  client_dob?: string;
  client_email: string;
  client_phone?: string;
  payment_plan?: 'full' | 'instalments';
  schedule_notes?: string;
  client_signature_data: string;
  accepted_terms: boolean;
  invite_token?: string;
  paid_invite_token?: string;
  agreement_type?: AgreementType;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { Accept: 'application/json' };
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('token');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleJson(response: Response) {
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const trainingAgreementService = {
  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(AGREEMENT_TOKEN_KEY);
  },

  storeSignedAgreement(
    token: string,
    email: string,
    extras?: { fullName?: string; phone?: string }
  ) {
    sessionStorage.setItem(AGREEMENT_TOKEN_KEY, token);
    sessionStorage.setItem(AGREEMENT_EMAIL_KEY, email);
    if (extras?.fullName) {
      sessionStorage.setItem(AGREEMENT_NAME_KEY, extras.fullName);
    }
    if (extras?.phone) {
      sessionStorage.setItem(AGREEMENT_PHONE_KEY, extras.phone);
    }
  },

  clearStoredAgreement() {
    sessionStorage.removeItem(AGREEMENT_TOKEN_KEY);
    sessionStorage.removeItem(AGREEMENT_EMAIL_KEY);
    sessionStorage.removeItem(AGREEMENT_NAME_KEY);
    sessionStorage.removeItem(AGREEMENT_PHONE_KEY);
  },

  async getConfig(agreementType: AgreementType = 'training'): Promise<TrainingAgreementConfig> {
    const res = await fetch(
      `${API_BASE_URL}/training-agreements/config?type=${encodeURIComponent(agreementType)}`,
      {
      headers: { Accept: 'application/json' },
      }
    );
    const data = await handleJson(res);
    return data.data;
  },

  async checkEmail(email: string): Promise<{ available: boolean; registered: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/training-agreements/check-email`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 409) {
      throw new Error(data.message || 'Unable to check email.');
    }
    return {
      available: Boolean(data.data?.available),
      registered: Boolean(data.data?.registered ?? !data.data?.available),
      message: data.message,
    };
  },

  async checkPhone(phone: string): Promise<{ available: boolean; registered: boolean; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/training-agreements/check-phone`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: phone.trim() }),
    });
    const data = await res.json();
    if (!res.ok && res.status !== 409) {
      throw new Error(data.message || 'Unable to check phone number.');
    }
    return {
      available: Boolean(data.data?.available),
      registered: Boolean(data.data?.registered ?? !data.data?.available),
      message: data.message,
    };
  },

  async getByToken(token: string): Promise<TrainingAgreement> {
    const res = await fetch(`${API_BASE_URL}/training-agreements/by-token/${token}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await handleJson(res);
    return data.data;
  },

  async clientSign(payload: ClientSignPayload): Promise<TrainingAgreement> {
    const res = await fetch(`${API_BASE_URL}/training-agreements/client-sign`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        accepted_terms: payload.accepted_terms ? 1 : 0,
      }),
    });
    const data = await handleJson(res);
    return data.data;
  },

  async adminList(params?: {
    status?: string;
    search?: string;
    agreement_type?: string;
    page?: number;
    per_page?: number;
    include_stats?: boolean;
  }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.agreement_type) qs.set('agreement_type', params.agreement_type);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.include_stats) qs.set('include_stats', '1');
    const res = await fetch(`${API_BASE_URL}/admin/training-agreements?${qs}`, {
      headers: getAuthHeaders(),
    });
    return handleJson(res);
  },

  async adminShow(id: number | string): Promise<TrainingAgreement> {
    const res = await fetch(`${API_BASE_URL}/admin/training-agreements/${id}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleJson(res);
    return data.data;
  },

  async adminAutoComplete(id: number | string): Promise<TrainingAgreement> {
    const res = await fetch(`${API_BASE_URL}/admin/training-agreements/${id}/auto-complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await handleJson(res);
    return data.data;
  },

  async adminComplete(
    id: number | string,
    payload: {
      admin_signature_data: string;
      admin_signed_name: string;
      admin_signed_position: string;
    }
  ): Promise<TrainingAgreement> {
    const res = await fetch(`${API_BASE_URL}/admin/training-agreements/${id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await handleJson(res);
    return data.data;
  },

  async adminDownloadPdf(id: number | string) {
    const res = await fetch(`${API_BASE_URL}/admin/training-agreements/${id}/pdf`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to download PDF');
    }
    return res.blob();
  },
};

export default trainingAgreementService;
