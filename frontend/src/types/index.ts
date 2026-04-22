export type DocumentStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExtractedResult {
  title: string;
  category: string;
  summary: string;
  keywords: string[];
  language: string;
  page_count: number;
  word_count: number;
  extraction_confidence: number;
}

export interface Document {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  job_id: string | null;
  progress: number;
  current_stage: string;
  error_message: string | null;
  raw_result: ExtractedResult | null;
  reviewed_result: ExtractedResult | null;
  is_finalized: boolean;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListParams {
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse {
  documents: Document[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface ProgressEvent {
  document_id: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}
