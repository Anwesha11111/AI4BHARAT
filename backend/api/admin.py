"""
Admin API Routes for Tender Management
======================================
Provides endpoints for admin users to:
- View all submitted tenders from companies
- Approve or reject tenders
- View AI recommendations
- Assign tenders to winning bidders
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from db.database import get_db
from db.models import Tender, Bidder, User, Criterion, Verdict, AuditLog
from api.auth import get_current_user, require_role

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix="/admin", tags=["Admin"])


class TenderSummary(BaseModel):
    id: int
    title: str
    status: str
    admin_status: str
    submitted_by_company: Optional[str]
    submitted_by_email: Optional[str]
    created_at: Optional[str]
    bidder_count: int
    criteria_count: int
    has_recommendation: bool
    ai_winner_name: Optional[str]
    ai_winner_score: Optional[float]
    ai_confidence: Optional[float]

    class Config:
        from_attributes = True


class BidderSummary(BaseModel):
    id: int
    vendor_name: str
    status: str
    submission_date: Optional[str]
    verdict_count: int
    pass_count: int
    fail_count: int
    compliance_score: float


class TenderDetail(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    admin_status: str
    admin_notes: Optional[str]
    submitted_by_company: Optional[str]
    created_at: Optional[str]
    criteria: List[dict]
    bidders: List[BidderSummary]
    ai_recommendation: Optional[dict]


class AdminReviewRequest(BaseModel):
    action: str  # "approve" or "reject"
    notes: Optional[str] = None


class AssignTenderRequest(BaseModel):
    bidder_id: int
    notes: Optional[str] = None


@admin_router.get("/tenders", response_model=List[TenderSummary])
async def get_all_tenders(
    status_filter: Optional[str] = None,
    admin_status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get all tenders submitted by companies (admin only)."""
    query = db.query(Tender).options(
        joinedload(Tender.submitted_by_user),
        joinedload(Tender.bidders),
        joinedload(Tender.criteria)
    )

    if status_filter:
        query = query.filter(Tender.status == status_filter)
    if admin_status_filter:
        query = query.filter(Tender.admin_status == admin_status_filter)

    tenders = query.order_by(Tender.created_at.desc()).all()

    result = []
    for tender in tenders:
        # Extract AI recommendation details
        ai_rec = tender.ai_recommendation
        ai_winner_name = None
        ai_winner_score = None
        ai_confidence = None
        if ai_rec and isinstance(ai_rec, dict):
            rec = ai_rec.get("recommendation", {})
            ai_winner_name = rec.get("winner_name")
            ai_winner_score = rec.get("winner_score")
            ai_confidence = rec.get("confidence")

        result.append(TenderSummary(
            id=tender.id,
            title=tender.title or f"Tender #{tender.id}",
            status=tender.status,
            admin_status=tender.admin_status or "pending",
            submitted_by_company=tender.submitted_by_user.company_name if tender.submitted_by_user else None,
            submitted_by_email=tender.submitted_by_user.email if tender.submitted_by_user else None,
            created_at=tender.created_at.isoformat() if tender.created_at else None,
            bidder_count=len(tender.bidders),
            criteria_count=len(tender.criteria),
            has_recommendation=tender.ai_recommendation is not None,
            ai_winner_name=ai_winner_name,
            ai_winner_score=ai_winner_score,
            ai_confidence=ai_confidence
        ))

    return result


