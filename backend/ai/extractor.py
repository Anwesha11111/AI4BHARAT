import google.generativeai as genai
import os
import json
import logging

logger = logging.getLogger(__name__)

class CriterionExtractor:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def extract_criteria(self, tender_text):
        """
        Calls Gemini to extract structured eligibility criteria from tender text.
        """
        prompt = f"""
        You are an expert procurement officer. Extract all eligibility and evaluation criteria from the following government tender document.
        
        Rules:
        1. Identify if a criterion is 'mandatory' (Pass/Fail) or 'optional' (scored/weighted).
        2. Assign a weight if mentioned, otherwise default to 1.0.
        3. Provide a clear, concise text description for each criterion.
        
        Output MUST be a valid JSON array of objects with these keys:
        - id: string (unique short slug)
        - text: string (the criterion description)
        - type: string ("mandatory" or "optional")
        - weight: float
        
        Tender Document Text:
        ---
        {tender_text[:30000]} 
        ---
        
        Respond ONLY with the JSON array.
        """
        
        try:
            response = self.model.generate_content(prompt)
            
            # Extract JSON from response
            content = response.text
            # Find the first '[' and last ']'
            start = content.find('[')
            end = content.rfind(']') + 1
            json_str = content[start:end]
            
            return json.loads(json_str)
            
        except Exception as e:
            logger.error(f"Error extracting criteria: {e}")
            return []

extractor = CriterionExtractor()
