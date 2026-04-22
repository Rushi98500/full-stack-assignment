import os
import time
import json
from datetime import datetime
from typing import Optional
from celery import Task
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from workers.celery_app import celery_app
from database import SyncSessionLocal
from models.document import Document
from utils.redis_pubsub import publish_progress_sync


class DatabaseTask(Task):
    """Base task with database session management"""
    _db: Optional[Session] = None

    @property
    def db(self):
        if self._db is None:
            self._db = SyncSessionLocal()
        return self._db

    def cleanup(self):
        if self._db:
            self._db.close()


@celery_app.task(base=DatabaseTask, bind=True, max_retries=3)
def process_document(self, document_id: str):
    """Process a document through the extraction pipeline"""
    self.update_state(state='PROGRESS', meta={'stage': 'job_started', 'progress': 5})
    
    session = self.db
    
    # Get document
    result = session.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()
    
    if not document:
        raise ValueError(f"Document {document_id} not found")
    
    # Update status to processing
    session.execute(
        update(Document)
        .where(Document.id == document_id)
        .values(
            status='processing',
            current_stage='job_started',
            progress=5,
            job_id=self.request.id
        )
    )
    session.commit()
    
    publish_progress_sync(document_id, 'job_started', 5, 'Job started')
    
    try:
        # Stage 1: Document parsing
        time.sleep(1)
        publish_progress_sync(document_id, 'document_parsing_started', 15, 'Parsing document...')
        
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(current_stage='document_parsing_started', progress=15)
        )
        session.commit()
        
        # Read file and extract metadata
        file_path = os.path.join(os.getenv('UPLOAD_DIR', './uploads'), document.filename)
        
        # Simulate parsing
        time.sleep(2)
        
        publish_progress_sync(document_id, 'document_parsing_completed', 35, 'Document parsing completed')
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(current_stage='document_parsing_completed', progress=35)
        )
        session.commit()
        
        # Stage 2: Field extraction
        time.sleep(1)
        publish_progress_sync(document_id, 'field_extraction_started', 50, 'Extracting structured fields...')
        
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(current_stage='field_extraction_started', progress=50)
        )
        session.commit()
        
        # Simulate field extraction
        time.sleep(3)
        
        # Generate mock extracted data
        extracted_data = {
            "title": document.original_name.replace('_', ' ').replace('-', ' ').title(),
            "category": "document",
            "summary": f"This is a {document.file_type} document containing extracted information.",
            "keywords": ["extraction", "document", document.file_type],
            "page_count": 1,
            "word_count": 120,
            "language": "en",
            "extraction_confidence": 0.87
        }
        
        publish_progress_sync(document_id, 'field_extraction_completed', 80, 'Field extraction completed')
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(current_stage='field_extraction_completed', progress=80)
        )
        session.commit()
        
        # Stage 3: Store result
        time.sleep(1)
        publish_progress_sync(document_id, 'result_stored', 95, 'Storing results...')
        
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                current_stage='result_stored',
                progress=95,
                raw_result=extracted_data,
                reviewed_result=extracted_data.copy()
            )
        )
        session.commit()
        
        # Stage 4: Complete
        time.sleep(0.5)
        publish_progress_sync(document_id, 'job_completed', 100, 'Job completed successfully')
        
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                status='completed',
                current_stage='job_completed',
                progress=100
            )
        )
        session.commit()
        
        return {"status": "completed", "document_id": str(document_id)}
        
    except Exception as e:
        error_msg = str(e)
        publish_progress_sync(document_id, 'job_failed', document.progress, f'Job failed: {error_msg}')
        
        session.execute(
            update(Document)
            .where(Document.id == document_id)
            .values(
                status='failed',
                current_stage='job_failed',
                error_message=error_msg
            )
        )
        session.commit()
        raise
    
    finally:
        self.cleanup()
