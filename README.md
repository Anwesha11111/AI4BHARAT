# TenderMind - AI-Powered Government Procurement Co-Pilot

TenderMind is an intelligent platform that automates tender evaluation using a multi-agent AI system. It helps government agencies and companies streamline the procurement process by automatically extracting criteria from tender documents, evaluating bidder submissions, and recommending winners.

## Features

- **Role-Based Access**: Separate dashboards for Companies (submit tenders) and Admins (review & approve)
- **Document Processing**: Upload PDF, DOCX, DOC, PNG, JPG tender documents
- **AI Criteria Extraction**: Automatically extracts evaluation criteria from tender documents
- **Multi-Agent AI System**: Uses Retriever, Reasoner, Critic, and Synthesizer agents for bidder evaluation
- **Compliance Scoring**: Weighted scoring with mandatory/optional criteria
- **AI Winner Recommendation**: Intelligent recommendation with confidence scores
- **Audit Trail**: Complete logging of all actions for transparency

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | FastAPI, Python 3.10+ |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **AI/ML** | LangChain, Ollama, Sentence-Transformers |
| **Task Queue** | Celery + Redis |
| **Auth** | JWT (python-jose) |

---

## Installation

### Prerequisites

- **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
- **Node.js 18+**: [Download Node.js](https://nodejs.org/)
- **Git**: [Download Git](https://git-scm.com/)
- **Redis** (optional, for background tasks): [Download Redis](https://redis.io/download)
- **Ollama** (optional, for AI): [Download Ollama](https://ollama.ai/)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Anwesha11111/AI4BHARAT.git
cd AI4BHARAT
```

### Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

Edit `.env` file with your settings:
```env
DATABASE_URL=sqlite:///./tendermind.db
JWT_SECRET_KEY=your-secret-key-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173
MOCK_LLM=true
```

### Step 3: Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
echo "VITE_API_URL=http://localhost:8000/api" > .env
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # or source venv/bin/activate on Mac/Linux
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Access the Application

- **Frontend**: http://localhost:3001 (or http://localhost:5173)
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## Quick Start Guide

### 1. Create Accounts

**Company Account:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"company@test.com","password":"test123","role":"company","company_name":"Test Company"}'
```

**Admin Account:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test123","role":"admin"}'
```

Or sign up via the web interface at http://localhost:3001/signup

### 2. Company Workflow

1. Login as company user
2. Go to Company Dashboard (`/company`)
3. Click "New Tender" to upload a tender document
4. Wait for AI to process and extract criteria
5. View tender status and details

### 3. Admin Workflow

1. Login as admin user
2. Go to Admin Dashboard (`/admin`)
3. View all submitted tenders
4. Approve or reject tenders
5. Run AI recommendation for approved tenders
6. Assign tender to winning bidder

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user info |

### Tenders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/tender` | Upload tender document |
| GET | `/api/tenders` | List tenders (filtered by role) |
| GET | `/api/tenders/{id}/status` | Get tender status |
| GET | `/api/tenders/{id}/criteria` | Get extracted criteria |
| GET | `/api/tenders/{id}/scorecard` | Get bidder rankings |
| GET | `/api/tenders/{id}/document` | View tender document |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/tenders` | List all tenders |
| GET | `/api/admin/tenders/{id}` | Get tender details |
| POST | `/api/admin/tenders/{id}/review` | Approve/reject tender |
| POST | `/api/admin/tenders/{id}/run-ai-recommendation` | Run AI analysis |
| POST | `/api/admin/tenders/{id}/assign` | Assign to winner |
| GET | `/api/admin/stats` | Dashboard statistics |

### Bidders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/bidder` | Submit bidder documents |
| GET | `/api/tenders/{id}/bidders` | List bidders for tender |

---

## Project Structure

```
AI4BHARAT/
├── backend/
│   ├── api/
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── admin.py         # Admin endpoints
│   │   ├── routes.py        # Main API routes
│   │   └── export.py        # Export functionality
│   ├── ai/
│   │   ├── agents.py        # Multi-agent AI system
│   │   ├── evaluator.py     # Bidder evaluation
│   │   ├── extractor.py     # Criteria extraction
│   │   └── workflow.py      # AI workflow orchestration
│   ├── db/
│   │   ├── database.py      # Database connection
│   │   └── models.py        # SQLAlchemy models
│   ├── workers/
│   │   └── tasks.py         # Celery background tasks
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/
│   │   │   ├── admin/       # Admin pages
│   │   │   ├── company/     # Company pages
│   │   │   └── tender/      # Tender workflow pages
│   │   ├── lib/
│   │   │   └── auth-context.tsx  # Auth state management
│   │   └── routes/          # Route definitions
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///./tendermind.db` |
| `JWT_SECRET_KEY` | Secret for JWT tokens | (required) |
| `JWT_EXPIRE_MINUTES` | Token expiration time | `60` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000,...` |
| `REDIS_URL` | Redis connection for Celery | `redis://localhost:6379/0` |
| `OLLAMA_BASE_URL` | Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | LLM model name | `llama3` |
| `MOCK_LLM` | Use mock AI responses | `true` |
| `TESSERACT_CMD` | Path to Tesseract OCR | (auto-detect) |

---

## Optional: Enable Full AI Features

### 1. Install Ollama (for LLM reasoning)

```bash
# Download from https://ollama.ai/
# Then pull a model:
ollama pull llama3
```

Update `.env`:
```env
MOCK_LLM=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 2. Install Tesseract (for OCR on scanned documents)

**Windows:**
Download from https://github.com/UB-Mannheim/tesseract/wiki

**Mac:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt install tesseract-ocr
```

### 3. Start Celery Worker (for background processing)

```bash
# Start Redis first
redis-server

# Then start Celery worker
cd backend
celery -A workers.tasks worker --loglevel=info --pool=solo
```

---

## Troubleshooting

### "Failed to fetch" Error
- Check if backend is running: `curl http://localhost:8000/`
- Check CORS settings in `.env` - ensure your frontend URL is listed
- Restart backend after changing `.env`

### "Port already in use"
```bash
# Find and kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /F /PID <PID>

# On Mac/Linux
lsof -i :8000
kill -9 <PID>
```

### Database Errors
Delete the database file to reset:
```bash
rm backend/tendermind.db
python main.py  # Recreates fresh database
```

### Tesseract Not Found
Set the path in `.env`:
```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

---

## Team Members

- Shashank
- Anwesha Mohapatra
- Avishkar More
- Aayushi Priya

---

## License

This project is developed for AI4Bharat initiative.
