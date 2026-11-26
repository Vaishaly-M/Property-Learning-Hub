import api from './api';

export type InfinitWizardSsoResult = {
  redirect_url: string;
  access_token: string;
  email: string;
  created: boolean;
};

function normalizeSsoResponse(res: any): InfinitWizardSsoResult {
  if (res?.success && res?.data?.redirect_url) {
    const data = res.data as {
      redirect_url: string;
      access_token?: string;
      email: string;
      created: boolean;
    };
    let accessToken = String(data.access_token || '').trim();
    if (!accessToken && data.redirect_url) {
      try {
        const token = new URL(data.redirect_url).searchParams.get('token');
        accessToken = token ? String(token) : '';
      } catch {
        /* ignore */
      }
    }
    return { ...data, access_token: accessToken };
  }
  throw new Error(res?.message || 'Unable to open InfinitWizard.');
}

/**
 * Open InfinitWizard from learner or admin portal.
 * Creates/activates IW VIP account and returns Passport access_token
 * for one-click Invoice / InfinitDoc SSO.
 */
export const infinitWizardService = {
  async openAsLearner(): Promise<InfinitWizardSsoResult> {
    const res: any = await api.post('/learner/infinitwizard/sso');
    return normalizeSsoResponse(res);
  },

  async openAsAdmin(): Promise<InfinitWizardSsoResult> {
    const res: any = await api.post('/admin/infinitwizard/sso');
    return normalizeSsoResponse(res);
  },
};
