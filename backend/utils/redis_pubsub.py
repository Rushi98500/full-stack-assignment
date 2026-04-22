import redis.asyncio as aioredis
import redis
import json
from datetime import datetime
from config import settings

# Sync Redis client for Celery workers
sync_redis_client = redis.Redis.from_url(settings.redis_url)


async def publish_progress(document_id: str, stage: str, progress: int, message: str):
    """Publish progress event to Redis Pub/Sub (async)"""
    redis_client = aioredis.from_url(settings.redis_url)
    payload = json.dumps({
        "document_id": document_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    })
    await redis_client.publish(f"doc:progress:{document_id}", payload)
    await redis_client.close()


def publish_progress_sync(document_id: str, stage: str, progress: int, message: str):
    """Publish progress event to Redis Pub/Sub (sync for Celery workers)"""
    payload = json.dumps({
        "document_id": document_id,
        "stage": stage,
        "progress": progress,
        "message": message,
        "timestamp": datetime.utcnow().isoformat()
    })
    sync_redis_client.publish(f"doc:progress:{document_id}", payload)
