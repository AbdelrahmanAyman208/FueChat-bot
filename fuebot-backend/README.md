# FueBot Backend — API Documentation

Node.js + Express + PostgreSQL academic advisor chatbot backend for FUE University.  
Supports **two roles**: `student` and `advisor` — login auto-detects the role.

---

## 🚀 Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Create the database and seed it
psql -U postgres -c "CREATE DATABASE fuebot_db;"
psql -U postgres -d fuebot_db -f db/FueBot.sql

# 4. Start the server
npm start
```

### Seed Accounts (from `db/FueBot.sql`)

| Role | Email | Password |
|------|-------|----------|
| Student | `hassan@example.com` | `student123` |
| Student | `yahya@example.com` | `student123` |
| Student | `mostafa@example.com` | `student123` |
| Advisor | `ahmed.advisor@fue.edu.eg` | `advisor123` |
| Advisor | `sara.advisor@fue.edu.eg` | `advisor123` |

---

## 📁 Project Structure

```
FueBot-backend/
├── server.js                  # App entry point
├── db/
│   └── FueBot.sql             # Full database schema + seed data
├── config/
│   ├── db.js                  # PostgreSQL pool
│   └── session.js             # express-session config
├── controllers/
│   ├── authController.js      # register, login, logout (both roles)
│   ├── advisorController.js   # advisor dashboard & student management
│   ├── chatController.js      # send message, get/clear history
│   ├── courseController.js    # list, enroll, update status
│   └── studentController.js   # profile view & update
├── middleware/
│   ├── authMiddleware.js      # session auth guard + requireRole()
│   ├── validate.js            # request body validation
│   └── errorHandler.js        # global error handler
├── routes/
│   ├── authRoutes.js          # /auth/*
│   ├── advisorRoutes.js       # /advisor/*  (advisor-only)
│   ├── chatRoutes.js          # /chat/*     (student-only)
│   ├── courseRoutes.js        # /courses/*
│   └── studentRoutes.js      # /student/*  (student-only)
├── services/
│   └── botService.js          # Bot brain — NL → DB queries
└── test_advisor.js            # API test suite (20 tests)
```

---

## 🔑 Auth Routes — `/auth`

| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| POST | `/auth/register` | ❌ | Register new student |
| POST | `/auth/register/advisor` | ❌ | Register new advisor |
| POST | `/auth/login` | ❌ | Login (auto-detects student or advisor) |
| POST | `/auth/logout` | ❌ | Destroy session |
| POST | `/auth/change-password` | ✅ | Change password (both roles) |
| GET  | `/auth/me` | ✅ | Get logged-in user info + role |

### POST `/auth/register` (student)
```json
{
  "firstName": "Hassan",
  "lastName": "Amr",
  "email": "hassan@fue.edu.eg",
  "password": "secret123",
  "major": "CS",
  "gpa": 3.4
}
```

### POST `/auth/register/advisor`
```json
{
  "firstName": "Dr. Ahmed",
  "lastName": "Hassan",
  "email": "ahmed@fue.edu.eg",
  "password": "advisor123",
  "department": "CS"
}
```

### POST `/auth/login`
```json
{ "email": "hassan@example.com", "password": "student123" }
```
**Response** (role is included):
```json
{
  "message": "Logged in successfully",
  "user": {
    "id": 1,
    "email": "hassan@example.com",
    "name": "Hassan Amr",
    "major": "CS",
    "role": "student"
  }
}
```

---

## 🎓 Advisor Routes — `/advisor` *(requires advisor login)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/advisor/profile` | Advisor profile + student count |
| GET | `/advisor/students/all` | List all students in the system |
| GET | `/advisor/students` | List assigned students |
| GET | `/advisor/students/:studentId` | Student full details + courses |
| POST | `/advisor/students/:studentId/assign` | Assign student to this advisor |
| PATCH | `/advisor/students/:studentId/profile` | Update student GPA or major |
| POST | `/advisor/students/:studentId/enroll` | Enroll student in a course |
| PATCH | `/advisor/students/:studentId/course/:courseCode` | Update student's course status |

### GET `/advisor/students/1` Response:
```json
{
  "student": {
    "student_id": 1,
    "first_name": "Hassan",
    "last_name": "Amr",
    "gpa": "3.40",
    "major": "CS",
    "degree_description": "Computer Science BSc 2024 plan",
    "credits_needed": 120,
    "credits_earned": 6,
    "credits_remaining": 114
  },
  "courses": {
    "completed": [
      { "code": "CS101", "name": "Intro to CS", "credits": 3, "status": "completed" }
    ],
    "in_progress": [
      { "code": "CS102", "name": "Data Structures", "credits": 3, "status": "in_progress" }
    ],
    "planned": []
  }
}
```

