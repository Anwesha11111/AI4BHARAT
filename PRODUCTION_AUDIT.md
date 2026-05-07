# Production Audit: AI-Powered Tender Evaluation System

**Audit Date**: 2026-05-05  
**Auditor Role**: System + Backend + Infrastructure Engineer  
**Tech Stack**: FastAPI | PostgreSQL (SQLAlchemy ORM) | Celery | LangChain | React

---

## 1. VERIFY IMPLEMENTATION

### A. File Upload (FastAPI) ✅ / ⚠️

**What is Implemented Correctly:**
- ✅ **Multi-file bidder uploads**: `POST /upload/bidder` accepts `List[UploadFile]`
- ✅ **File type validation**: Whitelist enforced (`ALLOWED_EXTENSIONS = {.pdf, .docx, .doc, .png, .jpg, .jpeg, .tiff, .tif}`)
- ✅ **File size limit**: `MAX_FILE_SIZE = 50MB` enforced in `save_upload_chunked()`
- ✅ **Chunked upload**: 64KB chunks prevent memory exhaustion on large files
- ✅ **Safe storage**: 
  - Filenames salted with UUIDs (prevents overwrites)
  - Organized by folder structure: `/uploads/tender_{id}/` and `/uploads/bidder_{id}/`
  - Proper cleanup on failure: deletes DB record + file if upload fails
- ✅ **Audit logging**: `log_event()` records upload with file size and file count
- ✅ **Async processing queued**: Both endpoints call `process_tender_async.delay()` and `evaluate_bidder_async.delay()`

**Production-Safe Verification:**
```python
# routes.py line 47-55: Proper error handling
try:
    size = await save_upload_chunked(file, file_path)
except HTTPException:
    db.delete(new_tender)  # ✅ Cleanup on failure
    db.commit()
    raise
```

---

### B. Ingestion Pipeline ✅ / ⚠️

**PDF Processing:**
- ✅ **Digital text extraction**: PyMuPDF `page.get_text()` for native PDFs
- ✅ **OCR fallback**: Tesseract triggered when text < 50 chars per page
- ✅ **Languages**: `lang="eng+hin"` supports English + Hindi
- ✅ **DPI optimization**: `OCR_DPI=150` balances speed vs accuracy
- ✅ **Memory safety**:
  - `doc.close()` in finally block (prevents file handle leaks)
  - `pix.tobytes("png")` **FIXED** (was `tobytes()` causing PIL crash)
  - Max pages capped: `MAX_PDF_PAGES=200`
- ✅ **Per-page error isolation**: OCR failure on one page doesn't fail entire PDF
- ✅ **Source type tracking**: `pdf_digital` vs `pdf_ocr`

**DOCX Processing:**
- ✅ Extracts paragraphs + table cell text
- ✅ Preserves structure (no duplicate text from tables)

**Image Processing:**
- ✅ Direct OCR via Tesseract
- ✅ Source type: `image_ocr`

**Output Quality:**
- ✅ **Structured output**: `{"page": int, "text": str, "language": str, "type": str, "normalized_text": str}`
- ✅ **Language detection**: `langdetect` with safe fallback (never raises)
- ✅ **Text normalization**: Whitespace trimmed, special chars removed

**⚠️ GAPS - No Timeout on OCR:**
- **Risk**: Tesseract can hang indefinitely on pathological images
- **Impact**: Worker task blocks, timeout eventually kills it (hard limit 360s)
- **Fix Needed**: Add timeout wrapper on `pytesseract.image_to_string()` (suggest 30s per page)

---

### C. Celery Workers ✅ / ⚠️

**Task Configuration (Production-Safe):**
```python
celery_app.conf.update(
    task_soft_time_limit=300,        # ✅ 5 min: raises SoftTimeLimitExceeded
    task_time_limit=360,             # ✅ 6 min: hard kill
    task_acks_late=True,             # ✅ Ack after completion (safe re-queue)
    worker_prefetch_multiplier=1,    # ✅ One task at a time (OCR is CPU-bound)
)
```

**Async Task Patterns:**
- ✅ **Bind=True**: Allows `self.retry()` for exponential backoff
- ✅ **Max retries**: 3 attempts with 15-second delays
- ✅ **Idempotency guards**: Skip if status already `'completed'`
  ```python
  if tender.status == "completed":
      return {"skipped": "already_completed"}
  ```
- ✅ **Per-file error isolation**: Bidder processing continues if one file fails
  ```python
  for filename in sorted(os.listdir(bidder.folder_path)):
      try:
          chunks = processor.auto_process(file_path)
      except Exception as file_err:
          logger.warning("Skipping file... (continue)")  # ✅ Don't fail entire bidder
  ```
- ✅ **SoftTimeLimitExceeded handling**: Caught, entity marked failed, no retry
  ```python
  except SoftTimeLimitExceeded:
      _mark_entity_failed(db, Tender, tender_id, "Task exceeded 5-minute time limit")
      return {"error": "timeout"}  # ✅ No retry on timeout
  ```
