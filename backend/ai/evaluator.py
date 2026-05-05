import google.generativeai as genai
import os
import json
import logging
from sentence_transformers import SentenceTransformer, util
import torch

logger = logging.getLogger(__name__)

class BidderEvaluator:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        # For semantic matching
        self.semantic_model = SentenceTransformer('all-MiniLM-L6-v2')

    def find_relevant_excerpts(self, criterion_text, bidder_chunks, top_k=3):
        """
        Uses semantic similarity to find the most relevant chunks in the bidder's docs.
        """
        criterion_embedding = self.semantic_model.encode(criterion_text, convert_to_tensor=True)
        chunk_texts = [c.get("normalized_text", c.get("text", "")) for c in bidder_chunks]
        
        if not chunk_texts:
            return []
            
        chunk_embeddings = self.semantic_model.encode(chunk_texts, convert_to_tensor=True)
        
        cosine_scores = util.cos_sim(criterion_embedding, chunk_embeddings)[0]
        top_results = torch.topk(cosine_scores, k=min(top_k, len(chunk_texts)))
        
        relevant_chunks = []
        for score, idx in zip(top_results[0], top_results[1]):
            chunk = bidder_chunks[idx.item()]
            chunk["semantic_score"] = score.item()
            relevant_chunks.append(chunk)
            
        return relevant_chunks

    def compute_confidence(self, ocr_quality, semantic_match, completeness):
        """
        Phase 7: Confidence Score Logic
        confidence = 0.3 * ocr_quality + 0.4 * semantic_match + 0.3 * completeness
        """
        return (0.3 * ocr_quality) + (0.4 * semantic_match) + (0.3 * completeness)

    def evaluate_bidder_criterion(self, criterion, bidder_chunks):
        """
        Evaluates a single criterion for a bidder using Gemini.
        """
        relevant_chunks = self.find_relevant_excerpts(criterion["text"], bidder_chunks)
        
        context = "\n\n".join([
            f"--- Source: {c.get('type')} Page: {c.get('page')} ---\n{c.get('text')}" 
            for c in relevant_chunks
        ])
        
        prompt = f"""
        You are an auditor evaluating a bidder's submission against a specific tender criterion.
        
        Criterion: {criterion['text']}
        Type: {criterion['type']}
        
        Relevant Evidence from Bidder Documents:
        {context}
        
        Task:
        1. Determine if the bidder satisfies the criterion.
        2. Provide a clear 'status' ("pass", "fail", or "review_needed").
        3. Extract the exact excerpt that serves as evidence.
        4. Provide detailed reasoning.
        5. Rate 'completeness' (0.0 to 1.0) of the evidence found.
        
        Output MUST be valid JSON:
        {{
            "status": "pass" | "fail" | "review_needed",
            "excerpt": "...",
            "reasoning": "...",
            "completeness": 0.9,
            "page": 1,
            "source_doc": "..."
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            
            # Find the JSON block in the response
            content = response.text
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end]
            
            result = json.loads(json_str)
            
            # Calculate aggregate confidence
            semantic_match = max([c.get("semantic_score", 0) for c in relevant_chunks]) if relevant_chunks else 0
            ocr_quality = 0.9 
            
            result["confidence"] = self.compute_confidence(
                ocr_quality=ocr_quality,
                semantic_match=semantic_match,
                completeness=result.get("completeness", 0.5)
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Evaluation error: {e}")
            return {
                "status": "review_needed",
                "reasoning": f"Gemini Evaluation failed: {str(e)}",
                "confidence": 0.0
            }

evaluator = BidderEvaluator()
