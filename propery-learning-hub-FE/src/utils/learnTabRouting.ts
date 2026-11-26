// utils/learnTabRouting.ts

/** URL query values that map to the Deal Marketplace sidebar section. */
export const DEAL_MARKETPLACE_QUERY_TABS = new Set([
  'deals',
  'featured',
  'my_deals',
  'pending',
  'rejected',
  'verified',
]);

/** URL query values that map to the Deal Review sidebar section. */
export const DEAL_REVIEW_QUERY_TABS = new Set([
  'my_deals',
  'pending',
  'rejected',
  'verified',
]);

/** URL query values that map to the Business Journal sidebar section. */
export const BUSINESS_JOURNAL_QUERY_TABS = new Set([
  'business-journal',
  'business-journal-mission',
  'business-journal-activities',
  'business-journal-notes',
  'business-journal-documents',
  
]);

export const SIDEBAR_TAB_MAP: Record<string, string> = {
  // Deal Marketplace tabs
  deals: 'Deal Marketplace',
  featured: 'Deal Marketplace',
  my_deals: 'Deal Marketplace',
  pending: 'Deal Marketplace',
  rejected: 'Deal Marketplace',
  verified: 'Deal Review',
  // Business Journal tabs
  'business-journal': 'Business Journal',
  'business-journal-mission': 'Business Journal',
  'business-journal-activities': 'Business Journal',
  'business-journal-notes': 'Business Journal',
  'business-journal-documents': 'Business Journal',

  // Other tabs
  webinars: 'Webinars',
  learn: 'Learn',
  meetings: 'Meetings',
};

/** Map a `?tab=` query value to the learner sidebar label. */
export function resolveSidebarTab(tab: string | null, dealId?: string | null): string {
  if (tab && SIDEBAR_TAB_MAP[tab]) {
    return SIDEBAR_TAB_MAP[tab];
  }
  if (dealId) {
    return 'Deal Marketplace';
  }
  return 'Dashboard';
}

/** Map a `?tab=` query value to the Deals component internal sub-tab id. */
export function mapQueryTabToDealsTab(tab: string | null): string | null {
  switch (tab) {
    case 'deals':
      return 'all';
    case 'featured':
      return 'featured';
    case 'my_deals':
      return 'my_deals';
    case 'pending':
      return 'pending';
    case 'rejected':
      return 'rejected';
    case 'verified':
      return 'verified';
    default:
      return null;
  }
}

/** Map Deals internal sub-tab id to a `?tab=` query value. */
export function mapDealsTabToQueryTab(tab: string): string {
  return tab === 'all' ? 'deals' : tab;
}

/** Preserve an existing deal sub-tab when re-selecting Deal Marketplace in the sidebar. */
export function resolveDealMarketplaceQueryTab(currentTab: string | null): string {
  if (currentTab && DEAL_MARKETPLACE_QUERY_TABS.has(currentTab)) {
    return currentTab;
  }
  return 'deals';
}

/** Preserve an existing business journal sub-tab when re-selecting Business Journal in the sidebar. */
export function resolveBusinessJournalQueryTab(currentTab: string | null): string {
  if (currentTab && BUSINESS_JOURNAL_QUERY_TABS.has(currentTab)) {
    return currentTab;
  }
  return 'business-journal';
}

/** Map Business Journal internal sub-tab to query parameter */
export function mapBusinessJournalTabToQuery(tab: string): string {
  const tabMap: Record<string, string> = {
    'mission': 'business-journal-mission',
    'activities': 'business-journal-activities',
    'notes': 'business-journal-notes',
    'documents': 'business-journal-documents',
   
  };
  return tabMap[tab] || 'business-journal';
}

/** Map query parameter to Business Journal internal sub-tab */
export function mapQueryToBusinessJournalTab(queryTab: string | null): string {
  if (!queryTab) return 'mission';
  
  const queryMap: Record<string, string> = {
    'business-journal-mission': 'mission',
    'business-journal-activities': 'activities',
    'business-journal-notes': 'notes',
    'business-journal-documents': 'documents',
 
  };
  
  return queryMap[queryTab] || 'mission';
}