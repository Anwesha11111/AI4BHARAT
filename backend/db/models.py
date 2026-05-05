from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, DateTime, Float, Boolean, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime
import os
from enum import Enum as PyEnum

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/tendermind")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

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
    raw_text = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    criteria = relationship("Criterion", back_populates="tender")

class Criterion(Base):
    __tablename__ = "criteria"
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    text = Column(Text)
    type = Column(String)  # mandatory / optional
    weight = Column(Float, default=1.0)
    
    tender = relationship("Tender", back_populates="criteria")
    verdicts = relationship("Verdict", back_populates="criterion")

class Bidder(Base):
    __tablename__ = "bidders"
    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    folder_path = Column(String)
    submission_date = Column(DateTime, default=datetime.datetime.utcnow)
    
    vendor = relationship("Vendor")
    verdicts = relationship("Verdict", back_populates="bidder")

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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
