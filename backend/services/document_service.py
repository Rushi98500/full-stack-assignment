from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, or_
from typing import Optional, List
from uuid import UUID

from models.document import Document
from schemas.document import DocumentCreate, DocumentResponse


class DocumentService:
    @staticmethod
    async def create_document(db: AsyncSession, document_data: DocumentCreate) -> Document:
        db_document = Document(**document_data.model_dump())
        db.add(db_document)
        await db.commit()
        await db.refresh(db_document)
        return db_document
    
    @staticmethod
    async def get_document(db: AsyncSession, document_id: UUID) -> Optional[Document]:
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_documents(
        db: AsyncSession,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[Document], int]:
        query = select(Document)
        
        # Apply filters
        if search:
            query = query.where(or_(
                Document.original_name.ilike(f"%{search}%"),
                Document.filename.ilike(f"%{search}%")
            ))
        
        if status:
            query = query.where(Document.status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply sorting
        sort_column = getattr(Document, sort_by, Document.created_at)
        if sort_order.lower() == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        result = await db.execute(query)
        documents = result.scalars().all()
        
        return list(documents), total
    
    @staticmethod
    async def update_review(
        db: AsyncSession,
        document_id: UUID,
        reviewed_result: dict
    ) -> Optional[Document]:
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(reviewed_result=reviewed_result)
        )
        await db.commit()
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def finalize_document(db: AsyncSession, document_id: UUID) -> Optional[Document]:
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(is_finalized=True)
        )
        await db.commit()
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def retry_document(db: AsyncSession, document_id: UUID) -> Optional[Document]:
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                status='queued',
                current_stage='job_queued',
                progress=0,
                error_message=None,
                retry_count=Document.retry_count + 1
            )
        )
        await db.commit()
        result = await db.execute(select(Document).where(Document.id == document_id))
        return result.scalar_one_or_none()
