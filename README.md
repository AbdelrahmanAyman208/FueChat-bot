# FueBot — Academic Advisor Chatbot Ecosystem

FueBot is an comprehensive, AI-powered system designed to assist students and academic advisors with degree planning, prerequisite checking, and personalized curriculum insights based on real handbook rules and context-aware profiles.

The ecosystem is split into three main components:
1. **Node.js Backend**: Handles authentication, role-based access control, PostgreSQL database interactions, and proxies requests.
2. **React Frontend**: Provides distinct dashboard interfaces for both `Students` and `Advisors`.
3. **Python AI Service (RAG)**: A FastAPI microservice powering the semantic document retrieval and generative AI chatbot.

---

## 1. Directory Structure

```
FueChat-bot-backend/
├── backend/       # Node.js Express server
├── frontend/      # React + TypeScript SPA
├── ai-service/    # Python FastAPI + LangChain + ChromaDB RAG microservice
└── README.md
```

*(Note: Ensure you are in the corresponding directory when installing dependencies and starting services.)*

---

## 2. Node.js Backend

The backend is built with Express.js and interfaces with a PostgreSQL relational database. It manages student academic profiles, advisor assignments, course catalogs, and role-based access.

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (Listening on port 5432)

### Setup & Run

1. **Database Setup**:
   - Create a PostgreSQL database named `fuebot_db`.
   - Run the initial seed script located at `backend/db/FueBot.sql` to generate tables and seed initial data.
   ```sql
   psql -U postgres -d fuebot_db -f backend/db/FueBot.sql
   ```

2. **Environment Variables Configured in `backend/.env`**:
   ```env
   PGUSER=postgres
   PGHOST=localhost
   PGDATABASE=fuebot_db
   PGPASSWORD=your_password
   PGPORT=5432
   SESSION_SECRET=fuechatbot_super_secret_key
   PORT=5000
   CLIENT_URL=http://localhost:3000
   AI_SERVICE_URL=http://localhost:8000
   ```

3. **Install & Start**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   *The server runs on `http://localhost:5000`.*

---

## 3. Python AI Service (RAG)

The AI Microservice manages the intelligence of the system. It ingests the university handbook using PyPDF/Tabula into a local ChromaDB vector store, processing and returning LLM responses via the OpenRouter API.

### Prerequisites
- Python 3.9+
- OpenRouter API Key
- Java (Required for Tabula-py to extract PDF tabular data)

### Setup & Run

1. **Environment Configured in `ai-service/.env`**:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key
   OPENROUTER_MODEL=openrouter/auto  # OR meta-llama/llama-3.3-70b-instruct:free
   PORT=8000
   ```

2. **Create Virtual Environment & Install Dependencies**:
   ```bash
   cd ai-service
   python -m venv rag_env
   source rag_env/Scripts/activate  # On Windows: .\rag_env\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Ingest Documents & Start**:
   Make sure the `files/Handbook_2024.pdf` is present.
   ```bash
   python main.py
   ```
   *The FastAPI server runs on `http://localhost:8000`.*

---

## 4. React Frontend

The single-page application is built using React, TypeScript, Redux Toolkit, and Tailwind CSS. It communicates securely via cookies with the Node.js backend to provide specialized tools for students and advisors.

### Prerequisites
- Node.js

### Setup & Run

1. **Environment Configured in `frontend/.env`**:
   ```env
   REACT_APP_API_BASE_URL=http://localhost:5000
   ```

2. **Install & Start**:
   ```bash
   cd frontend
   npm install
   npm start
   ```
   *The React development server runs on `http://localhost:3000`.*

---

## 5. Usage & Test Accounts

Once all three services are running concurrently, access `http://localhost:3000` in your browser.

- **Student Testing**:
  - Email: `hassan@fue.edu.eg`
  - Password: `student123`
- **Advisor Testing**:
  - Email: `ahmed.advisor@fue.edu.eg`
  - Password: `advisor123`
