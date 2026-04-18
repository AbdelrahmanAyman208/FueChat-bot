# FueChat Bot Ecosystem

FueChat Bot is an integrated academic advising system tailored for students and academic advisors. The system provides role-based portal access, automated schedule generation, and a powerful RAG (Retrieval-Augmented Generation) chatbot for instant advising answers based on the university's academic handbook.

## Ecosystem Architecture

The project consists of three main microservices:

### 1. Backend API (`fuebot-backend/`)
- **Technology:** Node.js with Express.
- **Database:** PostgreSQL.
- **Purpose:** Acts as the central hub. It authenticates users (Advisors and Students) securely via HTTP-only session cookies. It serves the REST API for student profile management, course registrations, dynamic schedule group assignments (e.g. for Level 8), and advisor approvals.
- **Key Files:** `server.js` (entry point), `controllers/` (business logic for auth, chat, student, advisor pipelines), `db/FueBot.sql` (database schema).

### 2. Custom AI Service (`ai-service/`)
- **Technology:** Python using LangChain, FAISS, and HuggingFace models.
- **Purpose:** Embeds and queries the University Academic Advising Handbook. When a student asks a complex advising question, the Node.js backend fetches the student's academic profile (GPA, earned credits, passed courses) and delegates the query to this Python service via a REST POST call to `/api/v1/chat` or `/api/v1/advise`. The LLM intelligently incorporates the handbook's constraints alongside the student's exact standing to produce highly personalized curriculum advice.
- **Key Files:** `main.py` (FastAPI entry point), `app/prompts.py` (strict rules engine for level 8 limitations, and response formatting), `ingest.py` (script to vectorize new PDFs into FAISS).

### 3. Frontend App (`frontend/`)
- **Technology:** React.js written in TypeScript with Tailwind CSS formatting.
- **Purpose:** The user interface for both advisors and students. It dynamically renders different features dynamically based on the session role: 
  - *Students*: Can chat seamlessly with the FueBot, check their academic progress against total required credits, and request their graduation-term schedule.
  - *Advisors*: Can log in, review a list of assigned students, inspect their completed courses, assign new courses, and approve submitted schedule requests.
- **Key Files:** `src/features/chat/ChatPage.tsx` (real-time markdown UI for chatbot), `src/features/advisor/` (manage student records), `src/features/profile/` (renders specific profiles per user role).

---

## Technical Specifications

- **Database Credentials**: PostgreSQL runs on port `5432` with database `fuebot_db`.
- **Node Server**: Runs on `http://localhost:5000`. Environment secrets (like email SMTP and DB strings) are configured in the `.env`.
- **Python Fast API**: Runs internally on `http://127.0.0.1:8000`.
- **React Frontend**: Development server accessible on `http://localhost:3000`.

---

## How to Run the Ecosystem

### Step 1: Initialize Database
```bash
# Apply the SQL schema (if not previously applied)
psql -U postgres -d fuebot_db -f FueChat-bot-backend/fuebot-backend/db/FueBot.sql
```

### Step 2: Start the Python AI Service
```bash
cd ai-service

# Note: You must activate the python virtual environment where dependencies (langchain, fastapi, torch) are installed. 
# Depending on your setup:
./venv/Scripts/activate

# Execute the FastAPI server
python app/main.py
```

### Step 3: Start the Node.js Backend Server
Open a new terminal window:
```bash
cd FueChat-bot-backend/fuebot-backend

# Install packages if missing
npm install

# Start the server (ensure .env is properly filled out)
npm start
```

### Step 4: Start the React Frontend
Open a new terminal window:
```bash
cd frontend

# Install UI packages
npm install

# Build and start the development server
npm start
```

Your system is now online! Navigate your browser to `http://localhost:3000` to interact with FueBot.