@admin_router.get("/tenders/{tender_id}", response_model=TenderDetail)
async def get_tender_detail(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get detailed tender information including bidders and AI recommendation."""
    tender = db.query(Tender).options(
        joinedload(Tender.submitted_by_user),
        joinedload(Tender.bidders),
        joinedload(Tender.criteria)
    ).filter(Tender.id == tender_id).first()

    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Get bidder summaries with verdict stats
    bidder_summaries = []
    for bidder in tender.bidders:
        verdicts = db.query(Verdict).filter(Verdict.bidder_id == bidder.id).all()
        pass_count = sum(1 for v in verdicts if v.status == "pass")
        fail_count = sum(1 for v in verdicts if v.status == "fail")
        total = len(verdicts) or 1
        compliance_score = (pass_count / total) * 100

        bidder_summaries.append(BidderSummary(
            id=bidder.id,
            vendor_name=bidder.vendor.name if bidder.vendor else f"Bidder #{bidder.id}",
            status=bidder.status,
            submission_date=bidder.submission_date.isoformat() if bidder.submission_date else None,
            verdict_count=len(verdicts),
            pass_count=pass_count,
            fail_count=fail_count,
            compliance_score=compliance_score
        ))

    # Sort bidders by compliance score
    bidder_summaries.sort(key=lambda x: x.compliance_score, reverse=True)

    return TenderDetail(
        id=tender.id,
        title=tender.title or f"Tender #{tender.id}",
        description=tender.description,
        status=tender.status,
        admin_status=tender.admin_status or "pending",
        admin_notes=tender.admin_notes,
        submitted_by_company=tender.submitted_by_user.company_name if tender.submitted_by_user else None,
        created_at=tender.created_at.isoformat() if tender.created_at else None,
        criteria=[{"id": c.id, "text": c.text, "type": c.type, "weight": c.weight} for c in tender.criteria],
        bidders=bidder_summaries,
        ai_recommendation=tender.ai_recommendation
    )


@admin_router.post("/tenders/{tender_id}/review")
async def review_tender(
    tender_id: int,
    review: AdminReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Approve or reject a tender (admin only)."""
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    if review.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    old_status = tender.admin_status
    tender.admin_status = "approved" if review.action == "approve" else "rejected"
    tender.admin_reviewed_by = current_user.id
    tender.admin_review_date = datetime.utcnow()
    tender.admin_notes = review.notes

    # Log the action
    audit_log = AuditLog(
        entity_type="tender",
        entity_id=tender_id,
        action=f"admin_{review.action}",
        old_value={"admin_status": old_status},
        new_value={"admin_status": tender.admin_status, "notes": review.notes},
        actor=current_user.email,
        reason=review.notes
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": f"Tender {review.action}d successfully",
        "tender_id": tender_id,
        "new_status": tender.admin_status
    }


@admin_router.post("/tenders/{tender_id}/assign")
async def assign_tender(
    tender_id: int,
    assignment: AssignTenderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Assign tender to a winning bidder (admin only)."""
    tender = db.query(Tender).filter(Tender.id == tender_id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bidder = db.query(Bidder).filter(
        Bidder.id == assignment.bidder_id,
        Bidder.tender_id == tender_id
    ).first()
    if not bidder:
        raise HTTPException(status_code=404, detail="Bidder not found for this tender")

    tender.recommended_bidder_id = assignment.bidder_id
    tender.admin_status = "assigned"
    tender.admin_notes = assignment.notes or f"Assigned to {bidder.vendor.name if bidder.vendor else 'bidder'}"

    # Log the assignment
    audit_log = AuditLog(
        entity_type="tender",
        entity_id=tender_id,
        action="tender_assigned",
        old_value=None,
        new_value={"assigned_bidder_id": assignment.bidder_id},
        actor=current_user.email,
        reason=assignment.notes
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Tender assigned successfully",
        "tender_id": tender_id,
        "assigned_bidder_id": assignment.bidder_id
    }


@admin_router.post("/tenders/{tender_id}/run-ai-recommendation")
async def run_ai_recommendation(
    tender_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Run AI multi-agent system to get winner recommendation."""
    try:
        from ai.agents import orchestrator
    except ImportError as e:
        logger.error(f"Failed to import AI agents: {e}")
        raise HTTPException(
            status_code=500,
            detail="AI system not available. Please ensure all dependencies are installed."
        )

    tender = db.query(Tender).options(
        joinedload(Tender.criteria),
        joinedload(Tender.bidders)
    ).filter(Tender.id == tender_id).first()

    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    if not tender.criteria:
        raise HTTPException(status_code=400, detail="No criteria found for this tender")

    if not tender.bidders:
        raise HTTPException(status_code=400, detail="No bidders found for this tender")

    # Prepare data for AI system
    criteria_list = [{"id": c.id, "text": c.text, "type": c.type, "weight": c.weight} for c in tender.criteria]

    bidders_data = []
    for bidder in tender.bidders:
        verdicts = db.query(Verdict).filter(Verdict.bidder_id == bidder.id).all()
        bidders_data.append({
            "id": bidder.id,
            "vendor_name": bidder.vendor.name if bidder.vendor else f"Bidder #{bidder.id}",
            "verdicts": [
                {
                    "criterion_id": v.criterion_id,
                    "status": v.status,
                    "confidence": v.confidence,
                    "reasoning": v.reasoning
                }
                for v in verdicts
            ]
        })

    # Run AI recommendation
    try:
        recommendation = orchestrator.recommend_winner(criteria_list, bidders_data)
        tender.ai_recommendation = recommendation
        db.commit()

        return {
            "message": "AI recommendation generated",
            "recommendation": recommendation
        }
    except Exception as e:
        logger.error(f"AI recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI recommendation failed: {str(e)}")


@admin_router.get("/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get dashboard statistics for admin."""
    total_tenders = db.query(Tender).count()
    pending_tenders = db.query(Tender).filter(Tender.admin_status == "pending").count()
    approved_tenders = db.query(Tender).filter(Tender.admin_status == "approved").count()
    rejected_tenders = db.query(Tender).filter(Tender.admin_status == "rejected").count()
    assigned_tenders = db.query(Tender).filter(Tender.admin_status == "assigned").count()

    total_companies = db.query(User).filter(User.role == "company").count()
    total_bidders = db.query(Bidder).count()

    return {
        "total_tenders": total_tenders,
        "pending_review": pending_tenders,
        "approved": approved_tenders,
        "rejected": rejected_tenders,
        "assigned": assigned_tenders,
        "total_companies": total_companies,
        "total_bidders": total_bidders
    }


@admin_router.get("/companies")
async def get_all_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Get all registered companies."""
    companies = db.query(User).filter(User.role == "company").all()

    return [
        {
            "id": c.id,
            "email": c.email,
            "company_name": c.company_name,
            "full_name": c.full_name,
            "is_active": c.is_active,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "tender_count": db.query(Tender).filter(Tender.submitted_by == c.id).count()
        }
        for c in companies
    ]
