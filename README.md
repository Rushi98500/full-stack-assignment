# Async Document Processing Workflow System

A full-stack application for asynchronous document processing with real-time progress tracking using FastAPI, React, Celery, Redis, and PostgreSQL.

## Architecture Overview

This system implements a distributed document processing pipeline with the following components:

- **Frontend**: React + TypeScript + Vite with real-time SSE updates
- **Backend**: Python FastAPI with async SQLAlchemy
- **Database**: PostgreSQL with asyncpg driver
- **Message Broker**: Redis for Celery task queue and Pub/Sub
- **Background Workers**: Celery workers for document processing
- **Progress Tracking**: Server-Sent Events (SSE) for real-time updates

### Processing Pipeline

Each document goes through these stages:

1. `job_queued` (0%) - Document uploaded and queued
2. `job_started` (5%) - Celery task begins
3. `document_parsing_started` (15%) - File parsing begins
4. `document_parsing_completed` (35%) - File parsing complete
5. `field_extraction_started` (50%) - Structured field extraction
6. `field_extraction_completed` (80%) - Extraction complete
7. `result_stored` (95%) - Results saved to database
8. `job_completed` (100%) - Processing finished

Progress events are published via Redis Pub/Sub and streamed to the frontend via SSE.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Lucide Icons
- **Backend**: FastAPI, SQLAlchemy (async), Pydantic
- **Database**: PostgreSQL 15
- **Task Queue**: Celery with Redis broker
- **Real-time**: Redis Pub/Sub + Server-Sent Events
- **Containerization**: Docker Compose

## Project Structure

```
async-doc-processor/
├── docker-compose.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                   # FastAPI app entry
│   ├── config.py                 # Settings from env vars
│   ├── database.py               # SQLAlchemy async engine + session
│   ├── models/
│   │   └── document.py           # SQLAlchemy ORM model
│   ├── schemas/
│   │   └── document.py           # Pydantic request/response schemas
│   ├── api/
│   │   └── routes/
│   │       ├── upload.py
│   │       ├── documents.py
│   │       ├── jobs.py
│   │       └── export.py
│   ├── services/
│   │   ├── document_service.py
│   │   └── export_service.py
│   ├── workers/
│   │   ├── celery_app.py         # Celery instance
│   │   └── tasks.py              # All Celery tasks
│   └── utils/
│       └── redis_pubsub.py       # Redis Pub/Sub helper
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── api/
        │   └── client.ts         # Axios instance + typed API calls
        ├── types/
        │   └── index.ts          # TypeScript interfaces
        ├── components/
        │   ├── UploadZone.tsx
        │   ├── JobStatusBadge.tsx
        │   ├── ProgressBar.tsx
        │   └── ExportButtons.tsx
        └── pages/
            ├── Dashboard.tsx     # Document list with search/filter/sort
            └── DocumentDetail.tsx # Review, edit, finalize, export
```

## Database Schema

```sql
CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    file_type       TEXT NOT NULL,
    file_size       BIGINT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'queued',
    job_id          TEXT,
    progress        INTEGER DEFAULT 0,
    current_stage   TEXT DEFAULT 'job_queued',
    error_message   TEXT,
    raw_result      JSONB,
    reviewed_result JSONB,
    is_finalized    BOOLEAN DEFAULT FALSE,
    retry_count     INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

## Running with Docker Compose

### Prerequisites
- Docker and Docker Compose installed

### Quick Start

1. Clone the repository and navigate to the project directory
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Start all services:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Stopping the Services

```bash
docker-compose down
```

To remove volumes (including database data):
```bash
docker-compose down -v
```

## Running Locally (Development)

### Backend Setup

1. Install Python dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Set up environment variables:
   ```bash
   export DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/docprocessor"
   export REDIS_URL="redis://localhost:6379/0"
   export UPLOAD_DIR="./uploads"
   export MAX_FILE_SIZE_MB=10
   export SECRET_KEY="your-secret-key"
   ```

3. Initialize the database (run migrations):
   ```bash
   alembic upgrade head
   ```

4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Start the Celery worker (in a separate terminal):
   ```bash
   celery -A workers.celery_app worker --loglevel=info --concurrency=4
   ```

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Set the API URL:
   ```bash
   export VITE_API_URL="http://localhost:8000"
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the frontend at http://localhost:3000

### Database Setup (Local)

1. Install PostgreSQL 15
2. Create a database:
   ```sql
   CREATE DATABASE docprocessor;
   ```
3. Create a user and grant permissions:
   ```sql
   CREATE USER user WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE docprocessor TO user;
   ```

### Redis Setup (Local)

1. Install Redis 7
2. Start Redis server:
   ```bash
   redis-server
   ```

## API Documentation

### Endpoints

