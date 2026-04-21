# 🎓 FueBot: Academic Advisor Chatbot
### Full-Stack RAG System for University Course Recommendation

FueBot is an intelligent, full-stack Academic Advising application built for the Faculty of Computers & Information Technology. It combines a **React** frontend, a **Node.js/Express** backend for authentication and database management, and a **Python (FastAPI)** AI microservice that runs a Retrieval-Augmented Generation (RAG) pipeline to query the university handbook and generate personalized course recommendations.

---

## 🏗️ High-Level System Architecture

The application is built across three distinct layers. Here is how they interact:

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [1. React Client (Port 3000)]
        UI[Web Interface]
        Redux[Redux Store]
        UI -->|Dispatches Actions| Redux
    end

    %% Backend Layer
    subgraph Backend [2. Node.js Backend (Port 5000)]
        Auth[Auth Controller]
        DB[(PostgreSQL DB)]
        Proxy[AI Proxy & Fallback]
        
        Auth <--> DB
        Proxy <--> DB
    end

    %% AI Layer
    subgraph AILayer [3. Python FastAPI (Port 8000)]
        VectorStore[(Chroma / FAISS)]
        LLM((OpenRouter LLM))
        RAGChain[LangChain RAG Pipeline]
        
        RAGChain <--> VectorStore
        RAGChain <--> LLM
    end

    %% Flow
    Redux -->|HTTP POST JSON| Auth
    Redux -->|HTTP POST /api/chat| Proxy
    Proxy -->|REST API Call| RAGChain
```

---

## 🔄 The Data Flow: Step-by-Step

How does the bot take an input, process it, and generate an output? Here is the exact end-to-end pipeline:

### Phase 1: Input (The React Client)
1. **User Action:** The student opens the `/chat` page and types a query (e.g., *"What is summer training?"* or *"What courses should I register for?"*).
2. **State Management:** The React front-end (using Redux) captures the input, updates the UI timeline to show the user's message, and puts the `isLoading` state to `true`.
3. **API Request:** Redux dispatches an asynchronous call (`axios.post(/api/chat/message)`) to the Node.js backend, sending the `message` string and the current `sessionId`.

### Phase 2: Processing & Context Assembly (The Node.js Backend)
1. **Cookie Auth Check:** The backend middleware verifies the HTTP-Only JWT cookie. It extracts the `studentId`.
2. **Database Fetch:** The backend queries the **PostgreSQL** database to fetch the student's complete profile (CGPA, passed courses, current semester, academic level).
3. **Proxy Routing:** 
   - The backend checks if the AI service is enabled.
   - It formats a payload containing both the `message` and the `student_profile` and routes this to the **Python AI Microservice** (`http://localhost:8000/api/v1/advise` or `/cat`).

### Phase 3: The Brain (The Python RAG Pipeline)
1. **Query Reformulation:** LangChain takes the chat history and the new question, passing it to the LLM to rewrite the question into a standalone, context-free query (e.g., resolving pronouns).
2. **Vector Retrieval (ChromaDB):** 
   - The standalone query is converted into embeddings using a SentenceTransformer.
   - The system performs an MMR (Maximal Marginal Relevance) similarity search against the previously ingested `handbook.pdf` chunks.
   - It retrieves the top `K` most relevant handbook paragraphs and tables.
3. **Prompt Injection:** A massive prompt is constructed containing:
   - The **System Rules** (e.g., "Max hours is 21 if CGPA > 3.0").
   - The **Student Profile** passed from Node.js.
   - The **Retrieved Handbook Context**.
   - The actual **User Question**.
4. **LLM Generation:** The enriched prompt is sent to the LLM provider (e.g., OpenRouter / Meta Llama). The LLM reads the handbook context, considers the user's CGPA, and generates a confident, hallucination-free response formatted in Markdown (often containing a structured tabular schedule).

### Phase 4: Output Delivery
1. **Response Relay:** The Python script returns the Markdown text back to the Node.js backend.
2. **Database Logging:** Node.js saves both the user's prompt and the bot's response into the PostgreSQL `chat_history` table so it persists across sessions.
3. **Frontend Rendering:** The React UI receives the HTTP response, slices it into the Redux state, and the `ReactMarkdown` library renders the complex tables, lists, and bold text onto the screen beautifully.

> [!NOTE]
> **Fallback Mechanism:** If the Python server is offline, or if the LLM provider times out (e.g., an OpenRouter 524 Error), the Node.js backend catches the crash and gracefully falls back to a Hardcoded Keyword Bot. The user is told "I am currently offline, but here is a basic answer...", preventing a total UI crash!

---

## 📁 System Requirements & Tech Stack

### Frontend (User Interface)
- **Framework:** React 18 / TypeScript / Vite
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS (Custom Dark Theme, Flexbox-driven layouts)
- **Markdown:** `react-markdown` + `remark-gfm` for tables

### Backend (Business Logic & Auth)
- **Environment:** Node.js / Express.js
- **Database:** PostgreSQL (using `pg` driver)
- **Authentication:** JWT (JSON Web Tokens) stored securely in `httpOnly` cookies.

### AI Microservice (Advising Engine)
- **Framework:** FastAPI / Python 3.11+
- **Orchestration:** LangChain v0.2
- **Vector Store:** Chroma / FAISS (Local persistent embeddings)
- **Embeddings:** HuggingFace `all-MiniLM-L6-v2`
- **LLM Routing:** OpenRouter (`openai/gpt-oss-120b:free`, generic Meta-Llama, etc.)

---

## ⚙️ Running the Project

To run the full stack simultaneously, open three separate terminal windows:

### 1. The Database
Ensure PostgreSQL is running locally on port `5432` with a database named `fuebot` matching your `backend/.env` credentials.

### 2. The Python AI Server
Ensure your `OPENROUTER_API_KEY` is set in the `.env` file at the root.
```bash
# In the root folder
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. The Node.js Backend
Ensure your database credentials are right.
```bash
cd fuebot-backend
npm install
npm start
```
*(Runs on `http://localhost:5000`)*

### 4. The React Frontend
```bash
cd frontend/frontend
npm install
npm start
```
*(Runs on `http://localhost:3000`)*

---

## 🔧 AI Ingestion (One-Time Setup)
Before the bot can answer questions, it has to "read" the handbook.
Place your `handbook.pdf` inside the `data/` folder, and trigger the ingestion script via the swagger ui or explicitly running:
```bash
python -m app.ingest
```
This extracts text using `pdfplumber`, detects tables, chunks them, and stores the numerical vectors in the `vectorstore/` folder permanently.

---
## 🔒 Security & Roles
The backend strictly enforces endpoints using JWT.
- **Students:** Can query the bot and receive unique course advising tied to their DB CGPA.
- **Advisors:** Bypassed from the bot. They have a dashboard to view the CGPA and history of all students assigned to them. Route guards heavily protect cross-contamination.
