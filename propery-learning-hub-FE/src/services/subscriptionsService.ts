import api from './api';

export interface AcademyPlan {
  name: string;
  amount: number;
  currency: string;
  formatted_amount: string;
  billing_type: 'one_time';
  enrolled_count: number;
  paid_awaiting_registration: number;
  features: string[];
}

export interface SubscriptionStat {
  value: number;
  formatted?: string;
  change: number | null;
  range?: string;
}

export interface AcademyEnrollment {
  id: number;
  customer: string;
  email: string | null;
  plan: string;
  amount: number;
  formatted_amount: string;
  status: string;
  enrolled_at: string | null;
  user_id: number | null;
  payment_intent_id: string | null;
}

export interface AcademyPaymentRecord {
  id: number;
  transaction_id: string;
  customer: string;
  email: string | null;
  plan: string;
  amount: number;
  formatted_amount: string;
  status: 'completed' | 'failed' | 'pending' | string;
  raw_status: string;
  date: string | null;
  user_id: number | null;
}

export interface SubscriptionsOverview {
  plan: AcademyPlan;
  stats: {
    total_revenue: SubscriptionStat;
    enrolled_members: SubscriptionStat;
    pending_payments: SubscriptionStat;
    failed_payments: SubscriptionStat;
    range_revenue: SubscriptionStat;
    success_rate: number | null;
  };
  enrollments: AcademyEnrollment[];
  payments: AcademyPaymentRecord[];
  recent_payments: AcademyPaymentRecord[];
}

type ApiEnvelope<T> = { success: boolean; data: T };

export const subscriptionsService = {
  getOverview: async (params?: {
    search?: string;
    status?: string;
    range?: string;
    tab?: string;
  }): Promise<SubscriptionsOverview> => {
    const res = (await api.get('/admin/subscriptions', { params })) as ApiEnvelope<SubscriptionsOverview>;
    return res.data;
  },
};
