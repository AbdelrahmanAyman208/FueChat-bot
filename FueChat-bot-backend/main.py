"""
main.py
=======
FastAPI application – Academic Advisor Chatbot API.

Endpoints:
  POST /api/v1/ingest          – Ingest PDF into vector stores
  POST /api/v1/chat            – General handbook Q&A
  POST /api/v1/advise          – Personalised course recommendations
  DELETE /api/v1/session/{id}  – Clear chat history
  GET  /api/v1/health          – Health check
  GET  /docs                   – Swagger UI
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from app.config import settings
from app.ingest import run_ingestion
from app.models import (
    ChatRequest,
    ChatResponse,
    IngestRequest,
    IngestResponse,
)
from app.rag_chain import (
    answer_question_stream,
    clear_session,
    recommend_courses_stream,
)
from app.vector_store import get_vector_store_manager

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("main")

STATIC_DIR = Path(__file__).resolve().parent / "static"

# ─────────────────────────────────────────────────────────────
# Lifespan  (startup / shutdown)
# ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Academic Advisor API …")
    vsm = get_vector_store_manager()
    if not vsm.is_ready:
        logger.warning(
            "Vector store not found. Call POST /api/v1/ingest to build it."
        )
    else:
        logger.info("Vector store loaded successfully.")
    yield
    logger.info("Shutting down.")


# ─────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Academic Advisor Chatbot",
    description=(
        "RAG-powered chatbot for course advising at the Faculty of Computers "
        "and Information Technology, Future University Egypt."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-session student profile cache
_session_profiles: dict[str, object] = {}


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@app.get("/chat", include_in_schema=False)
async def chat_ui():
    """Single-page chat UI; open in browser while API is running."""
    page = STATIC_DIR / "chat.html"
    if not page.is_file():
        raise HTTPException(status_code=404, detail="chat.html not found")
    return FileResponse(page)


@app.get("/api/v1/health", tags=["Utility"])
async def health():
    vsm = get_vector_store_manager()
    provider = (settings.llm_provider or "").lower()
    if provider == "google":
        model = settings.gemini_model
    elif provider == "openrouter":
        model = settings.openrouter_model
    else:
        model = settings.hf_model
    return {
        "status": "ok",
        "vector_store_ready": vsm.is_ready,
        "llm_provider": settings.llm_provider,
        "model": model,
    }


@app.post(
    "/api/v1/ingest",
    response_model=IngestResponse,
    tags=["Admin"],
    summary="Ingest PDF handbook into vector stores",
)
async def ingest(request: IngestRequest):
    """
    Extract text and tables from the handbook PDF and build vector stores.
    Must be called once before chatting.
    Set `rebuild=true` to force re-ingestion.
    """
    try:
        stats = run_ingestion(
            pdf_path=request.pdf_path,
            rebuild=request.rebuild,
        )
        return IngestResponse(
            status=stats.get("status", "success"),
            docs_extracted=stats.get("docs_extracted", 0),
            chunks_indexed=stats.get("chunks_indexed", 0),
            vector_stores=[stats.get("vector_stores", settings.vector_store_type)],
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Ingestion failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post(
    "/api/v1/chat",
    tags=["Chat"],
    summary="General handbook Q&A (Streaming)",
)
async def chat(request: ChatRequest):
    """
    Ask any question about the academic handbook (courses, regulations, etc.).
    Optionally provide a `student_profile` to personalise the response.
    Returns a stream of Server-Sent Events (SSE).
    """
    vsm = get_vector_store_manager()
    if not vsm.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector store not ready. Call POST /api/v1/ingest first.",
        )

    if request.student_profile:
        _session_profiles[request.session_id] = request.student_profile

    profile = _session_profiles.get(request.session_id)

    async def event_generator():
        try:
            if profile:
                generator = recommend_courses_stream(request.session_id, request.message, profile)
            else:
                generator = answer_question_stream(request.session_id, request.message)

            async for chunk in generator:
                # SSE format: data: <chunk>\n\n
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            logger.exception("Chat stream error")
            yield f"data: [ERROR] {str(exc)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post(
    "/api/v1/advise",
    tags=["Advising"],
    summary="Personalised course recommendations (Streaming)",
)
async def advise(request: ChatRequest):
    if not request.student_profile:
        raise HTTPException(
            status_code=400,
            detail="`student_profile` is required for the /advise endpoint.",
        )

    vsm = get_vector_store_manager()
    if not vsm.is_ready:
        raise HTTPException(
            status_code=503,
            detail="Vector store not ready. Call POST /api/v1/ingest first.",
        )

    _session_profiles[request.session_id] = request.student_profile

    question = request.message or "What courses should I register for this semester?"

    async def event_generator():
        try:
            generator = recommend_courses_stream(request.session_id, question, request.student_profile)
            async for chunk in generator:
                yield f"data: {chunk}\n\n"
        except Exception as exc:
            logger.exception("Advise stream error")
            yield f"data: [ERROR] {str(exc)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.delete(
    "/api/v1/session/{session_id}",
    tags=["Chat"],
    summary="Clear chat history for a session",
)
async def delete_session(session_id: str):
    clear_session(session_id)
    _session_profiles.pop(session_id, None)
    return {"status": "cleared", "session_id": session_id}


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug,
    )
