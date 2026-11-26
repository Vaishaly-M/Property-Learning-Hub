import api from './api';

export interface PaymentConfig {
  publishable_key: string;
  product_name: string;
  amount: number;
  currency: string;
  formatted_amount: string;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  payment_id: number;
}

export interface VerifyPaymentResponse {
  status: string;
  paid: boolean;
  available_for_registration: boolean;
  customer_email: string | null;
  formatted_amount: string;
  payment_intent_id: string;
}

export interface RegisterAfterPaymentPayload {
  payment_intent_id: string;
  agreement_token: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  password: string;
  password_confirmation: string;
  role?: 'learner' | 'instructor';
  paid_invite_token?: string;
}

export interface RegisterAfterPaymentResponse {
  success: boolean;
  message: string;
  verification_email_sent: boolean;
  access_token: string;
  token_type: string;
  redirect_to: string;
  set_password_url?: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    profile_completed: boolean;
    email_verified: boolean;
  };
}

type ApiEnvelope<T> = { success: boolean; data: T };

export const paymentService = {
  getConfig: async (): Promise<PaymentConfig> => {
    const res = (await api.get('/payment/config')) as ApiEnvelope<PaymentConfig>;
    return res.data;
  },

  createPaymentIntent: async (
    email?: string,
    agreementToken?: string,
    paidInviteToken?: string,
  ): Promise<PaymentIntentResponse> => {
    const res = (await api.post('/payment/payment-intent', {
      ...(email ? { email } : {}),
      agreement_token: agreementToken,
      ...(paidInviteToken ? { paid_invite_token: paidInviteToken } : {}),
    })) as ApiEnvelope<PaymentIntentResponse>;
    return res.data;
  },

  verifyPayment: async (paymentIntentId: string): Promise<VerifyPaymentResponse> => {
    const res = (await api.get('/payment/verify', {
      params: { payment_intent_id: paymentIntentId },
    })) as ApiEnvelope<VerifyPaymentResponse>;
    return res.data;
  },

  registerAfterPayment: (payload: RegisterAfterPaymentPayload) =>
    api.post('/payment/register', payload) as Promise<RegisterAfterPaymentResponse>,
};
