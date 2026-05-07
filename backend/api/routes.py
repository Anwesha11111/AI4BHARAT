from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from db.database import get_db, SessionLocal
from db.models import Tender, Bidder, Criterion, Verdict, AuditLog, Vendor
from workers.tasks import process_tender_async, evaluate_bidder_async
import os
import json
import asyncio
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_ROOT", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}

MAGIC_BYTES = {
    ".pdf": [b"%PDF"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".tiff": [b"II*\x00", b"MM\x00*"],
    ".tif": [b"II*\x00", b"MM\x00*"],
    ".docx": [b"PK\x03\x04"],
    ".doc": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
}


def validate_file_magic(file_content: bytes, extension: str) -> bool:
    """Validate file content matches expected magic bytes for the extension."""
    if extension not in MAGIC_BYTES:
        return True

    expected_magics = MAGIC_BYTES[extension]
    for magic in expected_magics:
        if file_content[:len(magic)] == magic:
            return True
    return False


def log_event(db: Session, entity_type: str, entity_id: int, action: str, actor: str = "system", reason: str = None, old_value=None, new_value=None):
    db.add(AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        actor=actor,
        reason=reason
    ))


async def save_upload_chunked(upload: UploadFile, dest_path: str, extension: str = "") -> int:
    """Saves an upload in 64KB chunks, enforces MAX_FILE_SIZE and validates magic bytes."""
    size = 0
    first_chunk = True
    with open(dest_path, "wb") as f:
        while True:
            chunk = await upload.read(65536)
            if not chunk:
                break

            if first_chunk and extension:
                if not validate_file_magic(chunk, extension):
                    f.close()
                    os.remove(dest_path)
                    raise HTTPException(
                        400,
                        f"File content does not match expected format for {extension}. Possible file type mismatch."
                    )
                first_chunk = False

            size += len(chunk)
            if size > MAX_FILE_SIZE:
                f.close()
                os.remove(dest_path)
                raise HTTPException(413, f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit")
            f.write(chunk)
    return size


def compute_bidder_score(verdicts: list, criteria: list) -> float:
    """Weighted compliance score: 0.0 to 1.0."""
    weighted_sum = 0.0
    total_weight = 0.0
    criteria_map = {c["id"]: c for c in criteria}
    for v in verdicts:
        c = criteria_map.get(v.criterion_id)
        if not c:
            continue
        weight = c.get("weight", 1.0)
        score = {"pass": 1.0, "review_needed": 0.5, "fail": 0.0}.get(v.status, 0.0)
        confidence = v.confidence or 0.0
        weighted_sum += score * weight * confidence
        total_weight += weight
    return round(weighted_sum / total_weight, 4) if total_weight > 0 else 0.0


def is_disqualified(verdicts: list, criteria: list) -> bool:
    """Returns True if the bidder fails any mandatory criterion."""
    criteria_map = {c["id"]: c for c in criteria}
    for v in verdicts:
        c = criteria_map.get(v.criterion_id)
        if c and c.get("type") == "mandatory" and v.status == "fail":
            return True
    return False


# ─── Tender Upload ─────────────────────────────────────────────────────────────

@router.post("/upload/tender", summary="Upload a tender document")
async def upload_tender(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not supported. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    new_tender = Tender(title=file.filename, description="Uploaded tender")
    db.add(new_tender)
    db.commit()
    db.refresh(new_tender)

    tender_dir = os.path.join(UPLOAD_DIR, f"tender_{new_tender.id}")
    os.makedirs(tender_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(tender_dir, safe_name)

    try:
        size = await save_upload_chunked(file, file_path, ext)
    except HTTPException:
        db.delete(new_tender)
        db.commit()
        raise

    new_tender.file_path = file_path
    new_tender.status = "uploaded"
    log_event(db, "tender", new_tender.id, "tender_uploaded", actor="api",
              new_value={"file_path": file_path, "size_bytes": size})
    db.commit()

    process_tender_async.delay(new_tender.id)
    logger.info("Tender %s uploaded (%d bytes), processing queued", new_tender.id, size)

    return {
        "id": new_tender.id,
        "status": new_tender.status,
        "message": "Tender upload successful. Processing started.",
    }


@router.post("/tenders/upload", include_in_schema=False)
async def upload_tender_legacy(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await upload_tender(file=file, db=db)


# ─── Tender List ───────────────────────────────────────────────────────────────

@router.get("/tenders", summary="List all tenders")
async def list_tenders(db: Session = Depends(get_db)):
    tenders = db.query(Tender).order_by(Tender.id.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tenders
    ]


# ─── Criteria ──────────────────────────────────────────────────────────────────

@router.get("/tenders/{id}/criteria")
async def get_criteria(id: int, db: Session = Depends(get_db)):
    criteria = db.query(Criterion).filter(Criterion.tender_id == id).all()
    return [
        {
            "id": c.id,
            "tender_id": c.tender_id,
            "text": c.text,
            "type": c.type,
            "weight": c.weight
        }
        for c in criteria
    ]


# ─── Bidder Upload ─────────────────────────────────────────────────────────────

@router.post("/upload/bidder", summary="Submit bidder documents")
async def upload_bidder(
    tender_id: int = Form(...),
    vendor_name: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    if not files:
        raise HTTPException(status_code=400, detail="At least one bidder file is required")

    vendor = db.query(Vendor).filter(Vendor.name == vendor_name).first()
    if not vendor:
        vendor = Vendor(name=vendor_name)
        db.add(vendor)
        db.commit()
        db.refresh(vendor)

    new_bidder = Bidder(tender_id=tender_id, vendor_id=vendor.id, status="uploaded")
    db.add(new_bidder)
    db.commit()
    db.refresh(new_bidder)

    bidder_dir = os.path.join(UPLOAD_DIR, f"bidder_{new_bidder.id}")
    os.makedirs(bidder_dir, exist_ok=True)

    stored_files = []
    for uploaded_file in files:
        ext = os.path.splitext(uploaded_file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            logger.warning("Skipping unsupported file %s", uploaded_file.filename)
            continue
        safe_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(bidder_dir, safe_name)
        await save_upload_chunked(uploaded_file, file_path, ext)
        stored_files.append(file_path)

    if not stored_files:
        db.delete(new_bidder)
        db.commit()
        raise HTTPException(400, "No valid files were uploaded")

    new_bidder.folder_path = bidder_dir
    log_event(
        db, "bidder", new_bidder.id, "bidder_uploaded", actor="api",
        new_value={"tender_id": tender_id, "file_count": len(stored_files)}
    )
    db.commit()

    evaluate_bidder_async.delay(new_bidder.id)
    logger.info("Bidder %s uploaded (%d files), evaluation queued", new_bidder.id, len(stored_files))

    return {
        "id": new_bidder.id,
        "status": new_bidder.status,
        "file_count": len(stored_files),
        "message": "Bidder submission accepted. Evaluation started.",
    }


@router.post("/bidders/upload", include_in_schema=False)
async def upload_bidder_legacy(
    tender_id: int = Form(...),
    vendor_name: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    return await upload_bidder(tender_id=tender_id, vendor_name=vendor_name, files=files, db=db)


# ─── Bidder List ────────────────────────────────────────────────────────────────

@router.get("/tenders/{id}/bidders", summary="List all bidders for a tender")
async def list_bidders(id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
    return [
        {
            "id": b.id,
            "vendor_name": b.vendor.name,
            "status": b.status,
            "submission_date": b.submission_date.isoformat() if b.submission_date else None,
        }
        for b in bidders
    ]


# ─── Scorecard ─────────────────────────────────────────────────────────────────

@router.get("/tenders/{id}/scorecard", summary="Ranked bidder compliance scorecard")
async def get_scorecard(id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
    criteria = db.query(Criterion).filter(Criterion.tender_id == id).all()
    criteria_dicts = [{"id": c.id, "text": c.text, "type": c.type, "weight": c.weight} for c in criteria]

    matrix = []
    for bidder in bidders:
        verdicts = db.query(Verdict).filter(Verdict.bidder_id == bidder.id).all()
        score = compute_bidder_score(verdicts, criteria_dicts)
        disqualified = is_disqualified(verdicts, criteria_dicts)
        matrix.append({
            "bidder_id": bidder.id,
            "status": bidder.status,
            "vendor_name": bidder.vendor.name,
            "compliance_score": score,
            "disqualified": disqualified,
            "verdicts": [
                {
                    "id": v.id,
                    "bidder_id": v.bidder_id,
                    "criterion_id": v.criterion_id,
                    "status": v.status,
                    "confidence": v.confidence,
                    "reasoning": v.reasoning,
                    "evidence_citation": v.evidence_citation,
                    "is_human_reviewed": v.is_human_reviewed,
                    "created_at": v.created_at.isoformat() if v.created_at else None,
                }
                for v in verdicts
            ]
        })

    matrix.sort(key=lambda b: (not b["disqualified"], b["compliance_score"]), reverse=True)

    return {
        "tender_id": id,
        "status": tender.status,
        "criteria": criteria_dicts,
        "bidders": matrix,
    }


# ─── Status ────────────────────────────────────────────────────────────────────

@router.get("/tenders/{id}/status", summary="Get tender + all bidder statuses")
async def get_tender_status(id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
    return {
        "tender_id": tender.id,
        "status": tender.status,
        "bidders": [{"id": b.id, "status": b.status, "vendor": b.vendor.name} for b in bidders]
    }


# ─── SSE Stream ────────────────────────────────────────────────────────────────

@router.get("/tenders/{id}/stream", summary="Server-Sent Events: real-time processing status")
async def stream_tender_status(id: int):
    """Streams tender + bidder status updates via SSE."""
    async def event_generator():
        max_polls = 150
        for _ in range(max_polls):
            db = SessionLocal()
            try:
                tender = db.query(Tender).filter(Tender.id == id).first()
                if not tender:
                    yield f"data: {json.dumps({'error': 'not_found'})}\n\n"
                    return

                bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
                payload = {
                    "tender_id": id,
                    "tender_status": tender.status,
                    "bidders": [{"id": b.id, "status": b.status} for b in bidders],
                }
                yield f"data: {json.dumps(payload)}\n\n"

                all_done = tender.status in ("completed", "failed") and all(
                    b.status in ("completed", "failed") for b in bidders
                )
            finally:
                db.close()

            if all_done:
                return
            await asyncio.sleep(2)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ─── Human Review ──────────────────────────────────────────────────────────────

@router.patch("/verdicts/{id}/review")
async def review_verdict(id: int, status: str, reason: str, actor: str, db: Session = Depends(get_db)):
    verdict = db.query(Verdict).filter(Verdict.id == id).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict not found")

    if status not in ("pass", "fail", "review_needed"):
        raise HTTPException(status_code=400, detail="status must be 'pass', 'fail', or 'review_needed'")

    old_status = verdict.status
    verdict.status = status
    verdict.is_human_reviewed = True

    log_event(
        db,
        "verdict",
        id,
        "human_review",
        actor=actor,
        reason=reason,
        old_value={"status": old_status},
        new_value={"status": status}
    )

    db.commit()
    return {"message": "Verdict updated successfully"}


# ─── Audit Log ─────────────────────────────────────────────────────────────────

@router.get("/tenders/{id}/audit", summary="Retrieve audit log for a tender")
async def get_audit_log(id: int, db: Session = Depends(get_db)):
    """Returns all audit events related to a tender and its bidders."""
    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidder_ids = [b.id for b in db.query(Bidder).filter(Bidder.tender_id == id).all()]

    logs = db.query(AuditLog).filter(
        (AuditLog.entity_type == "tender") & (AuditLog.entity_id == id)
        | (AuditLog.entity_type == "bidder") & (AuditLog.entity_id.in_(bidder_ids))
        | (AuditLog.entity_type == "verdict")
    ).order_by(AuditLog.timestamp.asc()).all()

    return [
        {
            "id": log.id,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "action": log.action,
            "actor": log.actor,
            "reason": log.reason,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]


# ─── Document Viewing ─────────────────────────────────────────────────────────

@router.get("/tenders/{id}/document", summary="Get tender document for viewing")
async def get_tender_document(id: int, db: Session = Depends(get_db)):
    """Returns tender document file for viewing/download."""
    from fastapi.responses import FileResponse

    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    if not tender.file_path or not os.path.exists(tender.file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    filename = os.path.basename(tender.file_path)
    ext = os.path.splitext(filename)[1].lower()

    media_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }

    return FileResponse(
        tender.file_path,
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=tender.title or filename
    )


@router.get("/tenders/{id}/documents", summary="List all documents for a tender")
async def list_tender_documents(id: int, db: Session = Depends(get_db)):
    """Returns list of all documents associated with a tender."""
    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    documents = []

    # Tender document
    if tender.file_path and os.path.exists(tender.file_path):
        documents.append({
            "type": "tender",
            "id": tender.id,
            "name": tender.title or os.path.basename(tender.file_path),
            "path": f"/api/tenders/{id}/document"
        })

    # Bidder documents
    bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
    for bidder in bidders:
        if bidder.folder_path and os.path.exists(bidder.folder_path):
            for filename in os.listdir(bidder.folder_path):
                documents.append({
                    "type": "bidder",
                    "id": bidder.id,
                    "bidder_name": bidder.vendor.name if bidder.vendor else f"Bidder {bidder.id}",
                    "name": filename,
                    "path": f"/api/bidders/{bidder.id}/document/{filename}"
                })

    return {"tender_id": id, "documents": documents}


@router.get("/bidders/{bidder_id}/document/{filename}", summary="Get bidder document")
async def get_bidder_document(bidder_id: int, filename: str, db: Session = Depends(get_db)):
    """Returns a specific bidder document file."""
    from fastapi.responses import FileResponse

    bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found")

    if not bidder.folder_path:
        raise HTTPException(status_code=404, detail="No documents for this bidder")

    # Security: prevent path traversal
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(bidder.folder_path, safe_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found")

    ext = os.path.splitext(safe_filename)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }

    return FileResponse(
        file_path,
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=safe_filename
    )
