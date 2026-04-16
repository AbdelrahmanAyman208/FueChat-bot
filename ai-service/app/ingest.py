"""
ingest.py
=========
One-shot ingestion pipeline:
  1. Extract text + tables from the PDF
  2. Chunk documents
  3. Embed and store in FAISS + Chroma

Run:
  python -m app.ingest
  python -m app.ingest --pdf data/handbook.pdf --rebuild
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

# Allow running as a script
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.pdf_processor import PDFProcessor
from app.vector_store import get_vector_store_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("ingest")


def run_ingestion(
    pdf_path: str | None = None,
    rebuild: bool = False,
) -> dict:
    """
    Main ingestion function.

    Args:
        pdf_path: Override the default PDF path from settings.
        rebuild:  Force rebuild even if vector stores already exist.

    Returns:
        dict with stats.
    """
    path = pdf_path or settings.pdf_path
    vsm = get_vector_store_manager()

    if vsm.is_ready and not rebuild:
        logger.info("Vector store already exists. Use --rebuild to force re-ingestion.")
        return {"status": "already_exists", "docs_extracted": 0, "chunks_indexed": 0}

    # ── Step 1: Extract from PDF ──────────────────────────────
    t0 = time.time()
    logger.info(f"Extracting from: {path}")
    processor = PDFProcessor(path)
    docs = processor.extract(use_tabula=True, use_camelot=False)  # camelot needs ghostscript
    logger.info(f"Extracted {len(docs)} documents in {time.time()-t0:.1f}s")

    if not docs:
        raise RuntimeError("No documents extracted – check the PDF path and content.")

    # ── Step 2: Build vector stores ───────────────────────────
    t1 = time.time()
    logger.info("Building vector stores …")
    chunks_indexed = vsm.build_all(docs)
    logger.info(f"Vector stores built in {time.time()-t1:.1f}s")

    stats = {
        "status": "success",
        "docs_extracted": len(docs),
        "chunks_indexed": chunks_indexed,
        "vector_stores": settings.vector_store_type,
        "total_time_s": round(time.time() - t0, 1),
    }
    logger.info(f"Ingestion complete: {stats}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest academic handbook PDF into vector stores")
    parser.add_argument("--pdf", type=str, help="Path to the PDF file")
    parser.add_argument("--rebuild", action="store_true", help="Force rebuild")
    args = parser.parse_args()

    result = run_ingestion(pdf_path=args.pdf, rebuild=args.rebuild)
    print(result)
