import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os
from docx import Document
from langdetect import detect
import logging

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self, tesseract_cmd=None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def process_pdf(self, file_path):
        """
        Processes a PDF (digital or scanned).
        Returns a list of dictionaries, one per page.
        """
        results = []
        doc = fitz.open(file_path)
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            
            # Check if page is blank or likely scanned
            if len(text.strip()) < 50:
                logger.info(f"Page {page_num} appears scanned. Running OCR...")
                pix = page.get_pixmap()
                img = Image.open(io.BytesIO(pix.tobytes()))
                # Run OCR for both English and Hindi
                text = pytesseract.image_to_string(img, lang='eng+hin')
            
            lang = "unknown"
            try:
                lang = detect(text)
            except:
                pass

            results.append({
                "page": page_num + 1,
                "text": text,
                "language": lang,
                "type": "pdf"
            })
            
        return results

    def process_docx(self, file_path):
        """Processes DOCX files."""
        doc = Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        
        text = "\n".join(full_text)
        lang = "unknown"
        try:
            lang = detect(text)
        except:
            pass

        return [{
            "page": 1,
            "text": text,
            "language": lang,
            "type": "docx"
        }]

    def process_image(self, file_path):
        """Processes image files using OCR."""
        img = Image.open(file_path)
        text = pytesseract.image_to_string(img, lang='eng+hin')
        
        lang = "unknown"
        try:
            lang = detect(text)
        except:
            pass

        return [{
            "page": 1,
            "text": text,
            "language": lang,
            "type": "image"
        }]

    def auto_process(self, file_path):
        """Detects file type and processes accordingly."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self.process_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            return self.process_docx(file_path)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff"]:
            return self.process_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")

processor = DocumentProcessor()
