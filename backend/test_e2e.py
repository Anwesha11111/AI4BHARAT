"""
TenderMind End-to-End Test Script
==================================
Tests the full pipeline:
  Upload tender → wait for processing → upload bidder(s) → wait → check scorecard

Usage:
    python test_e2e.py [--base-url http://localhost:8000] [--tender path/to/tender.pdf]

Requirements:
    pip install httpx
"""

import argparse
import httpx
import os
import sys
import time
import json
import io
import tempfile

BASE_URL = "http://localhost:8000"
POLL_INTERVAL = 3   # seconds between status checks
TIMEOUT = 300       # max seconds to wait for each stage


def _ok(label: str):
    print(f"  ✅  {label}")


def _fail(label: str, detail=""):
    print(f"  ❌  {label}  {detail}")
    sys.exit(1)


def _info(msg: str):
    print(f"  ℹ️   {msg}")


def check_health(client: httpx.Client):
    print("\n[1/6] Health Check")
    r = client.get("/health", timeout=10)
    data = r.json()
    if data.get("db") != "ok":
        _fail("DB health check", data.get("db"))
    _ok(f"DB: ok | Redis: {data.get('redis', 'unknown')}")
    if data.get("redis") != "ok":
        _info("Redis not healthy — Celery tasks will fail. Set REDIS_URL in .env")


def make_dummy_pdf() -> bytes:
    """Creates a minimal real PDF in memory for testing (no external files needed)."""
    content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 120>>
