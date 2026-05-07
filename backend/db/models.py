from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float, Boolean, JSON, Index
from sqlalchemy.orm import relationship
from db.database import Base
import datetime
from enum import Enum as PyEnum

class CriterionType(PyEnum):
    MANDATORY = "mandatory"
    OPTIONAL = "optional"

class VerdictStatus(PyEnum):
    PASS = "pass"
    FAIL = "fail"
    REVIEW_NEEDED = "review_needed"

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    registration_number = Column(String, unique=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Tender(Base):
    __tablename__ = "tenders"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    file_path = Column(String, unique=True, nullable=True)  # ✅ Prevent duplicate uploads
    raw_text = Column(Text)
    status = Column(String, default="uploaded", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    criteria = relationship("Criterion", back_populates="tender")
    bidders = relationship("Bidder", back_populates="tender")
    documents = relationship("Document", back_populates="tender")
    
    __table_args__ = (
        Index('idx_tender_status', 'status'),
        Index('idx_tender_created', 'created_at'),
    )

class Criterion(Base):
    __tablename__ = "criteria"
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    text = Column(Text)
    type = Column(String)  # mandatory / optional
    weight = Column(Float, default=1.0)
    
    tender = relationship("Tender", back_populates="criteria")
    verdicts = relationship("Verdict", back_populates="criterion")
    
    __table_args__ = (
        Index('idx_criterion_tender_id', 'tender_id'),
    )

class Bidder(Base):
    __tablename__ = "bidders"
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    folder_path = Column(String)
    status = Column(String, default="uploaded", nullable=False)
    submission_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    vendor = relationship("Vendor")
    tender = relationship("Tender", back_populates="bidders")
    verdicts = relationship("Verdict", back_populates="bidder")
    documents = relationship("Document", back_populates="bidder")
    
    __table_args__ = (
        Index('idx_bidder_tender_id', 'tender_id'),
        Index('idx_bidder_status', 'status'),
    )


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"), nullable=False)
    bidder_id = Column(Integer, ForeignKey("bidders.id"), nullable=True)
    text = Column(Text, nullable=False)
    page = Column(Integer, nullable=False, default=1)
    file_name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    language = Column(String, default="unknown")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tender = relationship("Tender", back_populates="documents")
    bidder = relationship("Bidder", back_populates="documents")
    
    __table_args__ = (
        Index('idx_document_tender_id', 'tender_id'),
        Index('idx_document_bidder_id', 'bidder_id'),
        Index('idx_document_combined', 'tender_id', 'bidder_id'),
    )

class Verdict(Base):
    __tablename__ = "verdicts"
    id = Column(Integer, primary_key=True, index=True)
    bidder_id = Column(Integer, ForeignKey("bidders.id"))
    criterion_id = Column(Integer, ForeignKey("criteria.id"))
    status = Column(String)  # pass / fail / review_needed
    confidence = Column(Float)
    reasoning = Column(Text)
    evidence_citation = Column(JSON)  # {doc, page, lines, bounding_box}
    is_human_reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    bidder = relationship("Bidder", back_populates="verdicts")
    criterion = relationship("Criterion", back_populates="verdicts")
    
    __table_args__ = (
        Index('idx_verdict_bidder_id', 'bidder_id'),
        Index('idx_verdict_criterion_id', 'criterion_id'),
        Index('idx_verdict_status', 'status'),
    )

class Correction(Base):
    __tablename__ = "corrections"
    id = Column(Integer, primary_key=True, index=True)
    verdict_id = Column(Integer, ForeignKey("verdicts.id"))
    old_status = Column(String)
    new_status = Column(String)
    reviewer_id = Column(String)
    reason = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String)  # 'verdict', 'tender', etc.
    entity_id = Column(Integer)
    action = Column(String)
    old_value = Column(JSON)
    new_value = Column(JSON)
    actor = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    reason = Column(Text)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="reviewer")  # admin, reviewer, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
