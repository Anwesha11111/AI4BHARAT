"""
Criterion Extractor using LangChain + Gemini API
✅ Uses LangChain chains for structured output
✅ Automatic retry with exponential backoff
✅ Sliding-window chunking for long documents
✅ Deduplication across windows
"""

import os
import json
import re
import logging
from langchain_google_generativeai import ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import List

logger = logging.getLogger(__name__)

MAX_CHUNK_CHARS = 25_000   # Safe Gemini input size
OVERLAP_CHARS = 500        # Overlap between windows to avoid cutting criteria mid-sentence


class Criterion(BaseModel):
    """Structured criterion output from LangChain parser."""
    text: str = Field(..., description="The criterion description")
    type: str = Field(default="mandatory", description="Either 'mandatory' or 'optional'")
    weight: float = Field(default=1.0, description="Weight or score (defaults to 1.0)")


class CriterionExtractor:
    def __init__(self):
        """Initialize LangChain Gemini model and chain."""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — criteria extraction will fail")
        
        # ✅ LangChain ChatGoogleGenerativeAI with built-in retry
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            api_key=self.api_key,
            temperature=0,
            max_retries=3,  # ✅ Built-in LangChain retry
        )
        
        # ✅ LangChain PromptTemplate
        self.prompt = PromptTemplate(
            input_variables=["tender_text"],
            template="""You are an expert procurement officer. Extract all eligibility and evaluation criteria from the following government tender document.

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
{tender_text}
---

Respond ONLY with the JSON array. No markdown, no explanation."""
        )
        
        # ✅ LangChain JsonOutputParser for structured output
        self.parser = JsonOutputParser()
        
        # ✅ Build the chain: Prompt → LLM → Parser
        self.chain = self.prompt | self.llm | self.parser

    def extract_criteria(self, tender_text: str) -> list:
        """
        Extracts eligibility/evaluation criteria from tender text.
        Uses sliding-window chunking for long documents.
        Deduplicates across windows by criterion text prefix.
        
        Returns: List of dicts with keys: text, type, weight
        Raises: RuntimeError if all extraction attempts fail
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

        if not all_criteria:
            raise RuntimeError("No criteria extracted from tender text after sliding window analysis")
        
        logger.info("Extracted %d unique criteria from long tender", len(all_criteria))
        return all_criteria

    def _extract_single(self, text: str) -> list:
        """
        Calls LangChain chain to extract criteria from a single chunk.
        ✅ LangChain automatically handles retry with exponential backoff
        ✅ Raises exception if all retries exhausted (no silent failures)
        """
        try:
            # ✅ Invoke LangChain chain (includes built-in retry)
            result = self.chain.invoke({"tender_text": text})
            
            # Ensure result is a list
            if isinstance(result, dict):
                # If single object returned, wrap in list
                result = [result]
            elif not isinstance(result, list):
                raise ValueError(f"Expected list from parser, got: {type(result)}")
            
            # ✅ Validate and clean output
            clean = []
            for item in result:
                if not isinstance(item, dict):
                    continue
                if not item.get("text"):
                    continue
                
                # Ensure type is valid
                item_type = item.get("type", "mandatory")
                if item_type not in ("mandatory", "optional"):
                    item_type = "mandatory"
                
                # Ensure weight is float
                try:
                    weight = float(item.get("weight", 1.0))
                except (ValueError, TypeError):
                    weight = 1.0
                
                clean.append({
                    "text": str(item.get("text", "")).strip(),
                    "type": item_type,
                    "weight": weight,
                })
            
            return clean
            
        except Exception as e:
            logger.error("LangChain chain failed for criteria extraction: %s", e)
            # ✅ Raise exception (don't silently return [])
            raise RuntimeError(f"Failed to extract criteria using LangChain: {e}") from e


# ✅ Singleton instance
extractor = CriterionExtractor()