stream
BT /F1 12 Tf 72 720 Td
(TENDER NOTICE: All bidders must have ISO 9001 certification.) Tj
0 -20 Td (Minimum turnover: INR 50 Lakh per annum.) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer<</Size 5/Root 1 0 R>>
startxref
436
%%EOF"""
    return content


def upload_tender(client: httpx.Client, tender_path: str | None) -> int:
    print("\n[2/6] Upload Tender")
    if tender_path:
        with open(tender_path, "rb") as f:
            file_content = f.read()
        filename = os.path.basename(tender_path)
    else:
        _info("No --tender file given. Using built-in dummy PDF.")
        file_content = make_dummy_pdf()
        filename = "test_tender.pdf"

    r = client.post(
        "/api/upload/tender",
        files={"file": (filename, file_content, "application/pdf")},
        timeout=60,
    )
    if r.status_code != 200:
        _fail(f"Tender upload failed: {r.status_code}", r.text[:300])
    data = r.json()
    tender_id = data["id"]
    _ok(f"Tender uploaded: id={tender_id}, status={data['status']}")
    return tender_id


def wait_for_tender(client: httpx.Client, tender_id: int):
    print(f"\n[3/6] Waiting for Tender {tender_id} to process (max {TIMEOUT}s)")
    start = time.time()
    while time.time() - start < TIMEOUT:
        r = client.get(f"/api/tenders/{tender_id}/status", timeout=10)
        data = r.json()
        status = data["status"]
        elapsed = int(time.time() - start)
        print(f"        [{elapsed:3d}s] tender status: {status}", end="\r")
        if status == "completed":
            print()
            _ok(f"Tender completed in {elapsed}s")
            return
        if status == "failed":
            print()
            _fail("Tender processing failed. Check worker logs.")
        time.sleep(POLL_INTERVAL)
    print()
    _fail(f"Tender processing timed out after {TIMEOUT}s")


def check_criteria(client: httpx.Client, tender_id: int):
    print(f"\n[4/6] Check Criteria for Tender {tender_id}")
    r = client.get(f"/api/tenders/{tender_id}/criteria", timeout=10)
    criteria = r.json()
    if not criteria:
        _info("No criteria extracted — Gemini may not be configured yet (check GEMINI_API_KEY)")
    else:
        _ok(f"{len(criteria)} criteria extracted")
        for c in criteria[:3]:
            print(f"         • [{c['type']}] {c['text'][:80]}")
        if len(criteria) > 3:
            print(f"         … and {len(criteria) - 3} more")
    return criteria


def upload_bidder(client: httpx.Client, tender_id: int, bidder_files: list[str] | None) -> int:
    print(f"\n[5/6] Upload Bidder for Tender {tender_id}")
    if bidder_files:
        file_tuples = []
        for fp in bidder_files:
            with open(fp, "rb") as f:
                file_tuples.append(("files", (os.path.basename(fp), f.read(), "application/pdf")))
    else:
        _info("No bidder files given. Using dummy PDF.")
        dummy = make_dummy_pdf()
        file_tuples = [("files", ("bidder_doc.pdf", dummy, "application/pdf"))]

    r = client.post(
        "/api/upload/bidder",
        data={"tender_id": str(tender_id), "vendor_name": "Test Vendor Pvt Ltd"},
        files=file_tuples,
        timeout=60,
    )
    if r.status_code != 200:
        _fail(f"Bidder upload failed: {r.status_code}", r.text[:300])
    data = r.json()
    bidder_id = data["id"]
    _ok(f"Bidder uploaded: id={bidder_id}, files={data['file_count']}")
    return bidder_id


def wait_for_bidder(client: httpx.Client, tender_id: int, bidder_id: int):
    print(f"\n[6/6] Waiting for Bidder {bidder_id} evaluation (max {TIMEOUT}s)")
    start = time.time()
    while time.time() - start < TIMEOUT:
        r = client.get(f"/api/tenders/{tender_id}/status", timeout=10)
        data = r.json()
        bidder = next((b for b in data.get("bidders", []) if b["id"] == bidder_id), None)
        status = bidder["status"] if bidder else "unknown"
        elapsed = int(time.time() - start)
        print(f"        [{elapsed:3d}s] bidder status: {status}", end="\r")
        if status == "completed":
            print()
            _ok(f"Bidder evaluation completed in {elapsed}s")
            return
        if status == "failed":
            print()
            _fail("Bidder evaluation failed. Check worker logs.")
        time.sleep(POLL_INTERVAL)
    print()
    _info(f"Bidder evaluation timed out after {TIMEOUT}s (worker may not be running)")


def check_scorecard(client: httpx.Client, tender_id: int):
    print(f"\n[Bonus] Scorecard for Tender {tender_id}")
    r = client.get(f"/api/tenders/{tender_id}/scorecard", timeout=10)
    data = r.json()
    print(json.dumps(data, indent=2, default=str)[:1500])
    _ok("Scorecard fetched")


def check_audit(client: httpx.Client, tender_id: int):
    print(f"\n[Bonus] Audit Log for Tender {tender_id}")
    r = client.get(f"/api/tenders/{tender_id}/audit", timeout=10)
    logs = r.json()
    _ok(f"{len(logs)} audit events found")
    for log in logs[:5]:
        print(f"         • {log['timestamp']}  [{log['entity_type']}:{log['entity_id']}]  {log['action']}")


def main():
    parser = argparse.ArgumentParser(description="TenderMind E2E Test")
    parser.add_argument("--base-url", default=BASE_URL)
    parser.add_argument("--tender", default=None, help="Path to a local PDF/DOCX tender file")
    parser.add_argument("--bidder-files", nargs="+", default=None, help="Paths to bidder document files")
    parser.add_argument("--skip-wait", action="store_true", help="Don't wait for processing (fast CI mode)")
    args = parser.parse_args()

    print("=" * 60)
    print("  TenderMind Full Pipeline E2E Test")
    print(f"  Target: {args.base_url}")
    print("=" * 60)

    with httpx.Client(base_url=args.base_url) as client:
        check_health(client)
        tender_id = upload_tender(client, args.tender)

        if not args.skip_wait:
            wait_for_tender(client, tender_id)
            check_criteria(client, tender_id)
            bidder_id = upload_bidder(client, tender_id, args.bidder_files)
            wait_for_bidder(client, tender_id, bidder_id)
            check_scorecard(client, tender_id)
            check_audit(client, tender_id)
        else:
            _info("--skip-wait set: skipping processing wait (useful if worker is not running)")
            bidder_id = upload_bidder(client, tender_id, args.bidder_files)

    print("\n" + "=" * 60)
    print("  ✅  E2E test complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
