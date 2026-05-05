import google.generativeai as genai
import os
import json
import re
import time
import logging
from sentence_transformers import SentenceTransformer, util
import torch

logger = logging.getLogger(__name__)

# Loaded once at process startup — shared across all evaluations in this worker
_semantic_model = None

def get_semantic_model() -> SentenceTransformer:
    """Lazy-load the embedding model once per process."""
    global _semantic_model
    if _semantic_model is None:
        logger.info("Loading SentenceTransformer model (first use)...")
        _semantic_model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("SentenceTransformer model loaded")
    return _semantic_model


class BidderEvaluator:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set — evaluations will fail")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def find_relevant_excerpts(self, criterion_text: str, bidder_chunks: list, top_k: int = 3) -> list:
        """Uses semantic similarity to find the top-k most relevant bidder chunks."""
        if not bidder_chunks:
            return []

        sem_model = get_semantic_model()
        criterion_embedding = sem_model.encode(criterion_text, convert_to_tensor=True)
        chunk_texts = [c.get("normalized_text", c.get("text", "")) for c in bidder_chunks]

        if not any(chunk_texts):
            return []

        chunk_embeddings = sem_model.encode(chunk_texts, convert_to_tensor=True)
        cosine_scores = util.cos_sim(criterion_embedding, chunk_embeddings)[0]
        top_results = torch.topk(cosine_scores, k=min(top_k, len(chunk_texts)))

        relevant = []
        for score, idx in zip(top_results[0], top_results[1]):
            chunk = bidder_chunks[idx.item()].copy()
            chunk["semantic_score"] = round(score.item(), 4)
            relevant.append(chunk)

        return relevant

    def compute_confidence(self, ocr_quality: float, semantic_match: float, completeness: float) -> float:
        """
        Weighted confidence formula:
        confidence = 0.3 * ocr_quality + 0.4 * semantic_match + 0.3 * completeness
        ocr_quality is derived from source_type (digital PDF = 0.95, OCR = 0.75, image = 0.65)
        """
        return round((0.3 * ocr_quality) + (0.4 * semantic_match) + (0.3 * completeness), 4)

    def _infer_ocr_quality(self, chunks: list) -> float:
        """Estimates OCR quality from the source types in the relevant chunks."""
        if not chunks:
            return 0.7
        type_scores = {"pdf_digital": 0.95, "pdf_ocr": 0.75, "image_ocr": 0.65, "docx": 0.95}
        scores = [type_scores.get(c.get("type", "unknown"), 0.7) for c in chunks]
        return round(sum(scores) / len(scores), 3)

    def evaluate_bidder_criterion(self, criterion: dict, bidder_chunks: list) -> dict:
        """
        Evaluates a single criterion for a bidder using Gemini + semantic retrieval.
        Returns a result dict always — never raises.
        """
        relevant_chunks = self.find_relevant_excerpts(criterion["text"], bidder_chunks)

        context = "\n\n".join([
            f"--- Source: {c.get('source_file','?')} | Type: {c.get('type','?')} | Page: {c.get('page','?')} ---\n{c.get('normalized_text', c.get('text',''))}"
            for c in relevant_chunks
        ])

        if not context.strip():
            return {
                "status": "review_needed",
                "excerpt": "",
                "reasoning": "No relevant evidence found in bidder documents.",
                "confidence": 0.0,
                "completeness": 0.0,
                "page": None,
                "source_doc": None,
            }

        prompt = self._build_prompt(criterion, context)

        for attempt in range(3):
            try:
                response = self.model.generate_content(prompt)
                result = self._parse_json_object(response.text)

                # Compute real confidence (not hardcoded)
                semantic_match = max((c.get("semantic_score", 0) for c in relevant_chunks), default=0)
                ocr_quality = self._infer_ocr_quality(relevant_chunks)
                result["confidence"] = self.compute_confidence(
                    ocr_quality=ocr_quality,
                    semantic_match=semantic_match,
                    completeness=float(result.get("completeness", 0.5)),
                )
                return result

            except json.JSONDecodeError as je:
                logger.warning("Gemini returned invalid JSON on attempt %d: %s", attempt + 1, je)
            except Exception as e:
                wait = 2 ** attempt
                logger.warning("Gemini evaluation attempt %d failed: %s. Retrying in %ds", attempt + 1, e, wait)
                time.sleep(wait)

        logger.error("All Gemini attempts failed for criterion: %s", criterion.get("text", "")[:60])
        return {
            "status": "review_needed",
            "excerpt": "",
            "reasoning": "Gemini evaluation failed after 3 retries.",
            "confidence": 0.0,
            "completeness": 0.0,
            "page": None,
            "source_doc": None,
        }

    def _build_prompt(self, criterion: dict, context: str) -> str:
        return f"""You are a government procurement auditor evaluating a bidder's submission.

Criterion: {criterion['text']}
Type: {criterion.get('type', 'mandatory')}

Relevant Evidence from Bidder Documents:
{context}

Task:
1. Determine if the bidder satisfies the criterion.
2. Provide a clear 'status': "pass", "fail", or "review_needed".
3. Extract the exact excerpt that serves as evidence (copy verbatim).
4. Provide detailed reasoning in 1-2 sentences.
5. Rate 'completeness' (0.0 to 1.0) of the evidence found.

Output MUST be valid JSON only — no markdown, no extra text:
{{
    "status": "pass" | "fail" | "review_needed",
    "excerpt": "...",
    "reasoning": "...",
    "completeness": 0.9,
    "page": 1,
    "source_doc": "filename.pdf"
}}"""

    def _parse_json_object(self, content: str) -> dict:
        """Robust JSON object extraction — handles markdown fences."""
        content = re.sub(r"```(?:json)?\s*", "", content).strip().rstrip("`")
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError(f"No JSON object in response: {content[:200]}")
        parsed = json.loads(content[start:end])
        if not isinstance(parsed, dict):
            raise ValueError(f"Expected JSON object, got: {type(parsed)}")
        return parsed


evaluator = BidderEvaluator()
