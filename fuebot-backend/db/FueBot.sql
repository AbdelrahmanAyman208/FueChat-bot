-- ============================================================
-- FueBot Database — Full Initialization Script
-- Run this on a fresh database to set up everything at once.
--
-- Usage:
--   psql -U postgres -d fuebot_db -f db/FueBot.sql
-- ============================================================


-- ══════════════════════════════════════════════════════════════
-- 1. CORE TABLES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE degree_requirement (
    req_id          SERIAL PRIMARY KEY,
    description     TEXT NOT NULL,
    major           VARCHAR(100) NOT NULL,		-- e.g. 'IS', 'CS', 'DM'
    credits_needed  INTEGER      NOT NULL CHECK (credits_needed > 0),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    effective_date  DATE         NOT NULL
);

CREATE TABLE advisor (
    advisor_id   SERIAL PRIMARY KEY,
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    department   VARCHAR(100) NOT NULL   -- e.g. 'CS', 'IS', 'DM'
);

CREATE TABLE student (
    student_id   SERIAL PRIMARY KEY,
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    gpa          NUMERIC(3,2) CHECK (gpa BETWEEN 0 AND 4.00),
    major        VARCHAR(100) NOT NULL,
    req_id       INTEGER      REFERENCES degree_requirement(req_id)
                               ON UPDATE CASCADE ON DELETE SET NULL,
    advisor_id   INTEGER      REFERENCES advisor(advisor_id)
                               ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE course (
    course_id     SERIAL PRIMARY KEY,
    code          VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    credits       INTEGER      NOT NULL CHECK (credits > 0),
    instructor    VARCHAR(255),
    semester      VARCHAR(50)
);

CREATE TABLE course_prerequisite (
    course_id        INTEGER NOT NULL,
    prereq_course_id INTEGER NOT NULL,
    PRIMARY KEY (course_id, prereq_course_id),
    FOREIGN KEY (course_id)
        REFERENCES course(course_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (prereq_course_id)
        REFERENCES course(course_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE TABLE student_course (
    student_id  INTEGER NOT NULL REFERENCES student(student_id)
                           ON UPDATE CASCADE ON DELETE CASCADE,
    course_id   INTEGER NOT NULL REFERENCES course(course_id)
                           ON UPDATE CASCADE ON DELETE RESTRICT,
    status      VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                   CHECK (status IN ('completed', 'in_progress', 'planned')),
    PRIMARY KEY (student_id, course_id)
);

CREATE TABLE chat_history (
    chat_id        SERIAL PRIMARY KEY,
    student_id     INTEGER NOT NULL REFERENCES student(student_id)
                              ON UPDATE CASCADE ON DELETE CASCADE,
    user_message   TEXT NOT NULL,
    bot_response   TEXT,
    session_status VARCHAR(50),
    timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_token (
    token_id    SERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('student', 'advisor')),
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- 2. SEED DATA — Degree Requirements
-- ══════════════════════════════════════════════════════════════

INSERT INTO degree_requirement (description, major, credits_needed, effective_date)
VALUES
  ('Computer Science BSc 2024 plan', 'CS', 120, '2024-09-01'),
  ('Information Systems BSc 2024 plan', 'IS', 120, '2024-09-01');


-- ══════════════════════════════════════════════════════════════
-- 3. SEED DATA — Advisors  (password: advisor123)
-- ══════════════════════════════════════════════════════════════

INSERT INTO advisor (first_name, last_name, email, password, department)
VALUES
  ('Dr. Ahmed', 'Hassan', 'ahmed.advisor@fue.edu.eg', '$2a$10$SUy/13TUiaiRZiuFzMvmTeUx2qShm3BtN5F5CsHJAVjnKqNvGz/Rq', 'CS'),
  ('Dr. Sara',  'Ali',    'sara.advisor@fue.edu.eg',  '$2a$10$Rk33f3K.GGki4diKKwWBYunkI/mJxMhZb.faTuCM5FFnbypj2KpLy', 'IS');


-- ══════════════════════════════════════════════════════════════
-- 4. SEED DATA — Students  (password: student123)
-- ══════════════════════════════════════════════════════════════

INSERT INTO student (first_name, last_name, email, password, gpa, major, req_id, advisor_id)
VALUES
  ('Hassan',  'Amr',   'hassan@example.com',  '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.40, 'CS', 1, 1),
  ('Yahya',   'Ahmed', 'yahya@example.com',   '$2a$10$fvK9slqEbAkSGigNYe3reuZ98cyWM3T3bIxPhhaC1REcFW50A1JNm', 2.80, 'CS', 1, 1),
  ('Mostafa', 'Tarek', 'mostafa@example.com', '$2a$10$CRzZ1GQUjWpl.7K5iuRKlO2214Vz78yyD0WGYn7y7.o2RvcNyofQy', 3.90, 'IS', 2, 2);


-- ══════════════════════════════════════════════════════════════
-- 5. SEED DATA — Courses
-- ══════════════════════════════════════════════════════════════

INSERT INTO course (code, name, description, credits, instructor, semester)
VALUES
  ('MATH101', 'Calculus I',       'Intro calculus',               3, 'Dr. Fathy', 'Fall 2026'),
  ('MATH102', 'Calculus II',      'Continuation of calculus',     3, 'Dr. Fathy', 'Spring 2027'),
  ('CS101',   'Intro to CS',      'Basics of programming',        3, 'Dr. Mona',  'Fall 2026'),
  ('CS102',   'Data Structures',  'Data structures in depth',     3, 'Dr. Mona',  'Spring 2027'),
  ('CS201',   'Algorithms',       'Algorithm design and analysis', 3, 'Dr. Adel',  'Fall 2027');


-- ══════════════════════════════════════════════════════════════
-- 6. SEED DATA — Prerequisites
-- ══════════════════════════════════════════════════════════════

-- MATH102 requires MATH101
INSERT INTO course_prerequisite (course_id, prereq_course_id) VALUES (2, 1);

-- CS102 requires CS101
INSERT INTO course_prerequisite (course_id, prereq_course_id) VALUES (4, 3);

-- CS201 requires CS102
INSERT INTO course_prerequisite (course_id, prereq_course_id) VALUES (5, 4);


-- ══════════════════════════════════════════════════════════════
-- 7. SEED DATA — Student Enrollments
-- ══════════════════════════════════════════════════════════════

-- Hassan (student_id = 1)
INSERT INTO student_course (student_id, course_id, status) VALUES
  (1, 1, 'completed'),    -- MATH101
  (1, 3, 'completed'),    -- CS101
  (1, 4, 'in_progress');  -- CS102

-- Yahya (student_id = 2)
INSERT INTO student_course (student_id, course_id, status) VALUES
  (2, 3, 'completed');    -- CS101

-- Mostafa (student_id = 3)
INSERT INTO student_course (student_id, course_id, status) VALUES
  (3, 1, 'completed'),    -- MATH101
  (3, 2, 'completed');    -- MATH102
