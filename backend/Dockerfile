# ────────────────────────────────────────────────────────────────────────
# TenderMind Backend Dockerfile
# FastAPI + Celery + LangChain + Gemini
# ────────────────────────────────────────────────────────────────────────

FROM python:3.10-slim

# Install system dependencies (Tesseract, etc.)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Default command (overridden by docker-compose)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