- ✅ **Rollback on exception**: `db.rollback()` ensures partial writes don't persist

**⚠️ GAPS - Retry on Criteria Not Ready:**
- **Code**: `raise self.retry(countdown=30)` if tender criteria not yet extracted
- **Risk**: Cascade delay if tender processing is slow
- **Status**: **Acceptable** — bidder waits for tender processing, re-queues every 30s (UP TO 3 RETRIES, then fails)

---

### D. Database (PostgreSQL + SQLAlchemy ORM) ✅ / ⚠️

**Model Definitions:**
- ✅ **Tender**: `id, title, file_path, raw_text, status, created_at`
- ✅ **Bidder**: `id, tender_id (FK), vendor_id (FK), folder_path, status, submission_date`
- ✅ **Criterion**: `id, tender_id (FK), text, type, weight`
- ✅ **Verdict**: `id, bidder_id (FK), criterion_id (FK), status, confidence, reasoning, evidence_citation (JSON)`
- ✅ **Document**: `id, tender_id (FK), bidder_id (FK nullable), text, page, file_name, source_type, language`
- ✅ **AuditLog**: `id, entity_type, entity_id, action, old_value (JSON), new_value (JSON), actor, reason, timestamp`
- ✅ **Vendor**: `id, name (UNIQUE), registration_number (UNIQUE), created_at`

**Relationships:**
- ✅ All relationships defined with `back_populates` for bidirectional access
- ✅ Cascading deletes: `db.query(...).delete()` properly cleans up child records

**Session Lifecycle (Database Connection Safety):**
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
    finally:
        db.close()  # ✅ Always closes
```

**Connection Pool Configuration:**
```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,           # ✅ Tests connection before use
    pool_recycle=1800,            # ✅ Recycles every 30 min (prevents PostgreSQL timeout)
    connect_args={"connect_timeout": 10},  # ✅ 10s timeout
)
```

**⚠️ CRITICAL GAPS - Missing Database Indexes:**

| Table | Column | Type | Query Impact | Status |
|-------|--------|------|--------------|--------|
| `documents` | `tender_id (FK)` | B-tree | Scorecard fetch slow | ❌ MISSING |
| `documents` | `bidder_id (FK)` | B-tree | Bidder evaluation slow | ❌ MISSING |
| `criteria` | `tender_id (FK)` | B-tree | Criteria list slow | ❌ MISSING |
| `verdicts` | `bidder_id (FK)` | B-tree | Verdict lookup slow | ❌ MISSING |
| `verdicts` | `criterion_id (FK)` | B-tree | Criterion review slow | ❌ MISSING |
| `bidders` | `tender_id (FK)` | B-tree | Tender bidder list slow | ❌ MISSING |

**⚠️ CRITICAL GAPS - Data Integrity Issues:**

1. **No UNIQUE constraint on Tender.file_path**: Risk of duplicate uploads
2. **No transaction isolation level**: Defaults to READ_COMMITTED (may miss concurrent changes)
3. **No partial index on Verdict (status='review_needed')**: Filtering slow for large scorecard

---

### E. LangChain Integration ❌ CRITICAL GAP

**Current State:**
- ❌ **LangChain NOT in requirements.txt**
- ❌ **LangChain chains NOT implemented** anywhere
- ❌ **Direct Gemini API calls** in `ai/extractor.py` and `ai/evaluator.py`
- ❌ **No LangChain PromptTemplate or Chain usage** in `ai/workflow.py`

**What's Using Direct Gemini Instead of LangChain:**
1. **CriterionExtractor** (`ai/extractor.py`):
   ```python
   from google.generativeai import GenerativeModel
   self.model = genai.GenerativeModel("gemini-1.5-flash")
   response = self.model.generate_content(prompt)  # ❌ Direct API call
   ```

2. **BidderEvaluator** (`ai/evaluator.py`):
   ```python
   response = self.model.generate_content(prompt)  # ❌ Direct API call
   ```

3. **Workflow** (`ai/workflow.py`):
   ```python
   criteria = extractor.extract_criteria(full_text)  # Direct call, no chain
   evaluation = evaluator.evaluate_bidder_criterion(criterion, chunks)  # Direct call
   ```

**User Tech Stack Requirement:**
> "AI Orchestration: LangChain"  
> "if any other techstack is used delete that and use this"

**IMPACT: BLOCKING**
- System doesn't match declared tech stack
- Breaks production requirement for LangChain orchestration
- No chain-based error handling, retries, or structured output validation

---

### F. Pipeline Flow Integrity ✅ / ❌

**Happy Path (Works):**
```
Upload Tender → Celery Queue → process_tender_async() → 
  Ingest chunks → DB:Document → 
  Gemini criteria extraction → DB:Criterion → 
  Status: uploaded → processing → completed ✅
