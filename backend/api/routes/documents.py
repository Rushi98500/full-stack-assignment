from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from database import get_db
from schemas.document import DocumentResponse, DocumentListResponse, DocumentReviewUpdate
from services.document_service import DocumentService
from workers.tasks import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
async def get_documents(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get paginated list of documents with search, filter, and sort"""
    documents, total = await DocumentService.get_documents(
        db,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size
    )
    
    return DocumentListResponse(
        documents=documents,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a single document by ID"""
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.post("/{document_id}/retry", response_model=DocumentResponse)
async def retry_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Retry a failed document processing job"""
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status != 'failed':
        raise HTTPException(
            status_code=400,
            detail="Only failed documents can be retried"
        )
    
    document = await DocumentService.retry_document(db, document_id)
    
    # Re-dispatch Celery task
    process_document.delay(str(document_id))
    
    return document


@router.patch("/{document_id}/review", response_model=DocumentResponse)
async def review_document(
    document_id: UUID,
    review_data: DocumentReviewUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update the reviewed result of a document"""
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = await DocumentService.update_review(db, document_id, review_data.reviewed_result)
    return document


@router.post("/{document_id}/finalize", response_model=DocumentResponse)
async def finalize_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Finalize a document (mark as reviewed and approved)"""
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status != 'completed':
        raise HTTPException(
            status_code=400,
            detail="Only completed documents can be finalized"
        )
    
    document = await DocumentService.finalize_document(db, document_id)
    return document
