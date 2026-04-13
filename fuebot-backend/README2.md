# 🤖 FueBot — Full System Guide

### Running the Node.js Backend + Python AI Chatbot Together

---

## 📋 Overview

FueBot is a **two-server system** that provides AI-powered academic advising for students at the Faculty of Computers & Information Technology, Future University Egypt.

| Server | Technology | Port | Purpose |
|--------|-----------|------|---------|
| **Node.js Backend** | Express + PostgreSQL | `5000` | Authentication, student management, chat routing, course CRUD |
| **Python AI Service** | FastAPI + LangChain + ChromaDB | `8000` | RAG-powered AI advisor using handbook PDF + LLM |

### How They Work Together

```
Student (Frontend)
    │
    │  POST /chat/message { "message": "What should I take next?" }
    ▼
┌──────────────────────────────────────────────────────┐
│  Node.js Backend (port 5000)                         │
│  1. Authenticates student (session cookie)            │
│  2. Loads student profile from PostgreSQL             │
│     (name, GPA, major, completed courses, etc.)       │
│  3. Maps DB data → AI StudentProfile format           │
│     • major "CS" → "Computer Science"                 │
│     • credits earned → level (Freshman/Senior)        │
│  4. Sends to Python AI ──────────────────────────┐    │
│  5. Saves response to chat_history table         │    │
│  6. Returns AI response to student               │    │
└──────────────────────────────────────────────────┼────┘
                                                   │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  Python AI (port 8000)   │
                                    │                          │
                                    │  • Retrieves relevant    │
                                    │    handbook passages     │
                                    │    from ChromaDB         │
                                    │                          │
                                    │  • Sends to LLM with     │
                                    │    student profile +     │
                                    │    handbook context       │
                                    │                          │
                                    │  • Returns AI-generated  │
                                    │    advising response     │
                                    └──────────────────────────┘
```

> **Fallback:** If the Python AI server is down, the Node.js backend automatically falls back to a built-in keyword-based bot, so students always get an answer.

---

## ⚙️ Prerequisites

Before starting, make sure you have:

- **Node.js** v18+ and npm
- **Python** 3.10+ and pip
- **PostgreSQL** running on port 5432
- **Java** (required by tabula-py for PDF table extraction)
- **Ghostscript** (optional, for camelot PDF extraction)

---

## 🚀 Setup & Run (Step by Step)

### Step 1: Set Up the Database

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE fuebot_db;"

# Run the schema + seed data
psql -U postgres -d fuebot_db -f "FueBot-backend/db/FueBot.sql"
```

### Step 2: Configure the Node.js Backend

```bash
cd "FueBot-backend"

# Install dependencies
npm install

# Edit .env if needed (database credentials, AI service URL)
# Default settings:
#   PGDATABASE=fuebot_db
#   AI_SERVICE_URL=http://localhost:8000
#   AI_ENABLED=true
```

### Step 3: Configure the Python AI Service

```bash
cd "files (1)"

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Edit .env — set your LLM provider credentials:
#   LLM_PROVIDER=openrouter
#   OPENROUTER_API_KEY=your-key-here
#   PDF_PATH=data/handbook.pdf
```

### Step 4: Ingest the Handbook PDF (one-time setup)

The AI needs to process the handbook PDF into a vector store before it can answer questions.

```bash
# Make sure the PDF is at: files (1)/data/handbook.pdf
# Then run the ingestion:
cd "files (1)"
python -m app.ingest
```

Or via the API after starting the server:
```
POST http://localhost:8000/api/v1/ingest
Content-Type: application/json

