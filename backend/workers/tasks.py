from celery import Celery
from celery.exceptions import SoftTimeLimitExceeded
import os
from ai.workflow import workflow
from db.database import SessionLocal
from db.models import Tender, Criterion, Bidder, Verdict, AuditLog, Document
from ingestion.processor import processor
import logging
import asyncio

logger = logging.getLogger(__name__)

celery_app = Celery(
    "tasks",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://redis:6379/0"),
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_soft_time_limit=300,       # 5 min: raise SoftTimeLimitExceeded
    task_time_limit=360,            # 6 min: hard kill
    task_acks_late=True,            # Only ack after completion → safe re-queue on crash
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,   # One task at a time per worker (OCR is CPU-heavy)
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _event(db, entity_type, entity_id, action, actor="system", reason=None, old_value=None, new_value=None):
    """Appends an AuditLog entry (caller must commit)."""
    db.add(AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        actor=actor,
        reason=reason,
    ))


def _run_async(coro):
    """Runs an async coroutine in a new event loop (Celery tasks are sync)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _mark_entity_failed(db, Model, entity_id: int, reason: str, actor: str = "worker"):
    """Safely marks a Tender or Bidder as 'failed' with an audit event."""
    entity = db.query(Model).filter(Model.id == entity_id).first()
    if entity:
        old_status = entity.status
        entity.status = "failed"
        _event(
            db, Model.__tablename__.rstrip("s"),  # 'tender' or 'bidder'
            entity_id, "processing_failed",
            actor=actor,
            reason=reason[:500],  # Truncate long tracebacks
            old_value={"status": old_status},
            new_value={"status": "failed"},
        )
        db.commit()


# ─── Tender Processing Task ───────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.process_tender",
    max_retries=3,
    default_retry_delay=15,
    track_started=True,
)
def process_tender_async(self, tender_id: int):
    """
    Ingests the tender PDF/DOCX, extracts chunks → DB, runs Gemini criteria extraction.
    Idempotent: skips if tender is already 'completed'.
    """
    logger.info("[task=%s] Starting tender processing: tender_id=%s", self.request.id, tender_id)

    db = SessionLocal()
    try:
        tender = db.query(Tender).filter(Tender.id == tender_id).first()
        if not tender:
            logger.warning("Tender %s not found — skipping", tender_id)
            return {"skipped": "tender_not_found"}

        # Idempotency guard
        if tender.status == "completed":
            logger.info("Tender %s already completed — skipping reprocessing", tender_id)
            return {"skipped": "already_completed"}

        # ── Step 1: Ingest file ──
        old_status = tender.status
        tender.status = "processing"
        _event(db, "tender", tender.id, "processing_started", actor="worker",
               old_value={"status": old_status}, new_value={"status": "processing"})
        db.commit()

        chunks = processor.auto_process(tender.file_path)
        logger.info("Ingested %d chunks from tender %s", len(chunks), tender_id)

        # ── Step 2: Store chunks (atomic delete + insert) ──
        db.query(Document).filter(
            Document.tender_id == tender.id,
            Document.bidder_id.is_(None)
        ).delete()

        for chunk in chunks:
            db.add(Document(
                tender_id=tender.id,
                bidder_id=None,
                text=chunk.get("text", ""),
                page=chunk.get("page", 1),
                file_name=chunk.get("source_file", os.path.basename(tender.file_path or "unknown")),
                source_type=chunk.get("type", "unknown"),
                language=chunk.get("language", "unknown"),
            ))
        db.commit()

        # ── Step 3: AI criteria extraction ──
        criteria_data, full_text = _run_async(workflow.process_tender_chunks(chunks))
        logger.info("Gemini extracted %d criteria for tender %s", len(criteria_data), tender_id)

        db.query(Criterion).filter(Criterion.tender_id == tender.id).delete()
        tender.raw_text = full_text

        for c in criteria_data:
            db.add(Criterion(
                tender_id=tender.id,
                text=c["text"],
                type=c.get("type", "mandatory"),
                weight=c.get("weight", 1.0),
            ))

        # ── Step 4: Mark completed ──
        tender.status = "completed"
        _event(db, "tender", tender.id, "ai_completed", actor="worker",
               old_value={"status": "processing"},
               new_value={"status": "completed", "criteria_count": len(criteria_data), "chunks": len(chunks)})
        db.commit()

        logger.info("[task=%s] Tender %s processing complete: %d criteria", self.request.id, tender_id, len(criteria_data))
        return {"tender_id": tender_id, "criteria": len(criteria_data), "chunks": len(chunks)}

    except SoftTimeLimitExceeded:
        db.rollback()
        logger.error("[task=%s] Tender %s hit time limit", self.request.id, tender_id)
        _mark_entity_failed(db, Tender, tender_id, "Task exceeded 5-minute time limit")
        # Do NOT retry on timeout
        return {"error": "timeout", "tender_id": tender_id}

    except Exception as exc:
        db.rollback()
        logger.exception("[task=%s] Tender %s failed: %s", self.request.id, tender_id, exc)
        _mark_entity_failed(db, Tender, tender_id, str(exc))
        raise self.retry(exc=exc)

    finally:
        db.close()


# ─── Bidder Evaluation Task ───────────────────────────────────────────────────

@celery_app.task(
    bind=True,
    name="tasks.evaluate_bidder",
    max_retries=3,
    default_retry_delay=15,
    track_started=True,
)
def evaluate_bidder_async(self, bidder_id: int):
    """
    Ingests all bidder documents, evaluates each criterion via Gemini.
    Idempotent: skips if bidder is already 'completed'.
    """
    logger.info("[task=%s] Starting bidder evaluation: bidder_id=%s", self.request.id, bidder_id)

    db = SessionLocal()
    try:
        bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
        if not bidder:
            logger.warning("Bidder %s not found — skipping", bidder_id)
            return {"skipped": "bidder_not_found"}

        if bidder.status == "completed":
            logger.info("Bidder %s already completed — skipping", bidder_id)
            return {"skipped": "already_completed"}

        tender = db.query(Tender).filter(Tender.id == bidder.tender_id).first()
        if not tender:
            return {"skipped": "tender_not_found"}

        # ── Step 1: Mark as processing ──
        old_status = bidder.status
        bidder.status = "processing"
        _event(db, "bidder", bidder.id, "processing_started", actor="worker",
               old_value={"status": old_status}, new_value={"status": "processing"})
        db.commit()

        # ── Step 2: Get criteria ──
        criteria = db.query(Criterion).filter(Criterion.tender_id == tender.id).all()
        if not criteria:
            logger.warning("Tender %s has no criteria yet — bidder %s will be re-queued", tender.id, bidder_id)
            # Retry after delay to wait for tender processing to complete
            raise self.retry(countdown=30, exc=RuntimeError("Tender criteria not yet available"))

        criteria_list = [{"id": c.id, "text": c.text, "type": c.type, "weight": c.weight} for c in criteria]

        # ── Step 3: Ingest bidder files ──
        bidder_chunks = []
        db.query(Document).filter(Document.bidder_id == bidder.id).delete()

        if not os.path.isdir(bidder.folder_path):
            raise FileNotFoundError(f"Bidder folder not found: {bidder.folder_path}")

        for filename in sorted(os.listdir(bidder.folder_path)):
            file_path = os.path.join(bidder.folder_path, filename)
            if not os.path.isfile(file_path):
                continue
            try:
                chunks = processor.auto_process(file_path)
                for chunk in chunks:
                    bidder_chunks.append(chunk)
                    db.add(Document(
                        tender_id=tender.id,
                        bidder_id=bidder.id,
                        text=chunk.get("text", ""),
                        page=chunk.get("page", 1),
                        file_name=chunk.get("source_file", filename),
                        source_type=chunk.get("type", "unknown"),
                        language=chunk.get("language", "unknown"),
                    ))
            except Exception as file_err:
                logger.warning("Skipping file %s for bidder %s: %s", filename, bidder_id, file_err)
                continue  # Don't fail the entire bidder for one bad file

        db.commit()
        logger.info("Ingested %d chunks from %d files for bidder %s", len(bidder_chunks), len(os.listdir(bidder.folder_path)), bidder_id)

        # ── Step 4: AI evaluation ──
        eval_results = _run_async(workflow.evaluate_bidder_chunks(bidder_chunks, criteria_list))

        # ── Step 5: Store verdicts ──
        db.query(Verdict).filter(Verdict.bidder_id == bidder.id).delete()

        for res in eval_results:
            eval_data = res["evaluation"]
            db.add(Verdict(
                bidder_id=bidder.id,
                criterion_id=res["criterion_id"],
                status=eval_data.get("status", "review_needed"),
                confidence=eval_data.get("confidence", 0.0),
                reasoning=eval_data.get("reasoning", "No reasoning provided"),
                evidence_citation={
                    "excerpt": eval_data.get("excerpt"),
                    "page": eval_data.get("page"),
                    "source_doc": eval_data.get("source_doc"),
                },
            ))

        bidder.status = "completed"
        _event(db, "bidder", bidder.id, "ai_completed", actor="worker",
               old_value={"status": "processing"},
               new_value={"status": "completed", "verdicts": len(eval_results)})
        db.commit()

        logger.info("[task=%s] Bidder %s evaluation complete: %d verdicts", self.request.id, bidder_id, len(eval_results))
        return {"bidder_id": bidder_id, "verdicts": len(eval_results)}

    except SoftTimeLimitExceeded:
        db.rollback()
        logger.error("[task=%s] Bidder %s hit time limit", self.request.id, bidder_id)
        _mark_entity_failed(db, Bidder, bidder_id, "Task exceeded 5-minute time limit")
        return {"error": "timeout", "bidder_id": bidder_id}

    except Exception as exc:
        db.rollback()
        logger.exception("[task=%s] Bidder %s evaluation failed: %s", self.request.id, bidder_id, exc)
        _mark_entity_failed(db, Bidder, bidder_id, str(exc))
        raise self.retry(exc=exc)

    finally:
        db.close()
