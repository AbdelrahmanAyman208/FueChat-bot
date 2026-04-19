"""
vector_store.py
===============
Builds and manages the Chroma vector store from extracted documents.

Flow:
  1. Split documents into chunks  (RecursiveCharacterTextSplitter)
  2. Embed each chunk              (HuggingFace embeddings)
  3. Store in Chroma              (persisted to disk)
  4. Expose a retriever
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

# Disable Chroma anonymized telemetry / PostHog (avoids noisy PostHog errors)
# Chroma reads these at import/init time, so set them before importing Chroma.
os.environ.setdefault("ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("CHROMA_ANONYMIZED_TELEMETRY", "false")
os.environ.setdefault("POSTHOG_DISABLED", "1")

import chromadb
from chromadb.config import Settings as ChromaSettings

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStoreRetriever
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Text splitter
# ─────────────────────────────────────────────────────────────

def get_text_splitter() -> RecursiveCharacterTextSplitter:
    """
    Splits on semantic boundaries first (headings, paragraphs, sentences)
    before falling back to character count.
    """
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        separators=[
            "\n# ", "\n## ", "\n### ",   # Markdown headings
            "\n\n",                       # Paragraph breaks
            "\n",                         # Line breaks
            ". ",                         # Sentence end
            " ",                          # Word boundary
            "",                           # Last resort
        ],
        length_function=len,
        is_separator_regex=False,
    )


# ─────────────────────────────────────────────────────────────
# Embeddings
# ─────────────────────────────────────────────────────────────
from langchain_huggingface import HuggingFaceEmbeddings

def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
    )



# ─────────────────────────────────────────────────────────────
# Chroma Vector Store
# ─────────────────────────────────────────────────────────────

class ChromaStore:
    """Wrapper around LangChain ChromaDB with persistence."""

    COLLECTION_NAME = "academic_handbook"

    def __init__(self):
        self.embeddings = get_embeddings()
        self.persist_dir = Path(settings.chroma_persist_dir)
        self._store: Chroma | None = None

    def build(self, docs: list[Document]) -> int:
        """Chunk docs and build/rebuild Chroma collection. Returns chunk count."""
        splitter = get_text_splitter()
        chunks = splitter.split_documents(docs)
        logger.info(f"[Chroma] Building collection from {len(chunks)} chunks …")

        self.persist_dir.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._store = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            collection_name=self.COLLECTION_NAME,
            persist_directory=str(self.persist_dir),
            client=client,
        )
        logger.info(f"[Chroma] Collection persisted to {self.persist_dir}")
        return len(chunks)

    def load(self) -> None:
        logger.info(f"[Chroma] Loading collection from {self.persist_dir} …")
        client = chromadb.PersistentClient(
            path=str(self.persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._store = Chroma(
            collection_name=self.COLLECTION_NAME,
            embedding_function=self.embeddings,
            persist_directory=str(self.persist_dir),
            client=client,
        )

    def get_retriever(self, k: int | None = None) -> VectorStoreRetriever:
        if self._store is None:
            self.load()
        return self._store.as_retriever(
            search_type="mmr",
            search_kwargs={"k": k or settings.retriever_k, "fetch_k": 40},
        )

    @property
    def is_ready(self) -> bool:
        return self.persist_dir.exists() and any(self.persist_dir.iterdir())


# ─────────────────────────────────────────────────────────────
# Unified VectorStoreManager
# ─────────────────────────────────────────────────────────────

class VectorStoreManager:
    """Manages the Chroma vector store for document retrieval."""

    def __init__(self):
        self.chroma = ChromaStore()

    def build_all(self, docs: list[Document]) -> int:
        """Ingest documents into Chroma. Returns chunk count."""
        return self.chroma.build(docs)

    def get_retriever(self, k: int | None = None) -> VectorStoreRetriever:
        """Return retriever from Chroma store."""
        return self.chroma.get_retriever(k)

    @property
    def is_ready(self) -> bool:
        return self.chroma.is_ready


# Singleton
_manager: VectorStoreManager | None = None


def get_vector_store_manager() -> VectorStoreManager:
    global _manager
    if _manager is None:
        _manager = VectorStoreManager()
    return _manager
