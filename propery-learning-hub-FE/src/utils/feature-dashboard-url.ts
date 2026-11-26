/**
 * Map InfinitWizard feature slug → product dashboard SSO URL.
 * Mirrors infinitwizard-landing/src/utils/feature-dashboard-url.ts
 */

const FEATURE_URL_DEFAULTS: Record<string, string> = {
  invoice: 'https://invoice.infinitwizard.io',
  docusign: 'https://infinitdoc.com',
  docu_sign: 'https://infinitdoc.com',
  crm: 'https://infinitcrm.com',
};

const FEATURE_URL_MAP: Record<string, string | undefined> = {
  invoice: process.env.NEXT_PUBLIC_INVOICE_URL,
  docusign: process.env.NEXT_PUBLIC_DOCUSIGN_URL,
  docu_sign: process.env.NEXT_PUBLIC_DOCUSIGN_URL,
  crm: process.env.NEXT_PUBLIC_CRM_URL,
};

const DISPLAY_NAME_TO_SLUG: Record<string, string> = {
  invoice: 'invoice',
  invoicing: 'invoice',
  crm: 'crm',
  'docu sign': 'docusign',
  docu_sign: 'docusign',
  docusign: 'docusign',
  docs: 'docusign',
  document: 'docusign',
  documents: 'docusign',
  infinitdoc: 'docusign',
};

function normalizeFeatureSlug(featureSlug: string): string {
  const normalized = featureSlug.toLowerCase().trim().replace(/-/g, '_');
  return (
    DISPLAY_NAME_TO_SLUG[normalized] ??
    DISPLAY_NAME_TO_SLUG[normalized.replace(/_/g, ' ')] ??
    normalized.replace(/\s+/g, '_')
  );
}

export function getFeatureDashboardUrl(featureSlug: string | undefined): string | null {
  if (!featureSlug || typeof featureSlug !== 'string') return null;
  const slug = normalizeFeatureSlug(featureSlug);
  const fromEnv = FEATURE_URL_MAP[slug] || FEATURE_URL_MAP[featureSlug.toLowerCase().trim()];
  const url = (fromEnv && fromEnv.trim()) || FEATURE_URL_DEFAULTS[slug] || '';
  return url ? url.replace(/\/+$/, '') : null;
}

/**
 * One-click SSO into a feature app using the InfinitWizard Passport token.
 * - InfinitDoc: /dashboard?token=...&sso=1
 * - Invoice / CRM: /auth/sso?token=...
 */
export function getFeatureDashboardSsoUrl(
  featureSlug: string | undefined,
  token: string | null,
): string | null {
  const base = getFeatureDashboardUrl(featureSlug);
  if (!base) return null;

  const slug = normalizeFeatureSlug(featureSlug || '');
  const isDocuSign = slug === 'docusign' || slug === 'docu_sign';

  if (isDocuSign) {
    if (token) {
      return `${base}/dashboard?token=${encodeURIComponent(token)}&sso=1`;
    }
    return `${base}/dashboard`;
  }

  const tokenParam = token ? encodeURIComponent(token) : '';
  return `${base}/auth/sso?token=${tokenParam}`;
}

export type InfinitWizardFeatureSlug = 'invoice' | 'crm' | 'docusign';
