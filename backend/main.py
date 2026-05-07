from dotenv import load_dotenv
load_dotenv()  # MUST be first — before any os.getenv() calls

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
import json
import os
import time
from collections import defaultdict
from api.routes import router as api_router
from api.export import export_router
from api.auth import auth_router
from db.database import init_db, get_db, engine
from fastapi import Depends

# ─── Structured JSON Logging ──────────────────────────────────────────────────

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            log["exc"] = self.formatException(record.exc_info)
        return json.dumps(log, ensure_ascii=False)

def setup_logging():
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)
    # Silence noisy libraries
    logging.getLogger("transformers").setLevel(logging.WARNING)
    logging.getLogger("sentence_transformers").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

setup_logging()
logger = logging.getLogger(__name__)

# ─── DB Init ─────────────────────────────────────────────────────────────────

init_db()
logger.info("Database initialized")

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="TenderMind API",
    description="AI-powered co-pilot for government procurement",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ─── Rate Limiting ────────────────────────────────────────────────────────────

RATE_LIMIT_REQUESTS = int(os.getenv("RATE_LIMIT_REQUESTS", "60"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))
rate_limit_store: dict[str, list] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()

    rate_limit_store[client_ip] = [
        t for t in rate_limit_store[client_ip]
        if current_time - t < RATE_LIMIT_WINDOW
    ]

    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Rate limit exceeded. Please try again later."}
        )

    rate_limit_store[client_ip].append(current_time)

    response = await call_next(request)
    return response

app.include_router(api_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(auth_router, prefix="/api")

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Welcome to TenderMind API", "version": "1.0.0"}


@app.get("/health", summary="Deep health check for all dependencies")
async def health_check():
    """
    Checks DB and Redis connectivity.
    Returns 200 if all healthy, 503 if any dependency is down.
    """
    import redis as redis_client

    checks = {"api": "ok", "db": "unknown", "redis": "unknown"}

    # DB check
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["db"] = "ok"
    except Exception as e:
        checks["db"] = f"error: {e}"
        logger.error("Health check: DB failed: %s", e)

    # Redis check
    try:
        r = redis_client.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), socket_connect_timeout=3)
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        logger.error("Health check: Redis failed: %s", e)

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503
    return JSONResponse(content=checks, status_code=status_code)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)  # log_config=None = use our custom logger
