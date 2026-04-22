import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from database import get_db
from models.document import Document
from schemas.document import DocumentCreate, DocumentResponse
from workers.tasks import process_document
from config import settings

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("", response_model=List[DocumentResponse])
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload one or more documents and start processing"""
    created_documents = []
    
    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)
    
    for file in files:
        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)
        max_size = settings.max_file_size_mb * 1024 * 1024
        
        if file_size > max_size:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} exceeds maximum size of {settings.max_file_size_mb}MB"
            )
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(settings.upload_dir, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)
        
        # Create document record
        document_data = DocumentCreate(
            filename=unique_filename,
            original_name=file.filename,
            file_type=file_extension.lstrip('.').lower() or 'unknown',
            file_size=file_size
        )
        
        db_document = Document(**document_data.model_dump())
        db.add(db_document)
        await db.commit()
        await db.refresh(db_document)
        
        created_documents.append(db_document)
        
        # Dispatch Celery task
        process_document.delay(str(db_document.id))
    
    return created_documents
