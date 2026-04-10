# 🎓 Academic Advisor Chatbot
### RAG-powered Course Recommendation System  
**Faculty of Computers & Information Technology – Future University Egypt**

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                             │
│                                                                    │
│  POST /api/v1/ingest ──► PDFProcessor ──► VectorStoreManager      │
│                           │                    │                   │
│                      pdfplumber            FAISS / Chroma          │
│                      tabula-py             (persisted to disk)     │
│                      camelot                                       │
│                                                                    │
│  POST /api/v1/chat ────► RAG Chain                                 │
│  POST /api/v1/advise ──► CourseAdvisorChain                        │
│                              │                                     │
│                    ┌─────────┴──────────┐                          │
│                    │                    │                          │
│              Retriever             GPT-4o-mini                     │
│            (MMR top-k)          (prompt-engineered)                │
│                    │                    │                          │
│             Handbook chunks      Structured answer                 │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
academic_advisor/
├── app/
│   ├── __init__.py
│   ├── config.py          # Settings from .env
│   ├── models.py          # Pydantic schemas (StudentProfile, etc.)
│   ├── pdf_processor.py   # PDF extraction: pdfplumber + tabula + camelot
│   ├── vector_store.py    # FAISS & Chroma vector store management
│   ├── prompts.py         # All LangChain prompt templates
│   ├── rag_chain.py       # LangChain RAG chain assembly
│   ├── ingest.py          # One-shot ingestion script
│   └── main.py            # FastAPI application
├── data/
│   └── handbook.pdf       # ← Place your PDF here
├── vectorstore/
│   ├── faiss_index/       # FAISS persisted index (auto-created)
│   └── chroma_db/         # ChromaDB persisted collection (auto-created)
├── notebooks/
│   └── exploration.ipynb  # Interactive testing
├── requirements.txt
├── .env.example
└── README.md
```

---

## ⚙️ Setup

### 1. Clone & install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** `tabula-py` requires **Java** installed on your system.  
> `camelot` requires **Ghostscript** for PDF rendering and **OpenCV** (`opencv-python`) for table detection.  
> On Windows, we avoid the `camelot-py[base]` extra because it pulls in `pdftopng>=0.2.3`, which isn’t available for Python 3.11.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your GOOGLE_API_KEY
```

### 3. Place your PDF

```bash
cp /path/to/handbook.pdf data/handbook.pdf
```

### 4. Ingest the PDF

```bash
python -m app.ingest
# or with rebuild flag:
python -m app.ingest --rebuild
```

This will:
- Extract all text and tables (pdfplumber → tabula → camelot)
- Split into ~800-token chunks with 150-token overlap
- Embed using `text-embedding-3-small`
- Persist to FAISS and/or Chroma

### 4.1 Manual prerequisite rules (recommended if PDF tables are messy)

If table extraction misses prerequisite rows, fill `data/manual_prerequisites.csv`.
These rows are injected into advising context and used as high-priority eligibility rules.

CSV columns:
- `course_code` (required)
- `course_name`
- `program` (e.g. `Computer Science`)
- `level` (e.g. `Freshman`, `Sophomore`)
- `semester` (`Fall` / `Spring` / `Summer`)
- `prerequisites` (comma-separated codes, e.g. `CSC122,CPS121`)
- `credits`

### 5. Start the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000/docs** for the interactive Swagger UI.

---

## 🔌 API Usage

### Health Check
```http
GET /api/v1/health
```

### Ingest PDF
```http
POST /api/v1/ingest
Content-Type: application/json

{
  "rebuild": false
}
```

### General Handbook Q&A
```http
POST /api/v1/chat
Content-Type: application/json

{
  "session_id": "user-123",
  "message": "What are the prerequisites for Data Structures?"
}
```

### Personalised Course Recommendation
```http
POST /api/v1/advise
Content-Type: application/json

{
  "session_id": "user-123",
  "message": "What courses should I register for this semester?",
  "student_profile": {
    "name": "Ahmed Ali",
    "program": "Computer Science",
    "level": "Sophomore",
    "cgpa": 2.8,
    "earned_hours": 36,
    "current_semester": "Fall",
    "passed_courses": [
      "ENG101","BMT111","BMT112","BPH111","CSC111","PSC110",
      "ENG102","BMT121","CSC121","CPS121","BMT122","CSC122",
      "CPS211","CSC211","BPH211","BMT212","BMT211"
    ],
    "currently_enrolled": ["CSC221"],
    "failed_courses": []
  }
}
```

**Example Response:**
```json
{
  "session_id": "user-123",
  "answer": "Based on your academic standing...\n\n| # | Code | Course Name | Credits | Prerequisites | Why Recommended |\n|...",
  "sources": ["data/handbook.pdf (p.35)", "data/handbook.pdf (p.36)"]
}
```

---

## 🧠 RAG Pipeline Details

### PDF Extraction Strategy

| Library | Purpose | When Used |
|---------|---------|-----------|
| `pdfplumber` | Text + basic tables | Always (primary) |
| `tabula-py` | Stream/lattice tables | Supplements pdfplumber |
| `camelot` | High-accuracy tables with lines | Optional (needs Ghostscript) |

### Vector Stores

| Store | Best For | Config |
|-------|---------|--------|
| **FAISS** | Fast in-memory similarity search | `VECTOR_STORE_TYPE=faiss` |
| **ChromaDB** | Persistent, metadata filtering | `VECTOR_STORE_TYPE=chroma` |
| **Both** | Redundancy + comparison | `VECTOR_STORE_TYPE=both` |

Both stores use **MMR (Maximal Marginal Relevance)** retrieval to balance relevance and diversity.

### Prompt Engineering

1. **System prompt** – Defines the advisor persona and 8 strict rules (prerequisites, credit limits, etc.)
2. **RAG template** – Injects retrieved handbook passages before the question
3. **Course advisor template** – Structured template for student profile → course recommendations
4. **Contextualise template** – Reformulates follow-up questions for standalone retrieval

---

## 🎛️ Key Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_MODEL` | `gemini-1.5-flash` | LLM model |
| `VECTOR_STORE_TYPE` | `chroma` | `faiss` / `chroma` / `both` |
| `CHUNK_SIZE` | `800` | Characters per chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `RETRIEVER_K` | `6` | Top-k chunks to retrieve |

---

## 📋 Supported Programs

| Code | Program |
|------|---------|
| CS | Computer Science |
| AI | Artificial Intelligence |
| CS_SEC | Cybersecurity |
| IS | Information Systems |
| DS | Data Science |

---

## 🔒 Academic Rules Enforced

- ✅ Prerequisites strictly checked
- ✅ Max credit hours: 15 / 18 / 21 based on CGPA  
- ✅ Summer semester capped at 9 CH
- ✅ Failed courses prioritised for re-registration
- ✅ Academic probation warning when CGPA < 2.0

---

## Repository

Published as [FueChat-bot](https://github.com/AbdelrahmanAyman208/FueChat-bot) on GitHub. See `LICENSE` (Apache-2.0).
