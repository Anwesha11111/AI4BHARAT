from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Tender, Bidder, Criterion, Verdict, AuditLog, Vendor
from workers.tasks import process_tender_async, evaluate_bidder_async
import shutil
import os
import uuid

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/tenders/upload")
async def upload_tender(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    new_tender = Tender(title=file.filename, description="Uploaded tender")
    db.add(new_tender)
    db.commit()
    db.refresh(new_tender)
    
    # Trigger background processing
    process_tender_async.delay(new_tender.id, file_path)
    
    return {"id": new_tender.id, "message": "Tender upload successful. Processing started."}

@router.get("/tenders/{id}/criteria")
async def get_criteria(id: int, db: Session = Depends(get_db)):
    criteria = db.query(Criterion).filter(Criterion.tender_id == id).all()
    return criteria

@router.post("/bidders/upload")
async def upload_bidder(tender_id: int, vendor_name: str, folder_path: str, db: Session = Depends(get_db)):
    # In a real app, this would handle folder uploads/zips
    # For prototype, we assume folder_path is accessible to the worker
    
    vendor = db.query(Vendor).filter(Vendor.name == vendor_name).first()
    if not vendor:
        vendor = Vendor(name=vendor_name)
        db.add(vendor)
        db.commit()
        db.refresh(vendor)
    
    new_bidder = Bidder(tender_id=tender_id, vendor_id=vendor.id, folder_path=folder_path)
    db.add(new_bidder)
    db.commit()
    db.refresh(new_bidder)
    
    evaluate_bidder_async.delay(new_bidder.id)
    
    return {"id": new_bidder.id, "message": "Bidder submission accepted. Evaluation started."}

@router.get("/tenders/{id}/scorecard")
async def get_scorecard(id: int, db: Session = Depends(get_db)):
    bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
    criteria = db.query(Criterion).filter(Criterion.tender_id == id).all()
    
    matrix = []
    for bidder in bidders:
        verdicts = db.query(Verdict).filter(Verdict.bidder_id == bidder.id).all()
        matrix.append({
            "bidder_id": bidder.id,
            "vendor_name": bidder.vendor.name,
            "verdicts": verdicts
        })
        
    return {
        "tender_id": id,
        "criteria": criteria,
        "bidders": matrix
    }

@router.patch("/verdicts/{id}/review")
async def review_verdict(id: int, status: str, reason: str, actor: str, db: Session = Depends(get_db)):
    verdict = db.query(Verdict).filter(Verdict.id == id).first()
    if not verdict:
        raise HTTPException(status_code=404, detail="Verdict not found")
    
    old_status = verdict.status
    verdict.status = status
    verdict.is_human_reviewed = True
    
    # Audit Log (Phase 11)
    db.add(AuditLog(
        entity_type="verdict",
        entity_id=id,
        action="human_review",
        old_value={"status": old_status},
        new_value={"status": status},
        actor=actor,
        reason=reason
    ))
    
    db.commit()
    return {"message": "Verdict updated successfully"}
