// src/services/contractsApi.ts
import api from '../services/api';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS } from './mediaUploadService';

export interface ContractTemplate {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  purchased: boolean;
  isOwner: boolean;
  isGlobal: boolean;
  hasFile: boolean;
  fileName: string | null;
  fileSize: string | null;
  mimeType: string | null;
  creator: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
  fileUrl?: string;
}

export interface ContractsResponse {
  success: boolean;
  data: ContractTemplate[];
}

export interface ContractResponse {
  success: boolean;
  data: ContractTemplate;
  message?: string;
}

export interface CreateTemplatePayload {
  title: string;
  category: string;
  description?: string;
  price?: number;
  file?: File;
  is_global?: boolean;
}

export const contractsApi = {
  list(params?: { search?: string; category?: string }): Promise<ContractsResponse> {
    return api.get('/learner/contracts', { params });
  },

  show(id: number): Promise<ContractResponse> {
    return api.get(`/learner/contracts/${id}`);
  },

  async create(payload: CreateTemplatePayload): Promise<ContractResponse> {
    const form = await buildFormData(payload);
    return api.post('/learner/contracts', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async update(id: number, payload: Partial<CreateTemplatePayload>): Promise<ContractResponse> {
    const form = await buildFormData(payload);
    return api.post(`/learner/contracts/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  remove(id: number): Promise<{ success: boolean; message: string }> {
    return api.delete(`/learner/contracts/${id}`);
  },

  async download(id: number, fileName: string): Promise<void> {
    const response = await api.get(`/learner/contracts/${id}/download`, {
      responseType: 'blob',
    });

    const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'contract';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  purchase(id: number): Promise<ContractResponse> {
    return api.post(`/learner/contracts/${id}/purchase`);
  },

  esign(
    id: number,
    payload: { signers: { name: string; email: string }[]; email_subject?: string }
  ): Promise<{ success: boolean; message: string; stub?: object }> {
    return api.post(`/learner/contracts/${id}/esign`, payload);
  },

  myTemplates(): Promise<ContractsResponse> {
    return api.get('/learner/contracts/my-templates');
  },

  purchased(): Promise<ContractsResponse> {
    return api.get('/learner/contracts/purchased');
  },
};

async function buildFormData<T extends object>(payload: T): Promise<FormData> {
  const form = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;

    if (value instanceof File) {
      await appendMediaToFormData(form, value, MEDIA_UPLOAD_PRESETS.contractFile);
    } else if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0');
    } else {
      form.append(key, String(value));
    }
  }

  return form;
}