{ "rebuild": false }
```

### Step 5: Start Both Servers

**Terminal 1 — Python AI Service:**
```bash
cd "files (1)"
python main.py
# → Running on http://0.0.0.0:8000
```

**Terminal 2 — Node.js Backend:**
```bash
cd "FueBot-backend"
npm run dev
# → 🚀 FueBot server running on port 5000
```

> ⚠️ **Start the Python AI server FIRST**, then the Node.js backend. This ensures the AI is ready when the backend starts making requests.

---

## 🧪 Testing the Integration

### Quick Test (Automated)

Run the included test script that verifies the full flow:

```bash
cd "FueBot-backend"
node test_ai_integration.js
```

Expected output:
```
═══════════════════════════════════════════════════
  FueBot + AI Integration Test
═══════════════════════════════════════════════════

1️⃣  Node.js health check...
   ✅ Node.js backend is running

2️⃣  Logging in as hassan@example.com...
   ✅ Logged in as: Hassan Amr (student)

3️⃣  Checking AI service status...
   AI Available: true
   Vector Store Ready: true
   ✅ AI service is online

4️⃣  Sending chat message: "What courses should I take next?"
   ✅ Chat message processed successfully

5️⃣  Sending general question: "What are the prerequisites for CS201?"
   ✅ General question processed successfully

6️⃣  Checking chat history...
   ✅ Chat history retrieved

═══════════════════════════════════════════════════
  ✅ All tests passed!
═══════════════════════════════════════════════════
```

### Manual Testing with Postman

#### 1. Login

```
POST http://localhost:5000/auth/login
Content-Type: application/json

{
  "email": "hassan@example.com",
  "password": "student123"
}
```

> 💡 Save the session cookie that comes back — you'll need it for all subsequent requests.

#### 2. Check AI Status

```
GET http://localhost:5000/chat/ai-status
Cookie: connect.sid=<your-session-cookie>
```

Response:
```json
{
  "available": true,
  "vectorStoreReady": true,
  "llmProvider": "openrouter",
  "model": "nvidia/nemotron-3-super-120b-a12b:free"
}
```

#### 3. Send a Chat Message (AI-Powered)

```
POST http://localhost:5000/chat/message
Content-Type: application/json
Cookie: connect.sid=<your-session-cookie>

{
  "message": "What courses should I take next semester?"
}
```

Response:
```json
{
  "chatId": 1,
  "userMessage": "What courses should I take next semester?",
  "botResponse": "Based on your academic profile, here are the courses...",
  "timestamp": "2026-04-12T21:00:50.000Z"
}
```

#### 4. Try Different Questions

| Question Type | Example | AI Endpoint Used |
|--------------|---------|-----------------|
| **Course advising** | "What should I take next?" | `/api/v1/advise` (with full student profile) |
| **Course advising** | "Can I take CS201?" | `/api/v1/advise` (with full student profile) |
| **Course advising** | "Recommend courses for me" | `/api/v1/advise` (with full student profile) |
| **General Q&A** | "What is the GPA requirement?" | `/api/v1/chat` (with student profile) |
| **General Q&A** | "Tell me about the CS program" | `/api/v1/chat` (with student profile) |
| **General Q&A** | "What are the graduation requirements?" | `/api/v1/chat` (with student profile) |

#### 5. View Chat History

```
GET http://localhost:5000/chat/history
Cookie: connect.sid=<your-session-cookie>
```

#### 6. Clear Chat History

```
DELETE http://localhost:5000/chat/history
Cookie: connect.sid=<your-session-cookie>
```

### Testing the Fallback

To verify the keyword-based fallback works when the AI is down:

1. **Stop the Python AI server** (Ctrl+C in Terminal 1)
2. Send a message: `POST /chat/message { "message": "hello" }`
3. You should get a keyword-based greeting response with your profile info
4. The Node.js server logs will show: `[AI] AI service error (falling back to keyword bot)`

---

## 🔧 Configuration Reference

### Node.js Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PGDATABASE` | `fuebot_db` | PostgreSQL database name |
| `PGPASSWORD` | — | PostgreSQL password |
| `PORT` | `5000` | Node.js server port |
| `SESSION_SECRET` | — | Express session secret key |
| `AI_SERVICE_URL` | `http://localhost:8000` | Python AI server URL |
| `AI_SERVICE_TIMEOUT` | `60000` | AI request timeout (ms). Increase for slow LLMs |
| `AI_ENABLED` | `true` | Set to `false` to disable AI entirely |