### PATCH `/advisor/students/1/course/CS102`
```json
{ "status": "completed" }
```

### POST `/advisor/students/1/enroll`
```json
{ "courseCode": "CS201", "status": "planned" }
```

### PATCH `/advisor/students/1/profile`
```json
{ "gpa": 3.6, "major": "CS" }
```

---

## 💬 Chat Routes — `/chat` *(requires student login)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/welcome` | Personalized greeting after login |
| POST | `/chat/message` | Send a message, get bot response |
| GET  | `/chat/history` | Get chat history (supports `?limit=50&offset=0`) |
| DELETE | `/chat/history` | Clear all chat history |

### POST `/chat/message`
```json
{ "message": "Can I take CS201?" }
```
**Response:**
```json
{
  "chatId": 12,
  "userMessage": "Can I take CS201?",
  "botResponse": "❌ You cannot yet take CS201. You still need to complete:\n• CS102 — Data Structures",
  "timestamp": "2026-04-08T20:07:00.000Z"
}
```

### Bot understands these natural language questions:
- `"What are my completed courses?"`
- `"What courses am I taking?"`
- `"What are the prerequisites for CS201?"`
- `"Can I take MATH102?"`
- `"What courses can I take next?"`
- `"What is my GPA?"`
- `"What are my degree requirements?"`
- `"Tell me about CS101"`
- `"help"`

---

## 📚 Course Routes — `/courses`

| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| GET | `/courses` | ❌ | List all courses |
| GET | `/courses/:code` | ❌ | Get course + prerequisites |
| GET | `/courses/student/enrolled` | ✅ student | Student's courses by status |
| POST | `/courses/student/enroll` | ✅ student | Enroll in a course |
| PATCH | `/courses/student/:code/status` | ✅ student | Update course status |

### POST `/courses/student/enroll`
```json
{ "courseCode": "CS201", "status": "planned" }
```

### PATCH `/courses/student/CS201/status`
```json
{ "status": "completed" }
```
Status values: `completed` | `in_progress` | `planned`

---

## 👤 Student Routes — `/student` *(requires student login)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/student/profile` | Full profile + degree progress |
| PATCH | `/student/profile` | Update GPA or major |

### GET `/student/profile` Response:
```json
{
  "profile": {
    "student_id": 1,
    "first_name": "Hassan",
    "last_name": "Amr",
    "email": "hassan@example.com",
    "gpa": "3.40",
    "major": "CS",
    "degree_description": "Computer Science BSc 2024 plan",
    "credits_needed": 120,
    "credits_earned": 9
  }
}
```

---

## 🗄️ Database Schema

```
degree_requirement     advisor                student
├── req_id (PK)        ├── advisor_id (PK)    ├── student_id (PK)
├── description        ├── first_name         ├── first_name
├── major              ├── last_name          ├── last_name
├── credits_needed     ├── email (UNIQUE)     ├── email (UNIQUE)
├── is_active          ├── password           ├── password
└── effective_date     └── department         ├── gpa
                                              ├── major
course                 course_prerequisite    ├── req_id → degree_requirement
├── course_id (PK)     ├── course_id (PK,FK)  └── advisor_id → advisor
├── code (UNIQUE)      └── prereq_course_id
├── name                   (PK,FK)           student_course
├── description                              ├── student_id (PK,FK)
├── credits            chat_history          ├── course_id (PK,FK)
├── instructor         ├── chat_id (PK)      └── status
└── semester           ├── student_id (FK)
                       ├── user_message
                       ├── bot_response
                       ├── session_status
                       └── timestamp
```

---

## 🛡️ Security Features

- **Helmet** — sets secure HTTP headers
- **CORS** — restricts to your frontend URL only
- **Rate Limiting** — 100 req/15min globally
- **Session cookies** — `httpOnly`, `secure` (prod), `sameSite: lax`
- **bcrypt** — passwords hashed with salt rounds = 10
- **Role-based access** — `requireRole('student')` / `requireRole('advisor')` guards
- **Input validation** — all POST bodies validated before hitting DB
- **Global error handler** — catches Postgres errors + unhandled exceptions

---

## 🧪 Running Tests

```bash
# Make sure server is running first
npm start

# In another terminal
node test_advisor.js
```

Expected output: `20 passed, 0 failed`

---

## ⚠️ Remaining Improvements (Next Steps)

1. **Email verification** on register (nodemailer)
2. **Password reset** via email token
3. **Admin role** — CRUD for courses and degree requirements
4. **Persistent sessions** — store in DB (connect-pg-simple) instead of memory
5. **WebSocket / Socket.IO** — real-time chat streaming