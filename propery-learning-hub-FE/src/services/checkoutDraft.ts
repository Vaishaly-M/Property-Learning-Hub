export interface CheckoutDraft {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
}

const STORAGE_KEY = 'academy_checkout_draft';

export const emptyCheckoutDraft: CheckoutDraft = {
  firstName: '',
  lastName: '',
  email: '',
  countryCode: '+44',
  phoneNumber: '',
};

export function loadCheckoutDraft(): CheckoutDraft {
  if (typeof window === 'undefined') return emptyCheckoutDraft;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyCheckoutDraft;
    return { ...emptyCheckoutDraft, ...JSON.parse(raw) };
  } catch {
    return emptyCheckoutDraft;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem('academy_payment_intent');
}