### Python AI Service (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `openrouter` | `google` \| `huggingface` \| `openrouter` |
| `OPENROUTER_API_KEY` | — | API key for OpenRouter |
| `OPENROUTER_MODEL` | `nvidia/nemotron-3-super-120b-a12b:free` | LLM model to use |
| `VECTOR_STORE_TYPE` | `chroma` | `faiss` \| `chroma` \| `both` |
| `PDF_PATH` | `data/handbook.pdf` | Path to the handbook PDF |
| `API_PORT` | `8000` | Python server port |

---

## 🗂️ Project Structure (Combined)

```
FueBot-backend/
├── server.js                    # Express app entry point
├── config/
│   ├── db.js                    # PostgreSQL connection
│   └── session.js               # Session configuration
├── controllers/
│   ├── authController.js        # Login, register, password reset
│   ├── chatController.js        # Chat + AI status endpoints
│   ├── courseController.js       # Course CRUD
│   ├── studentController.js     # Student profile
│   └── advisorController.js     # Advisor management
├── services/
│   ├── aiService.js             # ⭐ NEW — HTTP client to Python AI
│   ├── botService.js            # ⭐ MODIFIED — AI-first + keyword fallback
│   └── emailService.js          # Password reset emails
├── routes/
│   ├── authRoutes.js
│   ├── chatRoutes.js            # ⭐ MODIFIED — added /ai-status
│   ├── courseRoutes.js
│   ├── studentRoutes.js
│   └── advisorRoutes.js
├── middleware/
│   ├── authMiddleware.js        # Session auth + role checking
│   └── errorHandler.js
├── db/
│   └── FueBot.sql               # Full database schema + seed data
├── test_ai_integration.js       # ⭐ NEW — Integration test script
└── .env                         # ⭐ MODIFIED — added AI config

files (1)/  (Python AI Service)
├── main.py                      # FastAPI entry point
├── app/
│   ├── config.py                # Settings from .env
│   ├── models.py                # Pydantic schemas (StudentProfile)
│   ├── pdf_processor.py         # PDF text/table extraction
│   ├── vector_store.py          # FAISS & ChromaDB management
│   ├── rag_chain.py             # LangChain RAG pipeline
│   ├── prompts.py               # LLM prompt templates
│   ├── prerequisites.py         # Manual prerequisite rules
│   └── ingest.py                # PDF → vector store pipeline
├── data/
│   ├── handbook.pdf             # University handbook
│   └── manual_prerequisites.csv # Additional prerequisite rules
├── vectorstore/                 # Built by ingestion (auto-created)
├── requirements.txt             # Python dependencies
└── .env                         # LLM & vector store config
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| **AI responses are slow** | Free LLM models can take 10-30s. Increase `AI_SERVICE_TIMEOUT` in `.env` or use a paid model |
| **"Vector store not ready"** | Run `POST http://localhost:8000/api/v1/ingest` to build it from the handbook PDF |
| **"AI server not running"** | Make sure the Python server is started first: `python main.py` from the `files (1)` directory |
| **Login fails with seed users** | Run `node reset_test_pwd.js` to reset Hassan's password, or register a new student via `POST /auth/register` |
| **Bot gives keyword responses instead of AI** | Check `GET /chat/ai-status`. If AI is offline, start the Python server. If timeout, increase `AI_SERVICE_TIMEOUT` |
| **Port already in use** | Kill the process: `Get-NetTCPConnection -LocalPort 5000 \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |

---

## 📄 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Student | `hassan@example.com` | `student123` (after running `node reset_test_pwd.js`) |
| Student | Register a new one via `POST /auth/register` | — |
| Advisor | `ahmed.advisor@fue.edu.eg` | Check DB or reset via forgot password |