#### Document Upload
- `POST /api/upload` - Upload one or more documents (multipart/form-data)

#### Document Management
- `GET /api/documents` - List documents with pagination, search, filter, and sort
  - Query params: `search`, `status`, `sort_by`, `sort_order`, `page`, `page_size`
- `GET /api/documents/{id}` - Get a single document by ID
- `PATCH /api/documents/{id}/review` - Update reviewed result
- `POST /api/documents/{id}/finalize` - Finalize a document
- `POST /api/documents/{id}/retry` - Retry a failed document

#### Progress Tracking
- `GET /api/documents/{id}/progress` - SSE endpoint for real-time progress updates

#### Export
- `GET /api/documents/{id}/export?format=json` - Export document as JSON
- `GET /api/documents/{id}/export?format=csv` - Export document as CSV

#### Health
- `GET /api/health` - Health check endpoint

### Sample Request/Response

**Upload Document**
```bash
curl -X POST http://localhost:8000/api/upload \
  -F "files=@document.pdf"
```

**Response**
```json
[
  {
    "id": "uuid-here",
    "filename": "unique-filename.pdf",
    "original_name": "document.pdf",
    "file_type": "pdf",
    "file_size": 12345,
    "status": "queued",
    "progress": 0,
    "current_stage": "job_queued",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
]
```

**Progress Event (SSE)**
```json
{
  "document_id": "uuid-here",
  "stage": "field_extraction_started",
  "progress": 50,
  "message": "Extracting structured fields...",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Sample Export Formats

### JSON Export
```json
{
  "title": "Sample Document",
  "category": "document",
  "summary": "This is a pdf document containing extracted information.",
  "keywords": ["extraction", "document", "pdf"],
  "page_count": 1,
  "word_count": 120,
  "language": "en",
  "extraction_confidence": 0.87
}
```

### CSV Export
```csv
field,value
title,Sample Document
category,document
summary,This is a pdf document containing extracted information.
keywords,extraction, document, pdf
page_count,1
word_count,120
language,en
extraction_confidence,0.87
```

## Features

### Dashboard
- Drag-and-drop file upload with multiple file support
- Real-time document list with auto-refresh
- Search by filename
- Filter by status (Queued, Processing, Completed, Failed)
- Sort by creation date or filename
- Pagination support
- Progress bars with stage indicators
- Color-coded status badges
- Quick actions: View, Retry (for failed), Export

### Document Detail Page
- Real-time progress tracking via SSE
- Stage-by-stage progress visualization
- Editable extracted data fields (title, category, summary, keywords, etc.)
- Save changes to reviewed result
- Finalize document to lock edits
- Export to JSON or CSV
- Retry failed documents

### Background Processing
- Asynchronous task processing with Celery
- Automatic retry on failure (max 3 retries)
- Redis Pub/Sub for real-time progress updates
- Concurrent processing with configurable worker count

## Assumptions and Tradeoffs

1. **File Storage**: Files are stored locally in the `./uploads` directory. In production, consider using cloud storage (S3, GCS) or a distributed file system.

2. **Document Processing**: The current implementation simulates document extraction with mock data. In production, integrate with actual document processing libraries (e.g., PyPDF2, pdfplumber, Tesseract OCR).

3. **SSE Connections**: The SSE endpoint keeps connections open until completion. For very long-running tasks, consider implementing connection timeouts and reconnection logic.

4. **Error Handling**: Failed tasks can be retried up to 3 times. After that, manual intervention may be required.

5. **Database Migrations**: Alembic is configured but migrations need to be generated. Run `alembic revision --autogenerate -m "Initial migration"` to create the first migration.

6. **Security**: The implementation uses basic file upload validation. In production, add:
   - File type validation (magic numbers)
   - Virus scanning
   - Authentication and authorization
   - Rate limiting
   - CSRF protection

7. **Scalability**: The current setup uses a single worker with 4 concurrent tasks. For higher throughput, deploy multiple worker instances behind a load balancer.

8. **Frontend Polling**: The dashboard auto-refreshes every 5 seconds as a fallback. SSE is used for individual document progress.

## Troubleshooting

### Docker Compose Issues

**Services won't start**: Check that ports 3000, 8000, 5432, and 6379 are not already in use.

**Database connection errors**: Ensure PostgreSQL container is healthy before starting backend/worker services.

**Celery worker can't connect to Redis**: Check that Redis is running and accessible.

### Backend Issues

**Migration errors**: Ensure the database exists and credentials are correct. Run `alembic upgrade head` after starting the database.

**File upload errors**: Check that the `./uploads` directory exists and has write permissions.

### Frontend Issues

**API connection errors**: Ensure the backend is running and `VITE_API_URL` is set correctly.

**Build errors**: Run `npm install` to ensure all dependencies are installed.

## License

MIT License
