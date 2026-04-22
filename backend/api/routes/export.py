from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_db
from models.document import Document
from schemas.document import DocumentResponse
from services.document_service import DocumentService
from services.export_service import ExportService

router = APIRouter(prefix="/api/documents", tags=["export"])


@router.get("/{document_id}/export")
async def export_document(
    document_id: UUID,
    format: str = Query(..., regex="^(json|csv)$"),
    db: AsyncSession = Depends(get_db)
):
    """Export a document in JSON or CSV format"""
    document = await DocumentService.get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status not in ('completed', 'failed') or (not document.is_finalized and document.status == 'completed'):
        # Allow export for completed documents even if not finalized, but prefer finalized
        if document.status != 'completed':
            raise HTTPException(
                status_code=400,
                detail="Document must be completed to export"
            )
    
    result = document.reviewed_result if document.reviewed_result else document.raw_result
    
    if not result:
        raise HTTPException(
            status_code=400,
            detail="No result data available for export"
        )
    
    filename = document.original_name
    
    if format == "json":
        content = ExportService.export_to_json(document)
        return Response(
            content=content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.json"'
            }
        )
    elif format == "csv":
        content = ExportService.export_to_csv(document)
        return Response(
            content=content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.csv"'
            }
        )
