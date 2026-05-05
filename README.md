# TenderMind API & Pipeline (Native + Supabase Setup)

TenderMind is an AI-powered co-pilot for government procurement. It uses FastAPI, PostgreSQL (via Supabase), Celery, Redis, and Gemini to ingest, evaluate, and score tender documents and bidder submissions.

This guide explains how to run the entire backend stack natively on your Windows machine without relying on Docker for the Python application.

---

## 🚀 1. Prerequisites

1. **Python 3.10+** installed on your system.
2. **Tesseract-OCR for Windows**:
   - Download the 64-bit installer: [UB-Mannheim Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki)
   - Install it (usually to `C:\Program Files\Tesseract-OCR`).
3. **Redis**:
   - Celery requires a Redis message broker. You can install Redis natively for Windows or use a free cloud provider like [Upstash](https://upstash.com/).
   - Copy your Redis connection URL (e.g., `rediss://...`).
4. **Supabase Account**:
   - Create a free project at [Supabase](https://supabase.com/).
   - Go to Project Settings -> Database and copy your **Connection String (URI)**. Ensure you use the **Transaction connection pooler** (usually port `6543`).
5. **Google Gemini API Key**.

---

## ⚙️ 2. Environment Setup

Create a `.env` file inside the `backend/` folder (`c:\Coding\AI4BHARAT\backend\.env`) with the following contents:

```env
# Supabase Database URL
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require

# Redis Broker (Upstash URL or local Windows Redis)
REDIS_URL=rediss://default:password@your-upstash.upstash.io:33950

# AI Provider
GEMINI_API_KEY=your_gemini_api_key_here

# Directory to store uploaded files
UPLOAD_ROOT=./uploads
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