```

**Bidder Path (Works):**
```
Upload Bidder → Celery Queue → evaluate_bidder_async() → 
  Ingest chunks → DB:Document → 
  Semantic search + Gemini evaluation → DB:Verdict → 
  Status: uploaded → processing → completed ✅
```

**Error Path (Partially Works):**
- ✅ Catches exceptions, marks entity `'failed'`
- ✅ Logs reason in AuditLog
- ⚠️ **Does NOT retry on LLM failures** (Gemini errors caught, returns empty list silently)
  ```python
  except Exception as e:
      logger.error("All Gemini attempts failed... returning []")
      return []  # ⚠️ Silent failure
  ```
- ✅ Tender processing marked completed even if 0 criteria extracted (risk: empty scorecard)

**Status Lifecycle:**
- ✅ Tender: `uploaded → processing → completed/failed`
- ✅ Bidder: `uploaded → processing → completed/failed`
- ✅ Verdict: Pass | Fail | Review_needed (status set by Gemini evaluation)

**⚠️ Data Flow Risk:**
- Bidder evaluation starts BEFORE tender criteria available (retries after 30s)
- If tender processing takes >90s (3 retries × 30s), bidder evaluation fails
- **Mitigation**: Depends_on ordering in Celery (not visible in code)

---

### G. Real-Time Updates (SSE or Polling) ✅ / ⚠️

**Backend SSE Endpoint:**
```python
@router.get("/tenders/{id}/stream")
async def stream_tender_status(id: int):
    """Opens fresh DB session per poll (good), streams updates every 2s"""
    max_polls = 150  # ~5 minutes
    db = SessionLocal()  # ✅ Fresh per tick
    yield f"data: {json.dumps(payload)}\n\n"
    # ✅ Exits when tender.status in (completed, failed)
```

**Production Safety:**
- ✅ Fresh DB session per iteration (prevents connection pool exhaustion)
- ✅ Exits gracefully when processing done (no infinite streaming)
- ✅ Proper SSE format (`data: {json}\n\n`)
- ✅ ~5 minute timeout (150 polls × 2s)

**Frontend Integration:**
- ⚠️ **SSE endpoint exists but NOT USED by React frontend**
- ⚠️ Frontend uses polling (`axios GET /scorecard every 5s`) instead
- ⚠️ Less efficient (unnecessary HTTP calls)
- **Status**: Functional but suboptimal

**Memory Leaks Check:**
- ✅ No hanging connections (fresh session per tick)
- ✅ `db.close()` in finally ensures cleanup
- ⚠️ Frontend polling: No memory leak visible, but higher bandwidth usage

---

### H. Audit Logging ✅

**Audit Event Coverage:**
```python
# All major events logged:
- tender_uploaded        → file_path, size_bytes
- processing_started     → status change
- ai_completed          → criteria_count, chunks
- processing_failed     → reason, traceback
- bidder_uploaded       → tender_id, file_count
- verdicts creation     → criterion_id, verdict count
```

**AuditLog Structure:**
```python
class AuditLog(Base):
    entity_type     # 'tender', 'bidder', 'criterion', 'verdict'
    entity_id       # ID of affected entity
    action          # 'upload', 'processing_started', etc.
    old_value       # JSON dict (before state)
    new_value       # JSON dict (after state)
    actor           # 'system', 'worker', 'api'
    reason          # Optional error reason
    timestamp       # Automatic
