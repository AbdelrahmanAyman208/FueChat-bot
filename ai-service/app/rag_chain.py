"""
rag_chain.py  –  Updated for LangChain 0.2+ with Google Gemini
"""
from __future__ import annotations
import logging
import os
from typing import Optional

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import ChatHuggingFace, HuggingFacePipeline
from langchain_openai import ChatOpenAI

from app.config import settings
from app.models import StudentProfile
from app.prerequisites import build_manual_prereq_context
from app.prompts import (
    CONTEXTUALISE_Q_TEMPLATE,
    COURSE_ADVISOR_TEMPLATE,
    RAG_TEMPLATE,
)
from app.vector_store import get_vector_store_manager

logger = logging.getLogger(__name__)


# ── LLM ──────────────────────────────────────────────────────
def get_llm(temperature: float = 0.2):
    if settings.llm_provider == "google":
        if not settings.google_api_key:
            raise ValueError("GOOGLE_API_KEY is required for Google provider")
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            temperature=temperature,
            google_api_key=settings.google_api_key,
        )
    elif settings.llm_provider == "huggingface":
        if settings.hf_token:
            os.environ.setdefault("HUGGINGFACE_HUB_TOKEN", settings.hf_token)
        hf_pipeline = HuggingFacePipeline.from_model_id(
            model_id=settings.hf_model,
            task="text-generation",
            model_kwargs=(
                {"token": settings.hf_token} if settings.hf_token else {}
            ),
            pipeline_kwargs={
                "temperature": temperature,
                "max_new_tokens": 512,
                "do_sample": True,
            },
        )
        return ChatHuggingFace(llm=hf_pipeline)
    elif settings.llm_provider == "openrouter":
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY is required for OpenRouter provider")
        return ChatOpenAI(
            model=settings.openrouter_model,
            openai_api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            temperature=temperature,
            max_tokens=4096,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")


# ── Chat History Store ────────────────────────────────────────
_history_store: dict[str, list] = {}

def get_session_history(session_id: str) -> list:
    if session_id not in _history_store:
        _history_store[session_id] = []
    return _history_store[session_id]

def add_to_history(session_id: str, human_msg: str, ai_msg: str) -> None:
    history = get_session_history(session_id)
    history.append(HumanMessage(content=human_msg))
    history.append(AIMessage(content=ai_msg))
    if len(history) > 20:
        _history_store[session_id] = history[-20:]

def clear_session(session_id: str) -> None:
    _history_store.pop(session_id, None)


# ── Format Documents Helper ───────────────────────────────────
def format_docs(docs) -> str:
    return "\n\n---\n\n".join(d.page_content for d in docs)


def _dedupe_docs(docs: list) -> list:
    seen = set()
    unique = []
    for doc in docs:
        key = (doc.page_content or "").strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(doc)
    return unique


# ── General RAG Chain ─────────────────────────────────────────
def build_rag_chain():
    vsm = get_vector_store_manager()
    retriever = vsm.get_retriever()
    llm = get_llm()

    # Step 1: Rewrite question to be standalone
    def contextualize_question(inputs):
        history = inputs.get("chat_history", [])
        question = inputs["question"]
        if not history:
            return question
        chain = CONTEXTUALISE_Q_TEMPLATE | llm | StrOutputParser()
        return chain.invoke({"chat_history": history, "question": question})

    # Step 2: Retrieve + answer
    def rag_answer(inputs):
        standalone_q = contextualize_question(inputs)
        docs = retriever.invoke(standalone_q)
        context = format_docs(docs)
        chain = RAG_TEMPLATE | llm | StrOutputParser()
        answer = chain.invoke({
            "context": context,
            "chat_history": inputs.get("chat_history", []),
            "question": inputs["question"],
        })
        return {"answer": answer, "context": docs}

    return RunnableLambda(rag_answer)


# ── Course Advisor Chain ──────────────────────────────────────
def build_advisor_chain():
    llm = get_llm(temperature=0.1)
    return COURSE_ADVISOR_TEMPLATE | llm | StrOutputParser()


# ── Public Inference Functions ────────────────────────────────
async def answer_question(session_id: str, question: str) -> dict:
    chain = build_rag_chain()
    history = get_session_history(session_id)

    result = await chain.ainvoke({
        "question": question,
        "chat_history": history,
    })

    answer = result.get("answer", "")
    sources = [
        doc.metadata.get("source", "")
        for doc in result.get("context", [])
    ]
    add_to_history(session_id, question, answer)
    return {"answer": answer, "sources": list(set(sources))}


async def recommend_courses(
    session_id: str,
    question: str,
    profile: StudentProfile,
) -> dict:
    vsm = get_vector_store_manager()
    # Use broader, question-aware retrieval to capture study-plan tables and
    # prerequisite rows that may be missed by a single narrow query.
    retriever = vsm.get_retriever(k=16)
    queries = [
        (
            f"{profile.program.value} program level {profile.level.value} "
            f"{profile.current_semester.value} semester study plan courses "
            f"course code prerequisites credit hours"
        ),
        (
            f"{profile.program.value} curriculum handbook mandatory elective "
            f"prerequisite table level {profile.level.value}"
        ),
        question or "",
    ]
    all_docs = []
    for q in queries:
        if q.strip():
            all_docs.extend(await retriever.ainvoke(q))
    docs = _dedupe_docs(all_docs)[:24]
    context = format_docs(docs)
    manual_rules = build_manual_prereq_context(profile)
    if manual_rules:
        context = f"{context}\n\n---\n\n{manual_rules}"

    chain = build_advisor_chain()
    result = await chain.ainvoke({
        "name": profile.name or "Student",
        "program": profile.program.value,
        "level": profile.level.value,
        "cgpa": profile.cgpa,
        "earned_hours": profile.earned_hours,
        "current_semester": profile.current_semester.value,
        "max_hours": profile.max_hours_allowed,
        "passed_courses": ", ".join(profile.passed_courses) or "None",
        "currently_enrolled": ", ".join(profile.currently_enrolled) or "None",
        "failed_courses": ", ".join(profile.failed_courses) or "None",
        "context": context,
        "question": question,
    })

    sources = [
        doc.metadata.get("source", "")
        for doc in docs
    ]
    add_to_history(session_id, question, result)
    return {"answer": result, "sources": list(set(sources))}