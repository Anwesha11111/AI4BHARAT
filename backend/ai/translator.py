from transformers import MarianMTModel, MarianTokenizer
import torch
import re
import logging

logger = logging.getLogger(__name__)

class MultilingualHandler:
    def __init__(self):
        # Use Helsinki-NLP for Hindi to English
        self.model_name = "Helsinki-NLP/opus-mt-hi-en"
        self.tokenizer = None
        self.model = None
        self._loaded = False

    def _load_model(self):
        """Lazy-load the translation model on first use (avoids startup crash)."""
        if self._loaded:
            return
        try:
            logger.info("Loading translation model '%s' (first use)...", self.model_name)
            self.tokenizer = MarianTokenizer.from_pretrained(self.model_name)
            self.model = MarianMTModel.from_pretrained(self.model_name)
            self._loaded = True
            logger.info("Translation model loaded")
        except Exception as e:
            logger.warning("Could not load translation model: %s. Falling back to original text.", e)
            self._loaded = True  # Mark as attempted so we don't retry every call

    def translate_hi_to_en(self, text):
        """Translates Hindi text to English."""
        self._load_model()
        if not self.model or not text.strip():
            return text
            
        try:
            inputs = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True, max_length=512)
            with torch.no_grad():
                translated = self.model.generate(**inputs)
            return self.tokenizer.decode(translated[0], skip_special_tokens=True)
        except Exception as e:
            logger.error("Translation error: %s", e)
            return text

    def normalize_currency(self, text):
        """Normalizes various currency formats to a standard representation."""
        # Example: ₹ 1,00,000 -> 100000 INR
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
