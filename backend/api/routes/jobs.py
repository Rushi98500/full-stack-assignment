import json
import redis.asyncio as redis
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from database import get_db
from models.document import Document
from config import settings

router = APIRouter(prefix="/api/documents", tags=["jobs"])


@router.get("/{document_id}/progress")
async def get_document_progress(
    document_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Stream document processing progress via Server-Sent Events (SSE)"""
    
    async def event_generator():
        client = redis.from_url(settings.redis_url, decode_responses=True)
        pubsub = client.pubsub()
        channel = f"doc:progress:{document_id}"
        
        await pubsub.subscribe(channel)
        
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
                    
                    data = json.loads(message['data'])
                    if data["stage"] in ("job_completed", "job_failed"):
                        break
        finally:
            await pubsub.unsubscribe(channel)
            await client.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
