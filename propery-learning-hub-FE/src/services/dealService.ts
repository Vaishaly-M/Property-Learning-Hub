//services/dealService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export type ListingKind = 'marketplace' | 'review';

export interface DealFilters {
  search?: string;
  status?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_roi?: number;
  location?: string;
  sort_by?: 'published_at' | 'price' | 'roi' | 'views' | 'created_at';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
  tab?: string;
  featured?: boolean;
  listing_kind?: ListingKind;
}

function learnerDealBase(listingKind?: ListingKind | string): string {
  return listingKind === 'review'
    ? `${API_BASE_URL}/learner/deal-review`
    : `${API_BASE_URL}/learner/deal-marketplace`;
}

function adminDealBase(listingKind?: ListingKind | string): string {
  return listingKind === 'review'
    ? `${API_BASE_URL}/admin/deal-review`
    : `${API_BASE_URL}/admin/deal-marketplace`;
}

function listingKindFromFormData(dealData: FormData): ListingKind | undefined {
  const value = dealData.get('listing_kind');
  return value === 'review' || value === 'marketplace' ? value : undefined;
}

export const dealService = {
  // ==========================================
  // INSTRUCTOR METHODS
  // ==========================================
  
  async getDeals(filters?: { search?: string; status?: string; listing_kind?: string; tab?: string; per_page?: string; page?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getStats() {
    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/stats`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getOptions() {
    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/options`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async createDeal(dealData: FormData) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace`, {
      method: 'POST',
      headers: headers,
      body: dealData,
    });
    return this.handleResponse(response);
  },

  async updateDeal(id: number | string, dealData: FormData) {
    const token = this.getToken();
    dealData.append('_method', 'PUT');
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/${id}`, {
      method: 'POST',
      headers: headers,
      body: dealData,
    });
    return this.handleResponse(response);
  },

  async deleteDeal(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async publishDeal(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/${id}/publish`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async closeDeal(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/${id}/close`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async toggleFeatured(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/admin/deal-marketplace/${id}/toggle-featured`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 404 || response.status === 405) {
      const fallback = await fetch(`${API_BASE_URL}/instructor/deal-marketplace/${id}/toggle-featured`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(fallback);
    }

    return this.handleResponse(response);
  },

  async getMyDeals(filters?: { search?: string; status?: string; per_page?: number }) {
    const params = new URLSearchParams(filters as any).toString();
    const response = await fetch(`${API_BASE_URL}/instructor/my-deals?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async incrementInquiries(_id: number | string) {
    // Deprecated: email inquiries must not increment counts.
    return {
      success: false,
      message: 'This endpoint is no longer supported.',
    };
  },

  // ==========================================
  // ADMIN METHODS
  // ==========================================
  
  async adminGetDeals(filters?: { search?: string; status?: string; listing_kind?: string; tab?: string; per_page?: string; page?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    const response = await fetch(`${adminDealBase(filters?.listing_kind)}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async adminGetDealById(id: number | string, listingKind?: ListingKind | string) {
    const response = await fetch(`${adminDealBase(listingKind)}/${id}`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse(response);
    return data.data ?? null;
  },

  async adminCreateDeal(dealData: FormData) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const response = await fetch(adminDealBase(listingKindFromFormData(dealData)), {
      method: 'POST',
      headers: headers,
      body: dealData,
    });
    return this.handleResponse(response);
  },

  async adminUpdateDeal(id: number | string, dealData: FormData) {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const response = await fetch(`${adminDealBase(listingKindFromFormData(dealData))}/${id}`, {
      method: 'POST',
      headers: headers,
      body: dealData,
    });
    return this.handleResponse(response);
  },

  async adminDeleteDeal(id: number | string, listingKind?: ListingKind | string) {
    const response = await fetch(`${adminDealBase(listingKind)}/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async getPendingDeals(filters?: { search?: string; listing_kind?: string }) {
    const params = new URLSearchParams(filters as any).toString();
    const response = await fetch(`${adminDealBase(filters?.listing_kind)}/pending?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  async approveDeal(id: number | string, listingKind?: ListingKind | string, approvalNote?: string) {
    const response = await fetch(`${adminDealBase(listingKind)}/${id}/approve`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        approval_note: approvalNote || undefined,
      }),
    });
    return this.handleResponse(response);
  },

  async rejectDeal(id: number | string, rejectionNote: string, listingKind?: ListingKind | string) {
    const response = await fetch(`${adminDealBase(listingKind)}/${id}/reject`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rejection_note: rejectionNote }),
    });
    return this.handleResponse(response);
  },

  // ==========================================
  // LEARNER METHODS
  // ==========================================

  /**
   * Get all published deals for learners with optional filters
   */
  async getLearnerDeals(filters?: DealFilters) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await fetch(`${learnerDealBase(filters?.listing_kind)}?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Get a single published deal by ID
   */
  async getLearnerDealById(id: number | string, listingKind?: ListingKind) {
    const response = await fetch(`${learnerDealBase(listingKind)}/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Publish a verified deal (learner)
   */
  async publishLearnerDeal(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/${id}/publish`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Send an approved Deal Review to the public marketplace
   */
  async sendDealToMarketplace(id: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-review/${id}/send-to-marketplace`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Create a deal (learner)
   */
  async learnerCreateDeal(dealData: FormData) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const response = await fetch(learnerDealBase(listingKindFromFormData(dealData)), {
      method: 'POST',
      headers: headers,
      body: dealData,
    });
    return this.handleResponse(response);
  },

  /**
   * Update a deal (learner)
   */
  async learnerUpdateDeal(id: number | string, dealData: FormData) {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };

    const response = await fetch(`${learnerDealBase(listingKindFromFormData(dealData))}/${id}`, {
      method: 'POST',
      headers: headers,
      body: dealData,
    });
    return this.handleResponse(response);
  },

  /**
   * Delete a deal (learner)
   */
  async learnerDeleteDeal(id: number | string, listingKind?: ListingKind) {
    const response = await fetch(`${learnerDealBase(listingKind)}/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Get featured deals
   */
  async getFeaturedDeals(filters?: DealFilters) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/featured/list?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Get favorite deals
   */
  async getFavoriteDeals(filters?: DealFilters) {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/favorites?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(dealId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/${dealId}/favorite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Get favorite status for a deal
   */
  async getFavoriteStatus(dealId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/${dealId}/favorite/status`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Record a view
   */
  async recordView(dealId: number | string) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/${dealId}/view`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Get deals by a specific mentor
   */
  async getDealsByMentor(mentorId: number | string, perPage: number = 10) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/mentor/${mentorId}?per_page=${perPage}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Record an inquiry for a deal
   */
  async recordInquiry(
    dealId: number | string,
    payload: { contact_type: 'call' | 'message'; message?: string }
  ) {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/${dealId}/inquiry`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  },

  /**
   * Get deal statistics for learners
   */
  async getLearnerStats() {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/stats/overview`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  /**
   * Get filter options for deals
   */
  async getFilterOptions() {
    const response = await fetch(`${API_BASE_URL}/learner/deal-marketplace/filters/options`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  },

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  },

  getToken() {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('auth_token') ||
        sessionStorage.getItem('token')
      );
    }
    return null;
  },

  async handleResponse(response: Response) {
    const data = await response.json();
    if (!response.ok || !data.success) {
      const error = new Error(data.message || 'Request failed') as Error & {
        errors?: Record<string, string[]>;
      };
      error.errors = data.errors;
      throw error;
    }
    return data;
  },
};

export default dealService;