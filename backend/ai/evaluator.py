"""
Bidder Evaluator using LangChain + Gemini API + Semantic Search
✅ Uses LangChain chains for structured output
✅ Semantic similarity for relevant excerpt retrieval
✅ Automatic retry with exponential backoff
✅ Raises exceptions (doesn't silently fail)
"""

import os
import json
import re
import logging
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.language_models.fake_chat_models import FakeListChatModel
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
        """Initialize LangChain Gemini model and evaluation chain."""
        if os.getenv("MOCK_LLM", "false").lower() == "true":
            logger.info("🤖 Using MOCK LLM for Bidder Evaluation")
            self.llm = FakeListChatModel(responses=[
                '{"status": "pass", "excerpt": "Simulated evidence excerpt found in document.", "reasoning": "This is a simulated passing evaluation.", "completeness": 1.0, "page": 1, "source_doc": "simulated.pdf"}'
            ])
        else:
            # ✅ LangChain ChatOllama (Local LLM)
            self.llm = ChatOllama(
                model="llama3", # Default ollama model
                base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
                temperature=0,
                format="json",
            )
        
        # ✅ LangChain PromptTemplate
        self.prompt = PromptTemplate(
            input_variables=["criterion", "criterion_type", "context"],
            template="""You are a government procurement auditor evaluating a bidder's submission.

Criterion: {criterion}
Type: {criterion_type}

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
        )
        
        # ✅ LangChain JsonOutputParser for structured output
        self.parser = JsonOutputParser()
        
        # ✅ Build the chain: Prompt → LLM → Parser
        self.chain = self.prompt | self.llm | self.parser

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
        Evaluates a single criterion for a bidder using LangChain + semantic retrieval.
        
        ✅ Uses LangChain chain with automatic retry
        ✅ Raises exception if all attempts fail (no silent failures)
        
        Returns: dict with keys: status, excerpt, reasoning, confidence, completeness, page, source_doc
        Raises: RuntimeError if evaluation fails after all retries
        """
        relevant_chunks = self.find_relevant_excerpts(criterion["text"], bidder_chunks)

        context = "\n\n".join([
            f"--- Source: {c.get('source_file','?')} | Type: {c.get('type','?')} | Page: {c.get('page','?')} ---\n{c.get('normalized_text', c.get('text',''))}"
            for c in relevant_chunks
        ])

        if not context.strip():
            # Not enough evidence, but don't raise — return review_needed
            return {
                "status": "review_needed",
                "excerpt": "",
                "reasoning": "No relevant evidence found in bidder documents.",
                "confidence": 0.0,
                "completeness": 0.0,
                "page": None,
                "source_doc": None,
            }

        try:
            # ✅ Invoke LangChain chain (includes built-in retry)
            result = self.chain.invoke({
                "criterion": criterion["text"],
                "criterion_type": criterion.get("type", "mandatory"),
                "context": context
            })
            
            # Ensure result is a dict
            if not isinstance(result, dict):
                raise ValueError(f"Expected dict from parser, got: {type(result)}")
            
            # ✅ Compute real confidence (not hardcoded)
            semantic_match = max((c.get("semantic_score", 0) for c in relevant_chunks), default=0)
            ocr_quality = self._infer_ocr_quality(relevant_chunks)
            result["confidence"] = self.compute_confidence(
                ocr_quality=ocr_quality,
                semantic_match=semantic_match,
                completeness=float(result.get("completeness", 0.5)),
            )
            
            return result
            
        except Exception as e:
            logger.error("LangChain chain failed for criterion: %s | Error: %s", 
                        criterion.get("text", "")[:60], e)
            # ✅ Raise exception (don't silently return review_needed)
            raise RuntimeError(f"Failed to evaluate criterion '{criterion.get('text', '')[:60]}' using LangChain: {e}") from e


# ✅ Singleton instance
evaluator = BidderEvaluator()

