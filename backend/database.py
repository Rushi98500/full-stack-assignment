from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from config import settings

# Base class for models
Base = declarative_base()

# Async engine for FastAPI
async_engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Sync engine for Celery workers
sync_engine: Engine = create_engine(
    settings.database_url_sync,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=5
)

SyncSessionLocal = sessionmaker(
    sync_engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

async def get_db():
    """Dependency for FastAPI to get async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def get_sync_db():
    """Get synchronous database session for Celery workers"""
    session = SyncSessionLocal()
    try:
        yield session
    finally:
        session.close()
