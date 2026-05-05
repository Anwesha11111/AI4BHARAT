import logging
import os
from .extractor import extractor
from .evaluator import evaluator
from .translator import handler
from ingestion.processor import processor
from db.models import VerdictStatus

logger = logging.getLogger(__name__)

class TenderMindWorkflow:
    """
    Orchestrates the full pipeline:
    extract → evaluate → score → decide
    """
    
    async def process_tender(self, file_path):
        """Processes a tender and extracts criteria."""
        chunks = processor.auto_process(file_path)
        full_text = "\n".join([c["text"] for c in chunks])
        criteria = extractor.extract_criteria(full_text)
        return criteria, full_text

    async def evaluate_bidder(self, bidder_folder, criteria):
        """
        Evaluates a bidder against a list of criteria.
        """
        # 1. Ingest all files in folder
        all_chunks = []
        for filename in os.listdir(bidder_folder):
            file_path = os.path.join(bidder_folder, filename)
            chunks = processor.auto_process(file_path)
            for chunk in chunks:
                processed_chunk = handler.process_chunk(chunk)
                all_chunks.append(processed_chunk)
        
        results = []
        for criterion in criteria:
            # 2. Evaluate
            evaluation = evaluator.evaluate_bidder_criterion(criterion, all_chunks)
            
            # 3. Decision Logic (Phase 8)
            confidence = evaluation.get("confidence", 0)
            if confidence >= 0.8:
                # Auto-approve the AI's decision
                pass 
            else:
                # Flag for human review
                evaluation["status"] = "review_needed"
                evaluation["reasoning"] += " (Flagged due to low confidence)"
            
            results.append({
                "criterion_id": criterion.get("id"),
                "evaluation": evaluation
            })
            
        return results

workflow = TenderMindWorkflow()
