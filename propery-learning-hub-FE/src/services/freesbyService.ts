const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface FreesbyTemplateLeadPayload {
  full_name: string;
  email: string;
  phone?: string;
  template: string;
}

export interface FreesbyTemplateLeadResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export async function submitFreesbyTemplateLead(
  payload: FreesbyTemplateLeadPayload,
): Promise<FreesbyTemplateLeadResponse> {
  const response = await fetch(`${API_BASE_URL}/public/freesby/template-request`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as FreesbyTemplateLeadResponse;

  if (!response.ok) {
    if (data.errors) {
      const message = Object.values(data.errors).flat().join(', ');
      throw new Error(message || 'Validation failed');
    }
    throw new Error(data.message || 'Failed to submit your request');
  }

  return data;
}
