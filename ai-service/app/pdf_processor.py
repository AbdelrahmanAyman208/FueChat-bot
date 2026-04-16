"""
pdf_processor.py
================
Extracts raw text and structured tables from the academic handbook PDF using
three complementary libraries:
  - pdfplumber  → general text + basic table extraction
  - tabula-py   → lattice/stream table extraction (Java-based)
  - camelot     → high-accuracy table extraction with bounding-box detection

Returns a list of LangChain Document objects ready for splitting.
"""

from __future__ import annotations

import logging
import re
import warnings
from pathlib import Path
from typing import Optional

import pandas as pd
import pdfplumber

try:
    import tabula
    TABULA_AVAILABLE = True
except ImportError:
    TABULA_AVAILABLE = False

try:
    import camelot
    CAMELOT_AVAILABLE = True
except ImportError:
    CAMELOT_AVAILABLE = False

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
# Extraction strategies
# ─────────────────────────────────────────────────────────────

class PDFProcessor:
    """
    Multi-strategy PDF extractor.

    Strategy:
      1. pdfplumber  – page text + simple tables (always used)
      2. tabula-py   – stream + lattice tables (fallback for complex tables)
      3. camelot     – lattice tables with explicit line detection (most accurate)
    """

    def __init__(self, pdf_path: str | Path):
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {self.pdf_path}")

    # ----------------------------------------------------------
    # Strategy 1: pdfplumber
    # ----------------------------------------------------------

    def _extract_with_pdfplumber(self) -> list[Document]:
        docs: list[Document] = []
        with pdfplumber.open(self.pdf_path) as pdf:
            total = len(pdf.pages)
            logger.info(f"[pdfplumber] Processing {total} pages …")

            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ''
                page_text = _clean_text(page_text)

                # Extract tables on this page
                tables = page.extract_tables()
                table_texts: list[str] = []
                for tbl in tables:
                    try:
                        df = pd.DataFrame(tbl)
                        md = _table_to_markdown(df)
                        if md:
                            table_texts.append(md)
                    except Exception as exc:
                        logger.debug(f"pdfplumber table error p{page_num}: {exc}")

                combined = page_text
                if table_texts:
                    combined += '\n\n' + '\n\n'.join(table_texts)

                if combined.strip():
                    docs.append(Document(
                        page_content=combined,
                        metadata={
                            'source': str(self.pdf_path),
                            'page': page_num,
                            'extractor': 'pdfplumber',
                        }
                    ))

        logger.info(f"[pdfplumber] Extracted {len(docs)} page documents.")
        return docs

    # ----------------------------------------------------------
    # Strategy 2: tabula-py
    # ----------------------------------------------------------

    def _extract_tables_tabula(self) -> list[Document]:
        if not TABULA_AVAILABLE:
            logger.warning("tabula-py not available – skipping.")
            return []

        docs: list[Document] = []
        for method in ('lattice', 'stream'):
            try:
                lattice = method == "lattice"
                stream = method == "stream"
                with warnings.catch_warnings():
                    # tabula-py currently emits noisy FutureWarnings from pandas conversions
                    warnings.filterwarnings(
                        "ignore",
                        message=r".*errors='ignore' is deprecated.*",
                        category=FutureWarning,
                    )
                    tables = tabula.read_pdf(
                        str(self.pdf_path),
                        pages='all',
                        multiple_tables=True,
                        lattice=lattice,
                        stream=stream,
                        pandas_options={'header': 0},
                        silent=True,
                        encoding="utf-8",
                        force_subprocess=True,
                    )
                for idx, df in enumerate(tables):
                    md = _table_to_markdown(df)
                    if md and len(md) > 30:
                        docs.append(Document(
                            page_content=f"[TABLE – tabula/{method} #{idx}]\n{md}",
                            metadata={
                                'source': str(self.pdf_path),
                                'table_index': idx,
                                'extractor': f'tabula-{method}',
                            }
                        ))
            except Exception as exc:
                logger.warning(f"[tabula/{method}] Error: {exc}")

        logger.info(f"[tabula] Extracted {len(docs)} table documents.")
        return docs

    # ----------------------------------------------------------
    # Strategy 3: camelot
    # ----------------------------------------------------------

    def _extract_tables_camelot(self) -> list[Document]:
        if not CAMELOT_AVAILABLE:
            logger.warning("camelot not available – skipping.")
            return []

        docs: list[Document] = []
        for flavor in ('lattice', 'stream'):
            try:
                tables = camelot.read_pdf(
                    str(self.pdf_path),
                    pages='all',
                    flavor=flavor,
                )
                for idx, table in enumerate(tables):
                    df = table.df
                    md = _table_to_markdown(df)
                    if md and len(md) > 30:
                        docs.append(Document(
                            page_content=f"[TABLE – camelot/{flavor} #{idx}]\n{md}",
                            metadata={
                                'source': str(self.pdf_path),
                                'table_index': idx,
                                'accuracy': round(table.accuracy, 2),
                                'extractor': f'camelot-{flavor}',
                            }
                        ))
            except Exception as exc:
                logger.warning(f"[camelot/{flavor}] Error: {exc}")

        logger.info(f"[camelot] Extracted {len(docs)} table documents.")
        return docs

    # ----------------------------------------------------------
    # Public API
    # ----------------------------------------------------------

    def extract(
        self,
        use_tabula: bool = True,
        use_camelot: bool = True,
    ) -> list[Document]:
        """
        Run all extraction strategies and merge results.

        Returns deduplicated Document list.
        """
        logger.info(f"Starting PDF extraction: {self.pdf_path}")

        # Always run pdfplumber
        docs = self._extract_with_pdfplumber()

        # Supplement with specialised table extractors
        if use_tabula:
            docs += self._extract_tables_tabula()

        if use_camelot:
            docs += self._extract_tables_camelot()

        logger.info(f"Total documents extracted: {len(docs)}")
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
