import google.generativeai as genai
import os
import json
import re
import time
import logging

logger = logging.getLogger(__name__)

MAX_CHUNK_CHARS = 25_000   # Safe Gemini input size
OVERLAP_CHARS = 500        # Overlap between windows to avoid cutting criteria mid-sentence


class CriterionExtractor:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — criteria extraction will fail")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def extract_criteria(self, tender_text: str) -> list:
        """
        Extracts eligibility/evaluation criteria from tender text.
        Uses sliding-window chunking for long documents.
        Deduplicates across windows by criterion text prefix.
        """
        if not tender_text.strip():
            logger.warning("Empty tender text — returning no criteria")
            return []

        if len(tender_text) <= MAX_CHUNK_CHARS:
            return self._extract_single(tender_text)

        logger.info(
            "Tender text is long (%d chars) — using %d-char sliding windows",
            len(tender_text), MAX_CHUNK_CHARS
        )

        all_criteria = []
        seen_keys = set()
        start = 0

        while start < len(tender_text):
            window = tender_text[start: start + MAX_CHUNK_CHARS]
            batch = self._extract_single(window)
            for c in batch:
                # Deduplicate by first 80 chars of criterion text
                key = c.get("text", "")[:80].strip().lower()
                if key and key not in seen_keys:
                    seen_keys.add(key)
                    all_criteria.append(c)
            start += MAX_CHUNK_CHARS - OVERLAP_CHARS

        logger.info("Extracted %d unique criteria from long tender", len(all_criteria))
        return all_criteria

    def _extract_single(self, text: str) -> list:
        """Calls Gemini with exponential backoff retry."""
        prompt = self._build_prompt(text)
        for attempt in range(3):
            try:
                response = self.model.generate_content(prompt)
                return self._parse_json_array(response.text)
            except json.JSONDecodeError as je:
                logger.warning(
                    "Gemini returned unparseable JSON (attempt %d): %s", attempt + 1, je
                )
            except Exception as e:
                wait = 2 ** attempt
                logger.warning(
                    "Gemini attempt %d failed: %s. Retrying in %ds", attempt + 1, e, wait
                )
                time.sleep(wait)

        logger.error("All Gemini attempts failed for criteria extraction — returning []")
        return []

    def _build_prompt(self, text: str) -> str:
        return f"""You are an expert procurement officer. Extract all eligibility and evaluation criteria from the following government tender document.

Rules:
1. Identify if a criterion is 'mandatory' (Pass/Fail) or 'optional' (scored/weighted).
2. Assign a weight if mentioned (e.g. "30 marks"), otherwise default to 1.0.
3. Provide a clear, concise text description for each criterion.
4. Do NOT invent criteria that are not explicitly stated.

Output MUST be a valid JSON array of objects with these keys:
- text: string (the criterion description)
- type: string ("mandatory" or "optional")
- weight: float

Tender Document Text:
---
{text}
---

Respond ONLY with the JSON array. No markdown, no explanation."""

    def _parse_json_array(self, content: str) -> list:
        """
        Robust JSON array extraction.
        Handles: raw JSON, ```json fences, extra explanation text.
        """
        # Strip markdown code fences
        content = re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("`")

        start = content.find("[")
        end = content.rfind("]") + 1

        if start == -1 or end == 0:
            raise ValueError(f"No JSON array found in response: {content[:200]}")

        json_str = content[start:end]
        parsed = json.loads(json_str)

        if not isinstance(parsed, list):
            raise ValueError(f"Expected JSON array, got: {type(parsed)}")

        # Ensure required keys exist with defaults
        clean = []
        for item in parsed:
            if not item.get("text"):
                continue
            clean.append({
                "text": str(item.get("text", "")).strip(),
                "type": item.get("type", "mandatory") if item.get("type") in ("mandatory", "optional") else "mandatory",
                "weight": float(item.get("weight", 1.0)),
            })
        return clean


extractor = CriterionExtractor()
