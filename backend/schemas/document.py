from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class DocumentBase(BaseModel):
    filename: str
    original_name: str
    file_type: str
    file_size: int


class DocumentCreate(DocumentBase):
    pass


class DocumentResponse(DocumentBase):
    id: UUID
    status: str
    job_id: Optional[str] = None
    progress: int = 0
    current_stage: str = 'job_queued'
    error_message: Optional[str] = None
    raw_result: Optional[Dict[str, Any]] = None
    reviewed_result: Optional[Dict[str, Any]] = None
    is_finalized: bool = False
    retry_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DocumentReviewUpdate(BaseModel):
    reviewed_result: Dict[str, Any]


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    page: int
    page_size: int


class ProgressEvent(BaseModel):
    document_id: str
    stage: str
    progress: int
    message: str
    timestamp: str
