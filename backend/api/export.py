from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.database import get_db
from db.models import Tender, Bidder, Criterion, Verdict
import json

export_router = APIRouter()

@export_router.get("/tenders/{id}/export")
async def export_report(id: int, db: Session = Depends(get_db)):
    tender = db.query(Tender).filter(Tender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
        
    bidders = db.query(Bidder).filter(Bidder.tender_id == id).all()
    criteria = db.query(Criterion).filter(Criterion.tender_id == id).all()
    
    report = {
        "tender_title": tender.title,
        "evaluation_date": tender.created_at.isoformat(),
        "total_criteria": len(criteria),
        "results": []
    }
    
    for bidder in bidders:
        bidder_res = {
            "vendor": bidder.vendor.name,
            "verdicts": []
        }
        verdicts = db.query(Verdict).filter(Verdict.bidder_id == bidder.id).all()
        for v in verdicts:
            bidder_res["verdicts"].append({
                "criterion": v.criterion.text,
                "status": v.status,
                "confidence": v.confidence,
                "reasoning": v.reasoning
            })
        report["results"].append(bidder_res)
        
    # Return as JSON for now (in a full system this would be a PDF)
    return report
