"""
vector_store.py
===============
Builds and manages vector stores (FAISS + ChromaDB) from extracted documents.

Flow:
  1. Split documents into chunks  (RecursiveCharacterTextSplitter)
  2. Embed each chunk              (HuggingFace embeddings)
  3. Store in FAISS and/or Chroma (persisted to disk)
  4. Expose a unified retriever
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

from langchain_community.vectorstores import FAISS
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
# FAISS Vector Store
# ─────────────────────────────────────────────────────────────

class FAISSStore:
    """Wrapper around LangChain FAISS with load/save helpers."""

    def __init__(self):
        self.embeddings = get_embeddings()
        self.index_path = Path(settings.faiss_index_path)
        self._store: FAISS | None = None

    def build(self, docs: list[Document]) -> int:
        """Chunk docs and build FAISS index from scratch. Returns chunk count."""
        splitter = get_text_splitter()
        chunks = splitter.split_documents(docs)
        logger.info(f"[FAISS] Building index from {len(chunks)} chunks …")
        self._store = FAISS.from_documents(chunks, self.embeddings)
        self.save()
        logger.info(f"[FAISS] Index saved to {self.index_path}")
        return len(chunks)

    def save(self) -> None:
        if self._store is None:
            raise RuntimeError("FAISS store not initialised – call build() first.")
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        self._store.save_local(str(self.index_path))

    def load(self) -> None:
        if not self.index_path.exists():
            raise FileNotFoundError(
                f"FAISS index not found at {self.index_path}. "
                "Run the ingestion script first."
            )
        logger.info(f"[FAISS] Loading index from {self.index_path} …")
        self._store = FAISS.load_local(
            str(self.index_path),
            self.embeddings,
            allow_dangerous_deserialization=True,
        )

    def get_retriever(self, k: int | None = None) -> VectorStoreRetriever:
        if self._store is None:
            self.load()
        return self._store.as_retriever(
            search_type="mmr",                  # Max Marginal Relevance → diversity
            search_kwargs={"k": k or settings.retriever_k, "fetch_k": 20},
        )

    @property
    def is_ready(self) -> bool:
        return self.index_path.exists()


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
            search_kwargs={"k": k or settings.retriever_k, "fetch_k": 20},
        )

    @property
    def is_ready(self) -> bool:
        return self.persist_dir.exists() and any(self.persist_dir.iterdir())


# ─────────────────────────────────────────────────────────────
# Unified VectorStoreManager
# ─────────────────────────────────────────────────────────────

class VectorStoreManager:
    """
    Facade that selects FAISS, Chroma, or both based on settings.
    Falls back to FAISS if Chroma is unavailable.
    """

    def __init__(self):
        self.faiss = FAISSStore()
        self.chroma = ChromaStore()
        self._primary: str = settings.vector_store_type  # "faiss" | "chroma" | "both"

    def build_all(self, docs: list[Document]) -> int:
        """Ingest docs into all configured vector stores. Returns last chunk count written."""
        last_chunks = 0
        if self._primary in ("faiss", "both"):
            last_chunks = self.faiss.build(docs)
        if self._primary in ("chroma", "both"):
            last_chunks = self.chroma.build(docs)
        return last_chunks

    def get_retriever(self, k: int | None = None) -> VectorStoreRetriever:
        """Return retriever from the primary configured store."""
        if self._primary == "faiss":
            return self.faiss.get_retriever(k)
        elif self._primary == "chroma":
            return self.chroma.get_retriever(k)
        else:
            # "both" → prefer Chroma, fallback to FAISS
            try:
                return self.chroma.get_retriever(k)
            except Exception:
                return self.faiss.get_retriever(k)

    @property
    def is_ready(self) -> bool:
        if self._primary == "faiss":
            return self.faiss.is_ready
        elif self._primary == "chroma":
            return self.chroma.is_ready
        return self.faiss.is_ready or self.chroma.is_ready


# Singleton
_manager: VectorStoreManager | None = None


def get_vector_store_manager() -> VectorStoreManager:
    global _manager
    if _manager is None:
        _manager = VectorStoreManager()
    return _manager
