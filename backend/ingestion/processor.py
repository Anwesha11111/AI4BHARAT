import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io
import os
from docx import Document
from langdetect import detect
import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

logger = logging.getLogger(__name__)

# ── Tesseract path (required on Windows where Tesseract is not on PATH) ──────
_tesseract_cmd = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if os.path.isfile(_tesseract_cmd):
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd
else:
    logger.warning(
        "Tesseract not found at '%s'. Set TESSERACT_CMD env var. OCR will fail.",
        _tesseract_cmd,
    )

MAX_PDF_PAGES = 200       # Cap to prevent multi-hour OCR on huge scanned docs
OCR_DPI = 150             # Lower DPI = faster OCR; 150 is good enough for text
OCR_TIMEOUT_SEC = 30      # ✅ Timeout for OCR per page (prevent hangs on pathological images)


def _ocr_with_timeout(img, timeout_sec=OCR_TIMEOUT_SEC) -> str:
    """
    ✅ Runs Tesseract OCR with timeout using ThreadPoolExecutor.
    Returns: OCR text, or empty string if timeout exceeded.
    """
    with ThreadPoolExecutor(max_workers=1) as executor:
        try:
            future = executor.submit(
                pytesseract.image_to_string,
                img,
                lang="eng+hin",
                config="--psm 6 --oem 1"
            )
            return future.result(timeout=timeout_sec)
        except FuturesTimeoutError:
            logger.warning("OCR timeout after %d seconds (pathological image?)", timeout_sec)
            return ""  # ✅ Return empty rather than crash
        except Exception as e:
            logger.warning("OCR execution failed: %s", e)
            return ""  # ✅ Graceful fallback


class DocumentProcessor:
    def __init__(self):
        pass

    def process_pdf(self, file_path: str) -> list[dict]:
        """
        Processes a PDF (digital or scanned).
        Returns a list of dicts, one per page.
        - FIX: always closes fitz doc (prevents memory leak)
        - FIX: uses tobytes("png") not tobytes() (prevents PIL crash)
        - FIX: per-page OCR error is isolated, not fatal
        """
        results = []
        doc = None
        try:
            doc = fitz.open(file_path)
            total_pages = min(len(doc), MAX_PDF_PAGES)

            if len(doc) > MAX_PDF_PAGES:
                logger.warning(
                    "PDF %s has %d pages; only processing first %d",
                    file_path, len(doc), MAX_PDF_PAGES
                )

            for page_num in range(total_pages):
                page = doc.load_page(page_num)
                text = page.get_text().strip()
                source_type = "pdf_digital"

                if len(text) < 50:  # Likely scanned page
                    logger.info("Page %d of %s is sparse (%d chars), running OCR", page_num + 1, file_path, len(text))
                    try:
                        pix = page.get_pixmap(dpi=OCR_DPI)
                        # FIX: use PNG format bytes so PIL can parse the header
                        img_bytes = pix.tobytes("png")
                        img = Image.open(io.BytesIO(img_bytes))
                        # ✅ FIX: OCR with timeout (prevent hanging on pathological images)
                        text = _ocr_with_timeout(img, timeout_sec=OCR_TIMEOUT_SEC)
                        source_type = "pdf_ocr"
                    except Exception as ocr_err:
                        logger.warning(
                            "OCR failed on page %d of %s: %s — continuing with empty text",
                            page_num + 1, file_path, ocr_err
                        )
                        text = ""

                lang = _safe_detect(text)
                results.append({
                    "page": page_num + 1,
                    "text": text,
                    "language": lang,
                    "type": source_type,
                    "source_file": os.path.basename(file_path),
                    "char_count": len(text),
                })

        except fitz.FileDataError as fde:
            logger.error("Corrupt or unreadable PDF %s: %s", file_path, fde)
            raise ValueError(f"PDF is corrupt or unreadable: {os.path.basename(file_path)}") from fde
        except Exception as e:
            logger.error("PDF processing failed for %s: %s", file_path, e)
            raise
        finally:
            if doc:
                doc.close()  # Always release file handle

        return results

    def process_docx(self, file_path: str) -> list[dict]:
        """
        Processes DOCX files.
        Extracts paragraphs + table cell text for richer context.
        """
        try:
            doc = Document(file_path)
        except Exception as e:
            logger.error("Failed to open DOCX %s: %s", file_path, e)
            raise ValueError(f"DOCX is unreadable: {os.path.basename(file_path)}") from e

        parts = []
        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text)

        # Also extract table cell text
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    parts.append(row_text)

        text = "\n".join(parts)
        lang = _safe_detect(text)

        return [{
            "page": 1,
            "text": text,
            "language": lang,
            "type": "docx",
            "source_file": os.path.basename(file_path),
            "char_count": len(text),
        }]

    def process_image(self, file_path: str) -> list[dict]:
        """Processes image files using OCR with timeout."""
        try:
            img = Image.open(file_path)
            # ✅ Use timeout wrapper for OCR
            text = _ocr_with_timeout(img, timeout_sec=OCR_TIMEOUT_SEC)
        except Exception as e:
            logger.error("Image OCR failed for %s: %s", file_path, e)
            raise ValueError(f"Image OCR failed: {os.path.basename(file_path)}") from e

        lang = _safe_detect(text)
        return [{
            "page": 1,
            "text": text,
            "language": lang,
            "type": "image_ocr",
            "source_file": os.path.basename(file_path),
            "char_count": len(text),
        }]

    def auto_process(self, file_path: str) -> list[dict]:
        """Detects file type and routes to the correct processor."""
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        if os.path.getsize(file_path) == 0:
            raise ValueError(f"File is empty: {os.path.basename(file_path)}")

        ext = os.path.splitext(file_path)[1].lower()
        logger.info("Processing file: %s (type=%s)", os.path.basename(file_path), ext)

        if ext == ".pdf":
            return self.process_pdf(file_path)
        elif ext in (".docx", ".doc"):
            return self.process_docx(file_path)
        elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".tif"):
            return self.process_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}. Supported: pdf, docx, png, jpg, jpeg, tiff, tif")



def _safe_detect(text: str) -> str:
    """Language detection that never raises."""
    if len(text.strip()) < 20:
        return "unknown"
    try:
        return detect(text)
    except Exception:
        return "unknown"


processor = DocumentProcessor()
