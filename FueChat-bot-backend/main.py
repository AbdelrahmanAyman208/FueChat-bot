"""
main.py
=======
FastAPI application – Academic Advisor Chatbot API.

Endpoints:
  POST /api/v1/ingest          – Ingest PDF into vector stores
  POST /api/v1/chat            – General handbook Q&A
  POST /api/v1/advise          – Personalised course recommendations
  DELETE /api/v1/session/{id}  – Clear chat history
  POST /api/v1/transcribe      – Speech-to-text transcription
  GET  /api/v1/health          – Health check
  GET  /docs                   – Swagger UI
"""

from __future__ import annotations

import io
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile, status
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
                # SSE format requires single line payloads. Escape newlines.
                safe_chunk = chunk.replace("\n", "\\n")
                yield f"data: {safe_chunk}\n\n"
        except Exception as exc:
            logger.exception("Chat stream error")
            yield f"data: [ERROR] {str(exc)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


from fastapi import Form
import json
from app.file_extractor import extract_text_from_file

@app.post(
    "/api/v1/chat/upload",
    tags=["Chat"],
    summary="Chat with file upload (Streaming)",
)
async def chat_with_upload(
    session_id: str = Form(...),
    message: str = Form(""),
    student_profile: str = Form(None),
    file: UploadFile = File(...)
):
    vsm = get_vector_store_manager()
    if not vsm.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector store not ready. Call POST /api/v1/ingest first.",
        )

    # Parse profile
    profile_obj = None
    if student_profile and student_profile != "undefined":
        try:
            from app.models import StudentProfile
            profile_dict = json.loads(student_profile)
            profile_obj = StudentProfile(**profile_dict)
            _session_profiles[session_id] = profile_obj
        except Exception as e:
            logger.warning(f"Failed to parse student_profile json: {e}")

    profile = _session_profiles.get(session_id)

    # Extract text from file
    file_bytes = await file.read()
    file_context = extract_text_from_file(file_bytes, file.filename, file.content_type)
    
    logger.info(f"Extracted {len(file_context)} chars from {file.filename}")

    async def event_generator():
        try:
            if profile:
                generator = recommend_courses_stream(session_id, message, profile, file_context)
            else:
                generator = answer_question_stream(session_id, message, file_context)

            async for chunk in generator:
                safe_chunk = chunk.replace("\n", "\\n")
                yield f"data: {safe_chunk}\n\n"
        except Exception as exc:
            logger.exception("Upload chat stream error")
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
                safe_chunk = chunk.replace("\n", "\\n")
                yield f"data: {safe_chunk}\n\n"
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


@app.post(
    "/api/v1/transcribe",
    tags=["Utility"],
    summary="Transcribe audio (WAV) to text",
)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accept a WAV audio file and return the transcribed text.
    Uses Google's free Speech Recognition API.
    """
    import speech_recognition as sr

    try:
        audio_bytes = await audio.read()
        if len(audio_bytes) < 100:
            raise HTTPException(status_code=400, detail="Audio file is too small or empty.")

        # Write to a temp WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        recognizer = sr.Recognizer()
        with sr.AudioFile(tmp_path) as source:
            audio_data = recognizer.record(source)

        # Clean up temp file
        try:
            Path(tmp_path).unlink()
        except Exception:
            pass

        # Transcribe using Google's free API
        text = recognizer.recognize_google(audio_data)
        logger.info(f"Transcription result: {text[:80]}...")
        return {"text": text}

    except sr.UnknownValueError:
        return {"text": "", "error": "Could not understand audio. Please try again."}
    except sr.RequestError as exc:
        logger.error(f"Speech recognition service error: {exc}")
        raise HTTPException(status_code=503, detail=f"Speech recognition service unavailable: {exc}")
    except Exception as exc:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=str(exc))


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