```

**Structured Logging:**
- ✅ `log_event()` helper in routes.py stores JSON to DB
- ✅ Logger emits structured logs to console
- ✅ All errors and warnings logged with context

**Debugging Value:**
- ✅ Can reconstruct full audit trail for compliance
- ✅ Can identify which worker failed and why
- ✅ Can trace entity status changes

---

### I. Reliability (Crash Handling) ✅ / ⚠️

**Corrupt Files:**
- ✅ PDF parse errors caught, marked failed
- ✅ DOCX parse errors caught, marked failed
- ✅ Image errors caught (per-page isolation)
- ✅ Entire bidder doesn't fail if 1 file is corrupt

**OCR Failures:**
- ✅ Caught, logged, page skipped with fallback to digital text
- ⚠️ No timeout on Tesseract (can hang on pathological images)

**LLM/API Downtime:**
- ✅ Retry with exponential backoff (1s, 2s, 4s)
- ✅ 3 attempts total
- ⚠️ After 3 failures, returns empty list (silent failure, no exception)
- ⚠️ No circuit breaker (will hammer API even if down)

**Worker Crashes:**
- ✅ Celery restarts automatically (`restart: on-failure` in docker-compose)
- ⚠️ No max_retries on restart (infinite restart loop if code crashes)

**Database Connection Loss:**
- ✅ `pool_pre_ping=True` detects stale connections
- ✅ Reconnect with 10-second timeout
- ✅ Continues operation if connection restored

**Partial Writes (Transaction Safety):**
- ✅ Rollback on exception
- ✅ Tender atomic: ingest → extract → store criteria all in same transaction
- ✅ Bidder atomic: ingest → evaluate → store verdicts all in same transaction

---

## 2. IDENTIFY GAPS

### CRITICAL GAPS (Demo-Breaking)

| # | Gap | Impact | Severity | Location |
|---|-----|--------|----------|----------|
| **C1** | **LangChain NOT implemented** | System doesn't use declared tech stack | **CRITICAL** | `ai/extractor.py`, `ai/evaluator.py`, `ai/workflow.py`, `requirements.txt` |
| **C2** | **Missing DB indexes on foreign keys** | Scorecard query slow (O(n²) instead of O(n)) | **CRITICAL** | `db/models.py` |
| **C3** | **Silent failure on all Gemini retries exhausted** | Tender with 0 criteria, bidders not evaluated | **CRITICAL** | `ai/extractor.py` line ~75, `ai/evaluator.py` line ~140 |

### HIGH-SEVERITY GAPS (Reliability Issues)

| # | Gap | Impact | Severity | Location |
|---|-----|--------|----------|----------|
| **H1** | OCR has no timeout | Worker can hang forever on pathological image | **HIGH** | `ingestion/processor.py` line ~58 |
| **H2** | No unique constraint on `Tender.file_path` | Duplicate uploads possible | **HIGH** | `db/models.py` line ~28 |
| **H3** | No transaction isolation level set | Concurrent updates may miss changes | **HIGH** | `db/database.py` |
| **H4** | Frontend doesn't use SSE endpoint | Inefficient polling, wastes bandwidth | **HIGH** | `frontend/src/App.tsx` |
| **H5** | Worker restart infinite loop | If code crashes, restarts forever | **HIGH** | `docker-compose.yml` line ~worker restart |

### MEDIUM-SEVERITY GAPS (Performance/Polish)

| # | Gap | Impact | Severity | Location |
|---|-----|--------|----------|----------|
| **M1** | No circuit breaker on Gemini API | Hammers API even if down | **MEDIUM** | `ai/extractor.py`, `ai/evaluator.py` |
| **M2** | Bidder evaluation waits for tender (30s × 3 retries) | 90s delay if tender slow | **MEDIUM** | `workers/tasks.py` line ~200 |
| **M3** | Error reason truncated to 500 chars | Long stack traces lost | **MEDIUM** | `workers/tasks.py` line ~78 |

---

## 3. IMPROVE SYSTEM

### FIX 1: Implement LangChain Integration (CRITICAL)

**Current:**
```python
# ai/extractor.py
from google.generativeai import GenerativeModel
self.model = genai.GenerativeModel("gemini-1.5-flash")
response = self.model.generate_content(prompt)  # Direct API call
```

**Target:**
```python
# requirements.txt - ADD
langchain
langchain-google-generativeai

# ai/extractor.py
from langchain.prompts import PromptTemplate
from langchain_google_generativeai import ChatGoogleGenerativeAI
from langchain.output_parsers import JsonOutputParser
from langchain.schema import BaseOutputParser

class CriterionExtractor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        self.prompt = PromptTemplate(
            input_variables=["tender_text"],
            template="""You are an expert procurement officer. Extract criteria...
Respond ONLY with the JSON array."""
        )
        # Use JsonOutputParser or custom OutputParser
        self.chain = self.prompt | self.llm | JsonOutputParser()
    
    def extract_criteria(self, tender_text: str) -> list:
        # Sliding window chunking
        for window in windows:
            try:
                # LangChain chain invocation with automatic retry
                result = self.chain.invoke({"tender_text": window})
                criteria.extend(result)
            except Exception as e:
                logger.error("Chain failed: %s", e)
                # LangChain handles structured error handling
```

**Evaluator:**
```python
# ai/evaluator.py
from langchain.prompts import PromptTemplate
from langchain_google_generativeai import ChatGoogleGenerativeAI

class BidderEvaluator:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        self.eval_chain = PromptTemplate(...) | self.llm | JsonOutputParser()
    
    def evaluate_bidder_criterion(self, criterion, chunks):
        context = "...\n".join(chunks)
        result = self.eval_chain.invoke({
            "criterion": criterion["text"],
            "context": context
        })
        return result
```

**Workflow:**
```python
# ai/workflow.py
class TenderMindWorkflow:
    async def process_tender_chunks(self, chunks):
        full_text = "\n".join([c.get("text", "") for c in chunks])
        # Now uses LangChain chain, not direct API
        criteria = await self.extractor.extract_criteria(full_text)  
        return criteria, full_text
```

---

### FIX 2: Add Database Indexes (CRITICAL)

**Add to db/models.py after each model definition:**

```python
# In Tender model
__table_args__ = (
    Index('idx_tender_status', 'status'),
    Index('idx_tender_created', 'created_at'),
)

