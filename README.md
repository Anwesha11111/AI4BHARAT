# TenderMind API & Pipeline

TenderMind is an AI-powered co-pilot for government procurement. It uses FastAPI, PostgreSQL, Celery, Redis, and Gemini to ingest, evaluate, and score tender documents and bidder submissions.

## 🚀 Quick Start (For Team Members)

Follow these steps to run and test the complete pipeline locally.

### 1. Prerequisites
- **Docker** and **Docker Compose** installed.
- A valid **Google Gemini API Key**.

### 2. Environment Setup
Create a `.env` file in the root directory (`AI4BHARAT/.env`) with the following contents:

```env
# Database Credentials
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=tendermind

# AI Provider
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Build and Run
Start the entire stack using Docker Compose:

```bash
docker-compose up --build
```

This will spin up 5 containers:
- `tendermind-db`: PostgreSQL database.
- `tendermind-redis`: Redis message broker.
- `tendermind-api`: FastAPI backend (Port `8000`).
- `tendermind-worker`: Celery worker for async processing.
- `tendermind-flower`: Celery monitoring dashboard (Port `5555`).
- `tendermind-frontend`: Frontend UI (Port `3000`).

### 4. Verify Services
Check that everything is healthy:

- **Deep Health Check:** [http://localhost:8000/health](http://localhost:8000/health) 
  *(Should return `{"api":"ok","db":"ok","redis":"ok"}`)*
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Celery Flower Dashboard:** [http://localhost:5555](http://localhost:5555)

---

## 🧪 How to Test the Pipeline (Demo Flow)

Use the Swagger UI ([http://localhost:8000/docs](http://localhost:8000/docs)) or `curl` to test the pipeline.

### Step 1: Upload a Tender
Upload a PDF or DOCX file to simulate creating a new tender.

```bash
curl -X POST "http://localhost:8000/api/upload/tender" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@/path/to/your/tender.pdf"
```
*Note the `id` returned in the response (e.g., `1`).*

*Check Flower ([http://localhost:5555](http://localhost:5555)) to watch the `process_tender` task execute.*

### Step 2: Upload Bidder Documents
Upload one or more documents for a bidder, linking them to the tender ID.

```bash
curl -X POST "http://localhost:8000/api/upload/bidder" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "tender_id=1" \
     -F "vendor_name=Acme Corp" \
     -F "files=@/path/to/bidder_doc1.pdf" \
     -F "files=@/path/to/bidder_doc2.docx"
```

*Check Flower to watch the `evaluate_bidder` task execute.*

### Step 3: View the Scorecard
Once the evaluation is complete, retrieve the ranked scorecard:

```bash
curl -X GET "http://localhost:8000/api/tenders/1/scorecard" -H "accept: application/json"
```

### Step 4: Stream Real-Time Status
To see the Server-Sent Events (SSE) stream in action:

```bash
curl -N "http://localhost:8000/api/tenders/1/stream"
```

---

## 🏗️ Architecture Overview

The pipeline handles asynchronous, robust document processing:

1. **Upload API:** Receives files, saves them to a shared volume (`uploads_data`), creates DB records, and queues Celery tasks. Limits files to 50MB and validates MIME types.
2. **Celery Worker:**
   - **Tender Task:** Ingests the tender, chunks it, and uses Gemini to extract mandatory/optional criteria with weights.
   - **Bidder Task:** Ingests bidder files and uses a localized `SentenceTransformer` to find relevant chunks. Uses Gemini to evaluate the bidder against the tender criteria.
3. **Ingestion Processor:** Handles PDF (digital and OCR-fallback using Tesseract), DOCX (including tables), and images.
4. **Resilience:** Implements exponential backoff for AI rate limits, page-level OCR timeouts, database connection pooling with pre-ping, and idempotent task execution.

---

## 🛠️ Important Commands for Team

**View Backend Logs (API & Worker):**
```bash
docker-compose logs -f api worker
```

**Access the Database:**
```bash
docker exec -it tendermind-db psql -U postgres -d tendermind
```

**Restart Worker (Useful if you change backend code):**
```bash
docker-compose restart worker
```

**Simulate a Corrupt PDF (To test error handling):**
```bash
python -c "open('corrupt.pdf','wb').write(b'%PDF-1.4 THIS IS GARBAGE')"
curl -F "file=@corrupt.pdf" http://localhost:8000/api/upload/tender
```