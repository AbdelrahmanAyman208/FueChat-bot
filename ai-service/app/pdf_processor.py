"""
pdf_processor.py
================
Extracts raw text and structured tables from the academic handbook PDF using
PyMuPDF (fitz).

PyMuPDF provides efficient text extraction and table detection with bounding-box
analysis for high-accuracy table parsing.

Returns a list of LangChain Document objects ready for splitting.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

import pandas as pd
import pymupdf  # PyMuPDF

from langchain_core.documents import Document

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """Remove noise, fix encoding artefacts and normalise whitespace."""
    # Drop cid artefacts
    text = re.sub(r'\(cid:\d+\)', '', text)
    # Drop control characters (but keep printable Unicode, Arabic, etc.)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', ' ', text)
    # Collapse multiple spaces/newlines
    text = re.sub(r'[ \t]{2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def _table_to_markdown(df: pd.DataFrame) -> str:
    """Convert a DataFrame to a clean Markdown table string."""
    df = df.dropna(how='all').fillna('')
    # Collapse multi-line cell content
    df = df.map(lambda x: ' '.join(str(x).split()) if x else '')
    # Drop completely empty columns
    df = df.loc[:, (df != '').any(axis=0)]
    if df.empty:
        return ''
    return df.to_markdown(index=False)


# ─────────────────────────────────────────────────────────────
# PDF Processor
# ─────────────────────────────────────────────────────────────

class PDFProcessor:
    """
    PyMuPDF-based PDF extractor.

    Extracts text and tables from PDF pages using PyMuPDF's efficient parsing.
    Tables are detected and extracted as DataFrames, then converted to Markdown.
    """

    def __init__(self, pdf_path: str | Path):
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {self.pdf_path}")

    def extract(self) -> list[Document]:
        """
        Extract text and tables from all PDF pages using PyMuPDF.

        Returns a list of Document objects, one per page with combined content.
        """
        docs: list[Document] = []
        with pymupdf.open(self.pdf_path) as pdf:
            total = len(pdf)
            logger.info(f"[PyMuPDF] Processing {total} pages …")

            for page_num in range(total):
                page = pdf[page_num]
                page_num_display = page_num + 1  # 1-based for display

                # Extract text
                page_text = page.get_text() or ''
                page_text = _clean_text(page_text)

                # Extract tables
                tables = page.find_tables()
                table_texts: list[str] = []
                for table_idx, table in enumerate(tables):
                    try:
                        df = table.to_pandas()
                        md = _table_to_markdown(df)
                        if md:
                            table_texts.append(f"[TABLE #{table_idx}]\n{md}")
                    except Exception as exc:
                        logger.debug(f"PyMuPDF table error p{page_num_display} t{table_idx}: {exc}")

                # Combine text and tables
                combined = page_text
                if table_texts:
                    combined += '\n\n' + '\n\n'.join(table_texts)

                if combined.strip():
                    docs.append(Document(
                        page_content=combined,
                        metadata={
                            'source': str(self.pdf_path),
                            'page': page_num_display,
                            'extractor': 'pymupdf',
                        }
                    ))

        logger.info(f"[PyMuPDF] Extracted {len(docs)} page documents.")
        return docs


# ─────────────────────────────────────────────────────────────
# CLI entry point for quick testing
# ─────────────────────────────────────────────────────────────
if __name__ == '__main__':
    import sys
    logging.basicConfig(level=logging.INFO)
    path = sys.argv[1] if len(sys.argv) > 1 else 'data/handbook.pdf'
    processor = PDFProcessor(path)
    docs = processor.extract()
    print(f"\nExtracted {len(docs)} documents.")
    print("\n=== SAMPLE (first 3) ===")
    for d in docs[:3]:
        print(f"[Page {d.metadata.get('page', '?')}] {d.page_content[:300]}")
        print("---")