# In Criterion model
__table_args__ = (
    Index('idx_criterion_tender_id', 'tender_id'),
)

# In Bidder model
__table_args__ = (
    Index('idx_bidder_tender_id', 'tender_id'),
    Index('idx_bidder_status', 'status'),
)

# In Document model
__table_args__ = (
    Index('idx_document_tender_id', 'tender_id'),
    Index('idx_document_bidder_id', 'bidder_id'),
    Index('idx_document_combined', 'tender_id', 'bidder_id'),  # Composite for faster JOIN
)

# In Verdict model
__table_args__ = (
    Index('idx_verdict_bidder_id', 'bidder_id'),
    Index('idx_verdict_criterion_id', 'criterion_id'),
    Index('idx_verdict_status', 'status'),  # For review_needed filtering
)
```

**Add Unique Constraint:**
```python
# In Tender model
file_path = Column(String, unique=True, nullable=True)  # Prevent duplicate uploads
```

---

### FIX 3: Add OCR Timeout (HIGH)

**In ingestion/processor.py:**

```python
import signal
import threading

def timeout_handler(signum, frame):
    raise TimeoutError("OCR processing exceeded 30 seconds")

def _ocr_with_timeout(img, timeout_sec=30):
    """Runs Tesseract with timeout."""
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout_sec)
    try:
        return pytesseract.image_to_string(img, lang="eng+hin", config="--psm 6 --oem 1")
    except TimeoutError:
        logger.warning("OCR timeout after %d seconds", timeout_sec)
        return ""  # Return empty rather than crash
    finally:
        signal.alarm(0)

# In process_pdf(), replace:
# text = pytesseract.image_to_string(...)
# with:
text = _ocr_with_timeout(img, timeout_sec=30)
```

**Alternative (cross-platform):**
```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

def _ocr_with_timeout_threaded(img, timeout_sec=30):
    """Cross-platform OCR timeout using ThreadPoolExecutor."""
    with ThreadPoolExecutor(max_workers=1) as executor:
        try:
            future = executor.submit(
                pytesseract.image_to_string,
                img, lang="eng+hin", config="--psm 6 --oem 1"
            )
            return future.result(timeout=timeout_sec)
        except FuturesTimeoutError:
            logger.warning("OCR timeout after %d seconds", timeout_sec)
            return ""
```

---

### FIX 4: Prevent Silent Gemini Failures (CRITICAL)

**In ai/extractor.py:**

```python
def _extract_single(self, text: str) -> list:
    """Calls Gemini with exponential backoff retry."""
    prompt = self._build_prompt(text)
    last_error = None
    
    for attempt in range(3):
        try:
            response = self.model.generate_content(prompt)
            return self._parse_json_array(response.text)
        except json.JSONDecodeError as je:
            last_error = je
            logger.warning("Gemini returned unparseable JSON (attempt %d): %s", attempt + 1, je)
        except Exception as e:
            last_error = e
            wait = 2 ** attempt
            logger.warning("Gemini attempt %d failed: %s. Retrying in %ds", attempt + 1, e, wait)
            time.sleep(wait)
    
    # ❌ DON'T silently return []. Raise so caller knows.
    logger.error("All Gemini attempts failed for criteria extraction")
    raise RuntimeError(f"Failed to extract criteria after 3 attempts: {last_error}")  # ✅ Raise
```

**In workers/tasks.py, catch this exception:**

```python
try:
    criteria_data, full_text = _run_async(workflow.process_tender_chunks(chunks))
except RuntimeError as e:
    logger.error("Criteria extraction failed: %s", e)
    # Mark as failed, will be retried by Celery
    _mark_entity_failed(db, Tender, tender_id, str(e))
    raise  # Re-raise to trigger Celery retry
