// services/businessJournalApi.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface JournalData {
  mission: string;
  visions: string[];
  roadmap: {
    id: number;
    goal: string;
    tasks: string[];
    completed: boolean[];
    deadline: string;
  }[];
}

export interface Note {
  id: number;
  title: string;
  content: string;
  type: string;
  author: string;
  authorName: string;
  sharedWith: string[];
  date: string;
  goal: string;
  checklist: string[];
  checkedItems: boolean[];
}

export interface Activity {
  id: number;
  title: string;
  date: string;
  status: 'pending' | 'completed';
}

export interface Document {
  id: number;
  title: string;
  content: string;
  templateId?: string;
  templateName?: string;
  author: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  sharedWith: string[];
  tags: string[];
  category?: string;
  status?: 'draft' | 'published' | 'archived';
  formData?: Record<string, any>;
  customQuestions?: any[];
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add auth token to requests
// NOTE: token is stored under the key 'token' by AdminAuthContext.establishSession()
// (localStorage.setItem('token', newToken)). It must be read with the same key here,
// otherwise every request goes out unauthenticated and gets a 401.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== Journal (Mission/Vision/Roadmap) ====================

export const getJournal = async (): Promise<JournalData> => {
  const response = await api.get('/business-journal/journal');
  return response.data.data;
};

export const updateJournal = async (data: Partial<JournalData>): Promise<JournalData> => {
  const response = await api.put('/business-journal/journal', data);
  return response.data.data;
};

// ==================== Notes ====================

export const getNotes = async (type?: string): Promise<Note[]> => {
  const params = type && type !== 'all' ? { type } : {};
  const response = await api.get('/business-journal/notes', { params });
  return response.data.data;
};

export const createNote = async (data: Omit<Note, 'id' | 'author' | 'authorName' | 'date'>): Promise<Note> => {
  const response = await api.post('/business-journal/notes', data);
  return response.data.data;
};

export const updateNote = async (id: number, data: Partial<Note>): Promise<Note> => {
  const response = await api.put(`/business-journal/notes/${id}`, data);
  return response.data.data;
};

export const deleteNote = async (id: number): Promise<void> => {
  await api.delete(`/business-journal/notes/${id}`);
};

export const shareNote = async (id: number, email: string, permission: string = 'view'): Promise<any> => {
  const response = await api.post(`/business-journal/notes/${id}/share`, { email, permission });
  return response.data.data;
};

export const getSharedNotes = async (): Promise<Note[]> => {
  const response = await api.get('/business-journal/notes/shared');
  return response.data.data;
};

// ==================== Activities ====================

export const getActivities = async (): Promise<Activity[]> => {
  const response = await api.get('/business-journal/activities');
  return response.data.data;
};

export const createActivity = async (data: Omit<Activity, 'id'>): Promise<Activity> => {
  const response = await api.post('/business-journal/activities', data);
  return response.data.data;
};

export const updateActivity = async (id: number, data: Partial<Activity>): Promise<Activity> => {
  const response = await api.put(`/business-journal/activities/${id}`, data);
  return response.data.data;
};

export const deleteActivity = async (id: number): Promise<void> => {
  await api.delete(`/business-journal/activities/${id}`);
};

export const toggleActivityStatus = async (id: number): Promise<Activity> => {
  const response = await api.patch(`/business-journal/activities/${id}/toggle`);
  return response.data.data;
};

// ==================== Documents ====================

export const getDocuments = async (params?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<Document[]> => {
  const response = await api.get('/business-journal/documents', { params });
  return response.data.data;
};

export const getSharedDocuments = async (): Promise<Document[]> => {
  const response = await api.get('/business-journal/documents/shared');
  return response.data.data;
};

export const createDocument = async (data: Omit<Document, 'id' | 'author' | 'authorName' | 'createdAt' | 'updatedAt'>): Promise<Document> => {
  const response = await api.post('/business-journal/documents', data);
  return response.data.data;
};

export const updateDocument = async (id: number, data: Partial<Document>): Promise<Document> => {
  const response = await api.put(`/business-journal/documents/${id}`, data);
  return response.data.data;
};

export const deleteDocument = async (id: number): Promise<void> => {
  await api.delete(`/business-journal/documents/${id}`);
};

export const shareDocument = async (id: number, email: string, permission: string = 'view'): Promise<any> => {
  const response = await api.post(`/business-journal/documents/${id}/share`, { email, permission });
  return response.data.data;
};

export const exportDocument = async (id: number): Promise<any> => {
  const response = await api.get(`/business-journal/documents/${id}/export`);
  return response.data.data;
};