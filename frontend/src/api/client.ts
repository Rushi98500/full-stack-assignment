import axios from 'axios';
import type { ListParams, PaginatedResponse, Document } from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Typed API calls
export const documentsApi = {
  upload: (files: File[], onProgress?: (pct: number) => void) => {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    return api.post<Document[]>('/api/upload', form, {
      onUploadProgress: (e: any) => onProgress?.(Math.round((e.loaded * 100) / (e.total ?? 1))),
    });
  },
  list: (params: ListParams) => api.get<PaginatedResponse>('/api/documents', { params }),
  get: (id: string) => api.get<Document>(`/api/documents/${id}`),
  retry: (id: string) => api.post(`/api/documents/${id}/retry`),
  updateReview: (id: string, reviewed_result: Record<string, unknown>) =>
    api.patch(`/api/documents/${id}/review`, { reviewed_result }),
  finalize: (id: string) => api.post(`/api/documents/${id}/finalize`),
  exportUrl: (id: string, format: 'json' | 'csv') =>
    `${api.defaults.baseURL}/api/documents/${id}/export?format=${format}`,
};

export default api;
