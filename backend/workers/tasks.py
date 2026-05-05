from celery import Celery
import os
from ai.workflow import workflow
from db.database import SessionLocal
from db.models import Tender, Criterion, Bidder, Verdict, AuditLog
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "tasks",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://redis:6379/0")
)

@celery_app.task
def process_tender_async(tender_id, file_path):
    db = SessionLocal()
    try:
        tender = db.query(Tender).filter(Tender.id == tender_id).first()
        if not tender:
            return
        
        # 1. Run extraction
        import asyncio
        loop = asyncio.get_event_loop()
        criteria_data, full_text = loop.run_until_complete(workflow.process_tender(file_path))
        
        # 2. Save criteria
        tender.raw_text = full_text
        for c in criteria_data:
            new_criterion = Criterion(
                tender_id=tender.id,
                text=c["text"],
                type=c["type"],
                weight=c["weight"]
            )
            db.add(new_criterion)
        
        # 3. Log action
        db.add(AuditLog(
            entity_type="tender",
            entity_id=tender.id,
            action="criteria_extracted",
            new_value={"count": len(criteria_data)},
            actor="system_ai"
        ))
        
        db.commit()
    except Exception as e:
        logger.error(f"Async tender processing error: {e}")
        db.rollback()
    finally:
        db.close()

@celery_app.task
def evaluate_bidder_async(bidder_id):
    db = SessionLocal()
    try:
        bidder = db.query(Bidder).filter(Bidder.id == bidder_id).first()
        tender = db.query(Tender).filter(Tender.id == bidder.tender_id).first()
        criteria = db.query(Criterion).filter(Criterion.tender_id == tender.id).all()
        
        criteria_list = [{"id": c.id, "text": c.text, "type": c.type} for c in criteria]
        
        import asyncio
        loop = asyncio.get_event_loop()
        eval_results = loop.run_until_complete(workflow.evaluate_bidder(bidder.folder_path, criteria_list))
        
        for res in eval_results:
            eval_data = res["evaluation"]
            new_verdict = Verdict(
                bidder_id=bidder.id,
                criterion_id=res["criterion_id"],
                status=eval_data["status"],
                confidence=eval_data["confidence"],
                reasoning=eval_data["reasoning"],
                evidence_citation={
                    "excerpt": eval_data.get("excerpt"),
                    "page": eval_data.get("page"),
                    "source_doc": eval_data.get("source_doc")
                }
            )
            db.add(new_verdict)
        
        db.commit()
    except Exception as e:
        logger.error(f"Async bidder evaluation error: {e}")
        db.rollback()
    finally:
        db.close()
