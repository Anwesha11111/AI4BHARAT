"""
Seed script to populate database with synthetic data for demo.
Run: python seed_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.database import SessionLocal, init_db
from db.models import User, Tender, Bidder, Vendor, Criterion, Verdict
from api.auth import get_password_hash
import json
from datetime import datetime, timedelta
import random

def seed_database():
    init_db()
    db = SessionLocal()

    try:
        # Clear existing data
        db.query(Verdict).delete()
        db.query(Criterion).delete()
        db.query(Bidder).delete()
        db.query(Tender).delete()
        db.query(Vendor).delete()
        db.query(User).delete()
        db.commit()
        print("Cleared existing data")

        # Create Admin Users
        admins = [
            {"email": "admin@gov.in", "full_name": "Rajesh Kumar", "role": "admin"},
            {"email": "admin@test.com", "full_name": "Test Admin", "role": "admin"},
        ]

        admin_users = []
        for admin in admins:
            user = User(
                email=admin["email"],
                hashed_password=get_password_hash("test123"),
                full_name=admin["full_name"],
                role="admin",
                is_active=True
            )
            db.add(user)
            admin_users.append(user)
        db.commit()
        print(f"Created {len(admins)} admin users")

        # Create Company Users
        companies = [
            {"email": "contact@tataprojects.com", "company_name": "Tata Projects Ltd", "full_name": "Amit Sharma"},
            {"email": "info@aboroadsdelhi.com", "company_name": "A.B.O. Roads Delhi", "full_name": "Priya Patel"},
            {"email": "tender@lntinfra.com", "company_name": "L&T Infrastructure", "full_name": "Vikram Singh"},
            {"email": "bids@aboroadsdelhi.com", "company_name": "GMR Highways", "full_name": "Neha Gupta"},
            {"email": "company@test.com", "company_name": "Test Company", "full_name": "Test User"},
        ]

        company_users = []
        for company in companies:
            user = User(
                email=company["email"],
                hashed_password=get_password_hash("test123"),
                full_name=company["full_name"],
                company_name=company["company_name"],
                role="company",
                is_active=True
            )
            db.add(user)
            company_users.append(user)
        db.commit()
        print(f"Created {len(companies)} company users")

        # Create Vendors (bidders)
        vendors_data = [
            "Tata Projects Ltd",
            "L&T Infrastructure",
            "GMR Highways",
            "Reliance Infra",
            "Adani Roads",
            "IRB Infrastructure",
            "Dilip Buildcon",
            "Ashoka Buildcon",
        ]

        vendors = []
        for name in vendors_data:
            vendor = Vendor(name=name, registration_number=f"REG-{random.randint(10000, 99999)}")
            db.add(vendor)
            vendors.append(vendor)
        db.commit()
        print(f"Created {len(vendors)} vendors")

        # Create Tenders
        tenders_data = [
            {
                "title": "National Highway 44 Expansion Project - Phase 2",
                "description": "Construction of 120 km six-lane expressway connecting Hyderabad to Bangalore",
                "submitted_by_idx": 0,  # Tata Projects
                "status": "completed",
                "admin_status": "approved",
                "criteria": [
                    {"text": "Minimum 10 years experience in highway construction", "type": "mandatory", "weight": 1.0},
                    {"text": "Annual turnover of at least Rs. 500 crore", "type": "mandatory", "weight": 1.0},
                    {"text": "ISO 9001:2015 certification", "type": "mandatory", "weight": 0.8},
                    {"text": "Previous experience with NHAI projects", "type": "optional", "weight": 0.6},
                    {"text": "Own equipment fleet worth Rs. 100 crore", "type": "optional", "weight": 0.5},
                ]
            },
            {
                "title": "Delhi Metro Phase 4 - Line 10 Construction",
                "description": "Underground metro construction from Janakpuri to R.K. Ashram with 8 stations",
                "submitted_by_idx": 1,  # A.B.O. Roads Delhi
                "status": "completed",
                "admin_status": "approved",
                "criteria": [
                    {"text": "Experience in underground tunnel construction", "type": "mandatory", "weight": 1.0},
                    {"text": "Minimum 5 completed metro projects", "type": "mandatory", "weight": 0.9},
                    {"text": "Safety certification from RDSO", "type": "mandatory", "weight": 0.8},
                    {"text": "Local workforce employment commitment", "type": "optional", "weight": 0.4},
                ]
            },
            {
                "title": "Smart City Infrastructure - Pune Municipal Corporation",
                "description": "Implementation of smart traffic management, LED street lighting, and IoT sensors",
                "submitted_by_idx": 2,  # L&T Infrastructure
                "status": "completed",
                "admin_status": "approved",
                "criteria": [
                    {"text": "Experience in smart city projects", "type": "mandatory", "weight": 1.0},
                    {"text": "IoT and sensor technology expertise", "type": "mandatory", "weight": 0.9},
                    {"text": "24x7 monitoring capability", "type": "optional", "weight": 0.7},
                    {"text": "Green technology certification", "type": "optional", "weight": 0.5},
                ]
            },
            {
                "title": "Rural Road Development - Pradhan Mantri Gram Sadak Yojana",
                "description": "Construction of 500 km rural roads in Madhya Pradesh under PMGSY",
                "submitted_by_idx": 3,  # GMR Highways
                "status": "completed",
                "admin_status": "pending",
                "criteria": [
                    {"text": "Experience in rural road construction", "type": "mandatory", "weight": 1.0},
                    {"text": "Registered with state PWD", "type": "mandatory", "weight": 0.8},
                    {"text": "Environmental clearance capability", "type": "optional", "weight": 0.6},
                ]
            },
        ]

        created_tenders = []
        for t_data in tenders_data:
            tender = Tender(
                title=t_data["title"],
                description=t_data["description"],
                status=t_data["status"],
                admin_status=t_data["admin_status"],
                submitted_by=company_users[t_data["submitted_by_idx"]].id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(5, 30))
            )
            db.add(tender)
            db.commit()
            db.refresh(tender)

            # Add criteria
            for c_data in t_data["criteria"]:
                criterion = Criterion(
                    tender_id=tender.id,
                    text=c_data["text"],
                    type=c_data["type"],
                    weight=c_data["weight"]
                )
                db.add(criterion)
            db.commit()

            created_tenders.append(tender)

        print(f"Created {len(created_tenders)} tenders with criteria")

        # Create Bidders and Verdicts for approved tenders
        for tender in created_tenders:
            if tender.admin_status != "approved":
                continue

            # Get criteria for this tender
            criteria = db.query(Criterion).filter(Criterion.tender_id == tender.id).all()

            # Add 3-4 bidders for each approved tender
            num_bidders = random.randint(3, 4)
            selected_vendors = random.sample(vendors, num_bidders)

            bidder_scores = []

            for vendor in selected_vendors:
                bidder = Bidder(
                    tender_id=tender.id,
                    vendor_id=vendor.id,
                    status="completed",
                    submission_date=datetime.utcnow() - timedelta(days=random.randint(1, 10))
                )
                db.add(bidder)
                db.commit()
                db.refresh(bidder)

                # Create verdicts for each criterion
                total_score = 0
                for criterion in criteria:
                    # Randomize verdict with weighted probability
                    rand = random.random()
                    if criterion.type == "mandatory":
                        if rand > 0.15:  # 85% pass rate for mandatory
                            status = "pass"
                            confidence = random.uniform(0.75, 0.95)
                        else:
                            status = "fail"
                            confidence = random.uniform(0.7, 0.9)
                    else:
                        if rand > 0.3:  # 70% pass rate for optional
                            status = "pass"
                            confidence = random.uniform(0.65, 0.9)
                        else:
                            status = "review_needed" if rand > 0.15 else "fail"
                            confidence = random.uniform(0.5, 0.75)

                    verdict = Verdict(
                        bidder_id=bidder.id,
                        criterion_id=criterion.id,
                        status=status,
                        confidence=confidence,
                        reasoning=f"AI analysis: {'Meets' if status == 'pass' else 'Does not meet'} the requirement based on submitted documents.",
                        evidence_citation={"page": random.randint(1, 20), "excerpt": "Evidence found in submitted documentation."},
                        is_human_reviewed=random.choice([True, False])
                    )
                    db.add(verdict)

                    if status == "pass":
                        total_score += criterion.weight * confidence

                bidder_scores.append({
                    "bidder_id": bidder.id,
                    "vendor_name": vendor.name,
                    "score": total_score
                })

            db.commit()

            # Generate AI recommendation for the tender
            bidder_scores.sort(key=lambda x: x["score"], reverse=True)
            winner = bidder_scores[0]

            ai_recommendation = {
                "recommendation": {
                    "winner_id": winner["bidder_id"],
                    "winner_name": winner["vendor_name"],
                    "winner_score": round(winner["score"], 2),
                    "confidence": round(random.uniform(0.78, 0.95), 2),
                    "reasoning": f"{winner['vendor_name']} has the highest compliance score and meets all mandatory criteria. Recommended for contract award."
                },
                "rankings": [
                    {
                        "bidder_id": b["bidder_id"],
                        "bidder_name": b["vendor_name"],
                        "total_score": round(b["score"], 2),
                        "avg_confidence": round(random.uniform(0.7, 0.9), 2),
                        "mandatory_pass": True,
                        "disqualified": False
                    }
                    for b in bidder_scores
                ],
                "qualified_count": len(bidder_scores),
                "total_bidders": len(bidder_scores)
            }

            tender.ai_recommendation = ai_recommendation
            db.commit()

            print(f"  Tender '{tender.title[:50]}...' - Winner: {winner['vendor_name']}")

        print("\n" + "="*50)
        print("SEED DATA CREATED SUCCESSFULLY!")
        print("="*50)
        print("\nLogin Credentials:")
        print("-"*30)
        print("ADMIN:")
        print("  Email: admin@gov.in")
        print("  Password: test123")
        print("\nCOMPANY:")
        print("  Email: contact@tataprojects.com")
        print("  Password: test123")
        print("-"*30)

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
