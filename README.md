# TenderMind API & Pipeline (FastAPI + PostgreSQL + Celery + LangChain)

TenderMind is an AI-powered co-pilot for government procurement. It uses:
- **Backend**: FastAPI
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Async Queue**: Celery (Redis broker)
- **AI Orchestration**: LangChain + Google Gemini 1.5 Flash
- **Frontend**: React
- **Monitoring**: Flower (Celery Dashboard)

This guide explains how to run the entire stack using Docker Compose.

---

## 🚀 1. Prerequisites

1. **Docker & Docker Compose**: [Install Docker](https://docs.docker.com/get-docker/)
2. **Google Gemini API Key**: Get from [Google AI Studio](https://aistudio.google.com/)
3. **Git**: For cloning and version control
4. **Port availability**: Ensure ports 8000 (API), 3000 (Frontend), 5432 (DB), 6379 (Redis), 5555 (Flower) are available

---

## ⚙️ 2. Environment Setup

Create a `.env` file in the project root (`c:\Coding\AI4BHARAT\.env`) with:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

That's it! Docker Compose will automatically set up PostgreSQL and Redis.

---

## 🐳 3. Run with Docker Compose

```bash
cd c:\Coding\AI4BHARAT

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

**Services available**:
- **API**: http://localhost:8000/api/docs (Swagger UI)
- **Frontend**: http://localhost:3000
- **Flower**: http://localhost:5555
- **Health Check**: `curl http://localhost:8000/health`

---

## 📋 4. Verify Installation

```bash
# Check all services are healthy
docker-compose ps

# Check API health
curl http://localhost:8000/health
# Expected response: {"api":"ok","db":"ok","redis":"ok"}

# View Flower dashboard
open http://localhost:5555
```

---

## 🧪 5. Quick Start: Upload Tender & Bidder
```

---

## 📦 3. Virtual Environment & Dependencies

A virtual environment has been created for you. To activate it and ensure all dependencies are installed, open a terminal in the `backend/` folder:

```powershell
cd c:\Coding\AI4BHARAT\backend
venv\Scripts\activate
pip install -r requirements.txt
```

*Note: The system automatically installed this for you just now, but use this command to add new packages in the future.*

---

## 🏃 4. Running the Application Natively

You need **two** separate terminal windows to run the stack.

### Terminal 1: Start the FastAPI Server
This runs the main API that accepts uploads and serves the frontend.

```powershell
cd c:\Coding\AI4BHARAT\backend
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*(The first time you run this, it will automatically connect to Supabase and create all necessary tables!)*

### Terminal 2: Start the Celery Worker
This background worker processes the heavy OCR and AI extraction tasks. Because you are on Windows, we must run Celery with the `--pool=solo` flag.

```powershell
cd c:\Coding\AI4BHARAT\backend
venv\Scripts\activate
celery -A workers.tasks worker --loglevel=info --pool=solo
```

---

## ✅ 5. Verify the System

1. **Deep Health Check:** Open [http://localhost:8000/health](http://localhost:8000/health)
   *(Should return `{"api":"ok","db":"ok","redis":"ok"}`. This confirms your Supabase and Redis connections are working!)*
2. **API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs) to see your endpoints and test them.

---

## 🧪 How to Test the Pipeline

### Step 1: Upload a Tender
Using the Swagger UI at `http://localhost:8000/docs`, find the `POST /api/upload/tender` endpoint and upload a PDF. 
- Watch **Terminal 2** (Celery worker). You will see it ingest the document and call Gemini to extract criteria.

### Step 2: Upload Bidder Documents
Find the `POST /api/upload/bidder` endpoint. Enter the `tender_id` returned from Step 1, a `vendor_name`, and upload bidder PDFs.
- Watch **Terminal 2**. The worker will evaluate the bidder against the criteria.

### Step 3: View the Scorecard
Go to `GET /api/tenders/{id}/scorecard` and execute it. You will see a fully ranked compliance scorecard.

---

## ⚠️ Troubleshooting

- **Supabase SSL Error**: If you get a connection error from Supabase about SSL, append `?sslmode=require` to your `DATABASE_URL`.
- **Tesseract Error**: If the Celery worker crashes when processing a scanned PDF, saying `tesseract is not installed`, you need to explicitly point Python to the `tesseract.exe` path. Add this to your `.env` file:
  `TESSERACT_CMD="C:\Program Files\Tesseract-OCR\tesseract.exe"`
  And modify `backend/ingestion/processor.py` to read it: `pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD")`