```

---

### FIX 5: Add Circuit Breaker for Gemini API (MEDIUM)

**Create backends/circuitbreaker.py:**

```python
import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Too many failures, reject immediately
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout  # Seconds before half-open
        self.state = CircuitState.CLOSED
        self.last_failure_time = None
    
    def call(self, func, *args, **kwargs):
        """Executes func with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = CircuitState.HALF_OPEN
                logger.info("Circuit breaker: trying recovery (HALF_OPEN)")
            else:
                raise RuntimeError("Circuit breaker OPEN: API temporarily unavailable")
        
        try:
            result = func(*args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info("Circuit breaker: recovered (CLOSED)")
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.error("Circuit breaker: OPENED after %d failures", self.failure_count)
            raise

# In ai/extractor.py:
breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def _extract_single(self, text: str) -> list:
    def call_gemini():
        response = self.model.generate_content(self._build_prompt(text))
        return self._parse_json_array(response.text)
    
    return breaker.call(call_gemini)
```

---

### FIX 6: Enforce Transaction Isolation Level (HIGH)

**In db/database.py:**

```python
from sqlalchemy import create_engine, text

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args={
        "connect_timeout": 10,
        "options": "-c isolation_level=SERIALIZABLE"  # ✅ Strict isolation
    },
)

# Or set per-session:
SessionLocal = sessionmaker(bind=engine)

class Session(SessionLocal):
    def __init__(self):
        super().__init__()
        # Set isolation level after each connection
        self.execute(text("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;"))
```

**Note**: SERIALIZABLE may cause performance degradation. Use READ_COMMITTED for most cases:
```python
"options": "-c isolation_level=READ_COMMITTED"
```

---

### FIX 7: Implement Frontend SSE (HIGH)

**In frontend/src/components/StatusPoller.tsx (new):**

```typescript
import { useEffect, useState } from 'react';

export function StatusPoller({ tenderId, onUpdate }) {
  useEffect(() => {
    const eventSource = new EventSource(`/api/tenders/${tenderId}/stream`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        console.error('Status stream error:', data.error);
        eventSource.close();
        return;
      }
      onUpdate(data);
      
      // Auto-close when done
      if (data.tender_status === 'completed' || data.tender_status === 'failed') {
        eventSource.close();
      }
    };
    
    eventSource.onerror = () => {
      console.error('SSE connection failed, falling back to polling');
      eventSource.close();
      // Fallback to polling every 5s
      const interval = setInterval(async () => {
        const res = await fetch(`/api/tenders/${tenderId}/status`);
        onUpdate(await res.json());
      }, 5000);
      return () => clearInterval(interval);
    };
    
    return () => eventSource.close();
  }, [tenderId]);
  
  return null;  // Invisible component, just manages updates
}
```

**In App.tsx:**
```typescript
import { StatusPoller } from './components/StatusPoller';

function App() {
  const [status, setStatus] = useState(null);
  
  return (
    <>
      <StatusPoller tenderId={tenderId} onUpdate={setStatus} />
      {/* Render status... */}
    </>
  );
}
```

---

### FIX 8: Add Max Retries to Worker Restart (HIGH)

**In docker-compose.yml:**

```yaml
celery-worker:
  image: ...
  command: celery -A workers.tasks worker --loglevel=info --concurrency=2
  restart: on-failure
  max_retries: 5  # ✅ Stop restarting after 5 crashes
  depends_on:
    db:
      condition: service_healthy
    redis:
      condition: service_healthy
```

---

## 4. EDGE CASE TESTING

### Test Matrix

| Scenario | Setup | Expected Behavior | Pass/Fail | Notes |
|----------|-------|-------------------|-----------|-------|
| **Large PDF** | Upload 100-page 50MB PDF | Processes first 200 pages, chunks to DB, extracts criteria | ✅ SHOULD PASS | MAX_PDF_PAGES capped at 200 |
| **Corrupt PDF** | Upload invalid PDF header | Handled gracefully, marked failed, audit logged | ⚠️ NEEDS TEST | PyMuPDF raises on open(), caught and logged |
| **OCR-Heavy Scan** | Upload all-scanned PDF (>1000 DPI) | OCR runs (may be slow), completes within 5min, or times out gracefully | ⚠️ NEEDS TEST | OCR timeout not implemented (FIX #3) |
| **Gemini Rate Limit** | Fire 10 bidder evaluations in parallel | Retry with backoff, some succeed, some fail after 3 retries | ⚠️ NEEDS TEST | No circuit breaker (FIX #5) |
| **LLM Down** | Gemini API returns 503 | Worker retries 3 times (30s total), marks entity failed | ⚠️ NEEDS TEST | Silent failure risk (FIX #4) |
| **Concurrent Uploads** | 5 simultaneous bidder uploads for same tender | All processed in parallel, all marked completed, no DB conflicts | ⚠️ NEEDS TEST | Pool_pre_ping handles connection reuse |
| **Database Down (Mid-Process)** | Disconnect PostgreSQL while tender processing | Worker catches error, marks failed, reconnects on retry | ⚠️ NEEDS TEST | pool_pre_ping should handle this |
| **Bidder Before Tender** | Submit bidder docs before tender criteria ready | Bidder task waits 30s, retries up to 3x (90s max) | ✅ SHOULD PASS | Built-in retry logic |
| **Zero-Byte File** | Upload empty file (0 bytes) | Skipped with warning, no crash | ⚠️ NEEDS TEST | No explicit zero-byte check |
| **Hindi-Only Tender** | Upload Hindi-language RFQ | Extracted text correct, criteria in Hindi, scoring works | ⚠️ NEEDS TEST | OCR supports `eng+hin`, langdetect identifies language |
| **Pathological Image** | Upload corrupted image (truncated header) | OCR times out or fails gracefully | ❌ FAILS | No OCR timeout (FIX #3) |
| **Missing Tesseract** | Run without Tesseract installed | Logs warning, skips OCR, uses digital text only | ⚠️ NEEDS TEST | Warning logged in processor.py init |
| **DOCX with Nested Tables** | Upload Word doc with 5-level nested tables | Extracts all cell text without duplication | ⚠️ NEEDS TEST | python-docx recursion handled? |

### Specific Test Scripts

**Test 1: Large PDF Handling**
```bash
# Generate 150-page test PDF (10MB)
python -c "
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
c = canvas.Canvas('test_large.pdf', pagesize=letter)
for i in range(150):
    c.drawString(100, 750, f'Page {i+1}. ' + 'Lorem ipsum dolor sit amet. ' * 50)
    c.showPage()
c.save()
"

# Upload
curl -X POST -F "file=@test_large.pdf" http://localhost:8000/api/upload/tender
```

**Test 2: OCR Timeout (if OCR timeout implemented)**
```bash
# Create a very high-DPI image that will slow Tesseract
python -c "
from PIL import Image, ImageDraw
img = Image.new('RGB', (10000, 10000), color='white')
draw = ImageDraw.Draw(img)
for i in range(1000):
    draw.text((10, i*10), 'Test text for OCR', fill='black')
img.save('huge_image.png')
"

# Upload as bidder doc
curl -X POST -F "tender_id=1" -F "vendor_name=TestCorp" -F "files=@huge_image.png" \
  http://localhost:8000/api/upload/bidder
```

**Test 3: Concurrent Uploads**
```bash
#!/bin/bash
# Upload 5 bidders simultaneously for same tender
for i in {1..5}; do
  echo "Uploading bidder $i..."
  curl -X POST -F "tender_id=1" -F "vendor_name=Vendor$i" -F "files=@sample.pdf" \
    http://localhost:8000/api/upload/bidder &
done
wait
echo "All uploads complete"
```

**Test 4: Tender Then Bidder Sequence**
```bash
# 1. Upload tender
TENDER_RESPONSE=$(curl -s -X POST -F "file=@tender.pdf" http://localhost:8000/api/upload/tender)
TENDER_ID=$(echo $TENDER_RESPONSE | jq -r '.id')
echo "Tender ID: $TENDER_ID"

# 2. Wait for criteria extraction (poll /criteria endpoint)
for i in {1..60}; do
  CRITERIA=$(curl -s http://localhost:8000/api/tenders/$TENDER_ID/criteria)
  COUNT=$(echo $CRITERIA | jq 'length')
  if [ "$COUNT" -gt 0 ]; then
    echo "Criteria ready: $COUNT criteria"
    break
  fi
  echo "Waiting for criteria... ($i/60)"
  sleep 1
done

# 3. Upload bidder
curl -X POST -F "tender_id=$TENDER_ID" -F "vendor_name=TestVendor" \
  -F "files=@bidder.pdf" http://localhost:8000/api/upload/bidder

# 4. Poll scorecard
curl http://localhost:8000/api/tenders/$TENDER_ID/scorecard | jq .
```

**Test 5: Database Connection Loss**
```bash
# In separate terminal, simulate connection loss:
docker-compose exec db psql -U postgres -d tendermind -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='tendermind' AND pid != pg_backend_pid();"

# Then immediately trigger a request
curl http://localhost:8000/api/tenders
# Should reconnect automatically with pool_pre_ping=True
```

---

## 5. FINAL DEMO CHECKLIST

### Pre-Demo Verification (Day Before)

- [ ] **Database**: `docker-compose ps` shows `db` and `redis` as "healthy"
- [ ] **Backend**: `docker-compose ps` shows `api` and `celery-worker` as running
- [ ] **Frontend**: `docker-compose ps` shows `frontend` as running
- [ ] **Health check**: `curl http://localhost:8000/health` returns `200 OK`
- [ ] **Flower**: `curl http://localhost:5555` returns Flower dashboard
- [ ] **Storage**: `/uploads` directory exists and is writable
- [ ] **Logs**: `docker-compose logs api` shows no error stacktraces
- [ ] **Sample data**: Tender and bidder test files prepared

### Demo Flow Walkthrough

**Step 1: Tender Upload (2 minutes)**
- [ ] Navigate to UI upload form
- [ ] Upload sample tender PDF (government RFQ)
- [ ] Verify status changes: "uploaded" → "processing" → "completed"
- [ ] Verify criteria extracted: check `/api/tenders/{id}/criteria` returns list
- [ ] Verify criteria count > 0
- [ ] Audit log shows: `tender_uploaded`, `processing_started`, `ai_completed`

**Step 2: Bidder Upload (3 minutes)**
- [ ] Upload 3 different bidder submissions (multi-file acceptable)
- [ ] Verify each bidder status: "uploaded" → "processing" → "completed"
- [ ] Verify documents ingested: `curl /api/tenders/{id}/bidders` shows all 3
- [ ] Verify verdicts created: `curl /api/tenders/{id}/scorecard` shows verdicts
- [ ] Audit log shows: `bidder_uploaded`, `processing_started`, `ai_completed`

**Step 3: Scorecard Review (2 minutes)**
- [ ] Navigate to scorecard view
- [ ] Verify all criteria displayed
- [ ] Verify compliance scores calculated (0.0 to 1.0 range)
- [ ] Verify disqualification logic works (if any fail mandatory criteria)
- [ ] Verify bidders ranked by score (highest first, disqualified last)

**Step 4: Verdict Review & Audit (2 minutes)**
- [ ] Click on a verdict to see details
- [ ] Verify evidence citation shows document excerpt + page number
- [ ] Click "Review" button to edit verdict
- [ ] Change status (pass → fail, etc.)
- [ ] Verify audit log updated with who, when, and change
- [ ] Verify compliance score re-calculated

**Step 5: Real-Time Status (1 minute)**
- [ ] Open `/tenders/{id}/stream` in new tab (raw SSE)
- [ ] Trigger a new upload in first tab
- [ ] Verify SSE updates appear in real-time (or use polling fallback)
- [ ] Verify stream closes when processing done

**Step 6: Error Handling (2 minutes)**
- [ ] Upload corrupt file (invalid PDF or truncated file)
- [ ] Verify marked as "failed" (not crashed)
- [ ] Verify error reason logged in audit
- [ ] Verify UI shows error gracefully

**Step 7: Performance Check (1 minute)**
- [ ] Upload larger tender (5MB+ PDF, 50+ pages)
- [ ] Monitor response time (should complete in <2 min)
- [ ] Check Flower dashboard: worker should process task without hanging
- [ ] Check database query performance: `/scorecard` response < 1 second

**Step 8: Logging & Monitoring (1 minute)**
- [ ] Check application logs: `docker-compose logs api | tail -50`
- [ ] Verify structured logging (JSON format visible)
- [ ] Check worker logs: `docker-compose logs celery-worker | tail -50`
- [ ] Verify no error stacktraces (only warnings/info)
- [ ] Check Flower dashboard: all tasks show "SUCCESS" (none in "FAILURE" or "RETRY")

### Demo Failure Scenarios (Risk Mitigation)

| Failure Scenario | Mitigation | Backup Plan |
|------------------|-----------|-------------|
| **Database not responding** | Pre-demo check `docker-compose ps` | Restart: `docker-compose restart db` |
| **Worker hung on OCR** | Check Flower dashboard for stuck tasks | Kill task, upload smaller file |
| **Gemini API down** | Fallback to stored mock responses in code | Pre-record responses, use fixtures |
| **Frontend not building** | Pre-demo build: `npm run build` | Use browser dev tools to debug |
| **File upload fails** | Check file permissions on /uploads | Create directory if missing |
| **Scorecard slow to load** | Add indexes (FIX #2 above) | Clear database, start fresh |
| **SSE not working** | Switch to polling fallback (built-in) | Disable SSE, use API polling |

### Demo Confidence Checklist

- [ ] **LangChain integrated** (FIX #1 completed and tested)
- [ ] **Database indexes added** (FIX #2 completed)
- [ ] **OCR timeout implemented** (FIX #3 completed)
- [ ] **Gemini failures raise exceptions** (FIX #4 completed)
- [ ] **Circuit breaker optional but recommended** (FIX #5)
- [ ] **Frontend uses SSE** (FIX #7 completed)
- [ ] **No worker restart infinite loop** (FIX #8 completed)
- [ ] **All edge cases tested** (Test Matrix 4 sections passed)
- [ ] **Demo script rehearsed** (2 full walkthroughs completed)
- [ ] **Backup data prepared** (3 sample tenders, 5 sample bidders)

---

## Summary

### What's Working Well ✅
- FastAPI routes fully functional
- Celery async tasks with proper retry/backoff
- Ingestion pipeline handles PDF/OCR/DOCX
- Database models correctly defined
- Audit logging complete
- Error handling per-file isolation
- Connection pooling safe (`pool_pre_ping`)
- SSE endpoint implemented

### What Needs Fixing 🔧
1. **LangChain integration** (CRITICAL - declared but not implemented)
2. **Database indexes** (CRITICAL - will slow scorecard queries)
3. **Silent Gemini failures** (CRITICAL - no error raised)
4. **OCR timeout** (HIGH - can hang indefinitely)
5. **Unique file path constraint** (HIGH - duplicate uploads possible)
6. **Frontend SSE** (HIGH - exists but not used)
7. **Worker restart loop** (HIGH - infinite retries on crash)
8. **Transaction isolation** (HIGH - concurrent change risks)

### Implementation Priority
1. **FIX #1** (LangChain) - Aligns with tech stack
2. **FIX #4** (Raise Gemini errors) - Prevents silent failures
3. **FIX #2** (Indexes) - Essential for performance
4. **FIX #3** (OCR timeout) - Prevents worker hangs
5. **FIX #7** (Frontend SSE) - Improves UX

**Estimated remediation time**: 4-6 hours for all critical fixes

