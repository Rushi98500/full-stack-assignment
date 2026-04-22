from sqlalchemy import Column, String, BigInteger, Text, Integer, Boolean, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(Text, nullable=False)
    original_name = Column(Text, nullable=False)
    file_type = Column(Text, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    status = Column(Text, nullable=False, default='queued')
    job_id = Column(Text, nullable=True)
    progress = Column(Integer, default=0)
    current_stage = Column(Text, default='job_queued')
    error_message = Column(Text, nullable=True)
    raw_result = Column(JSON, nullable=True)
    reviewed_result = Column(JSON, nullable=True)
    is_finalized = Column(Boolean, default=False)
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
