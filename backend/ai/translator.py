from transformers import MarianMTModel, MarianTokenizer
import torch
import re
import logging

logger = logging.getLogger(__name__)

class MultilingualHandler:
    def __init__(self):
        # Use Helsinki-NLP for Hindi to English
        self.model_name = "Helsinki-NLP/opus-mt-hi-en"
        try:
            self.tokenizer = MarianTokenizer.from_pretrained(self.model_name)
            self.model = MarianMTModel.from_pretrained(self.model_name)
        except Exception as e:
            logger.warning(f"Could not load translation model: {e}. Falling back to original text.")
            self.model = None

    def translate_hi_to_en(self, text):
        """Translates Hindi text to English."""
        if not self.model or not text.strip():
            return text
            
        try:
            inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True)
            with torch.no_grad():
                translated = self.model.generate(**inputs)
            return self.tokenizer.decode(translated[0], skip_special_tokens=True)
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return text

    def normalize_currency(self, text):
        """Normalizes various currency formats to a standard representation."""
        # Example: ₹ 1,00,000 -> 100000 INR
        # This is a basic implementation; in production, this would be more robust.
        text = re.sub(r'[₹Rs\.?]\s?(\d+([,.]\d+)*)', r'\1 INR', text)
        return text

    def normalize_dates(self, text):
        """Normalizes dates to ISO-like format where possible."""
        # Very basic regex for common Indian date formats (DD/MM/YYYY)
        text = re.sub(r'(\d{2})[/-](\d{2})[/-](\d{4})', r'\3-\2-\1', text)
        return text

    def process_chunk(self, chunk):
        """Processes a text chunk: translates if needed and normalizes."""
        original_text = chunk.get("text", "")
        lang = chunk.get("language", "en")
        
        translated_text = original_text
        if lang == "hi":
            translated_text = self.translate_hi_to_en(original_text)
            
        normalized_text = self.normalize_currency(translated_text)
        normalized_text = self.normalize_dates(normalized_text)
        
        chunk["original_text"] = original_text
        chunk["translated_text"] = translated_text
        chunk["normalized_text"] = normalized_text
        
        return chunk

handler = MultilingualHandler()
