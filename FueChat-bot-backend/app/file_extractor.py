import io
import pdfplumber
from PIL import Image
import pytesseract
import logging

logger = logging.getLogger(__name__)

# Fallback for tesseract path on Windows if needed, though usually in PATH or not required if installed
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Extracts text from various file formats for RAG context injection.
    Supports PDF, Images (PNG/JPG), and Markdown/Text files.
    """
    extracted_text = ""
    filename_lower = filename.lower()
    
    try:
        # PDF Extraction
        if content_type == 'application/pdf' or filename_lower.endswith('.pdf'):
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages_text.append(text)
                    # We can also extract basic tables as string representation
                    tables = page.extract_tables()
                    for table in tables:
                        table_str = "\n".join([" | ".join([str(cell) if cell else "" for cell in row]) for row in table])
                        pages_text.append(table_str)
                extracted_text = "\n".join(pages_text)
                
        # Image Extraction (OCR)
        elif content_type.startswith('image/') or filename_lower.endswith(('.png', '.jpg', '.jpeg')):
            try:
                img = Image.open(io.BytesIO(file_bytes))
                extracted_text = pytesseract.image_to_string(img)
            except Exception as e:
                logger.warning(f"OCR failed for {filename}: {e}")
                extracted_text = "[Image uploaded: OCR text could not be extracted.]"
                
        # Markdown / Text
        elif filename_lower.endswith('.md') or filename_lower.endswith('.txt') or content_type.startswith('text/'):
            extracted_text = file_bytes.decode('utf-8', errors='replace')
            
        else:
            extracted_text = f"[Unsupported file type uploaded: {filename}]"
            
    except Exception as e:
        logger.error(f"Failed to extract text from {filename}: {e}")
        extracted_text = f"[Error extracting text from file: {filename}]"
        
    # Truncate if too long to save token context limits (e.g., max 8000 chars)
    max_chars = 8000
    if len(extracted_text) > max_chars:
        extracted_text = extracted_text[:max_chars] + "\n...[TRUNCATED due to length]..."
        
    return extracted_text.strip()
