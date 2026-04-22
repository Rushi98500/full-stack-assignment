from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import upload, documents, jobs, export

app = FastAPI(
    title="Async Document Processing API",
    description="API for async document processing with Celery and Redis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router)
app.include_router(documents.router)
app.include_router(jobs.router)
app.include_router(export.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "fastapi"
    }


@app.get("/")
async def root():
    return {"message": "Async Document Processing API"}
