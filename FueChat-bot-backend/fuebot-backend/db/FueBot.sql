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
    student_id     SERIAL PRIMARY KEY,
    university_id  VARCHAR(20)  NOT NULL UNIQUE,  -- e.g. FUE-CS-001
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password       VARCHAR(255) NOT NULL,
    gpa            NUMERIC(3,2) CHECK (gpa BETWEEN 0 AND 4.00),
    major          VARCHAR(100) NOT NULL,
    req_id         INTEGER      REFERENCES degree_requirement(req_id)
                                 ON UPDATE CASCADE ON DELETE SET NULL,
    advisor_id     INTEGER      REFERENCES advisor(advisor_id)
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
                   CHECK (status IN ('completed', 'in_progress', 'planned', 'failed')),
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
  ('Computer Science BSc 2024 plan', 'CS', 136, '2024-09-01'),
  ('Information Systems BSc 2024 plan', 'IS', 136, '2024-09-01');


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
-- All passwords are bcrypt hash of 'student123'

INSERT INTO student (university_id, first_name, last_name, email, password, gpa, major, req_id, advisor_id)
VALUES
  -- 1. Hassan Amr — Senior (Level 4), strong student, completed most courses
  ('FUE-CS-001', 'Hassan',   'Amr',       'hassan@fue.edu.eg',    '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.40, 'CS', 1, 1),

  -- 2. Ahmed Mostafa — Junior (Level 3), failed some courses
  ('FUE-CS-002', 'Ahmed',    'Mostafa',   'ahmed@fue.edu.eg',     '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 2.50, 'CS', 1, 1),

  -- 3. Yahya Khaled — Sophomore (Level 2), average student
  ('FUE-CS-003', 'Yahya',    'Khaled',    'yahya@fue.edu.eg',     '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 2.80, 'CS', 1, 1),

  -- 4. Mostafa Tarek — Freshman (Level 1), just started
  ('FUE-CS-004', 'Mostafa',  'Tarek',     'mostafa@fue.edu.eg',   '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.10, 'CS', 1, 2),

  -- 5. Omar Saeed — Senior (Level 4), excellent student (Dean's list)
  ('FUE-CS-005', 'Omar',     'Saeed',     'omar@fue.edu.eg',      '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.85, 'CS', 1, 1),

  -- 6. Nour ElDin — Junior (Level 3), struggling, failed multiple courses
  ('FUE-CS-006', 'Nour',     'ElDin',     'nour@fue.edu.eg',       '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 1.90, 'CS', 1, 2),

  -- 7. Fatma Ali — Sophomore (Level 2), good student
  ('FUE-CS-007', 'Fatma',    'Ali',       'fatma@fue.edu.eg',      '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.20, 'CS', 1, 2),

  -- 8. Kareem Nasser — Junior (Level 3), good, no failures
  ('FUE-CS-008', 'Kareem',   'Nasser',    'kareem@fue.edu.eg',     '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.50, 'CS', 1, 1),

  -- 9. Sara Mohamed — Freshman (Level 1), second semester
  ('FUE-CS-009', 'Sara',     'Mohamed',   'sara@fue.edu.eg',       '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 3.70, 'CS', 1, 2),

  -- 10. Mohamed Ibrahim — Senior (Level 4), failed some earlier, now recovering
  ('FUE-CS-010', 'Mohamed',  'Ibrahim',   'mohamed@fue.edu.eg',    '$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO', 2.30, 'CS', 1, 1);


-- ══════════════════════════════════════════════════════════════
-- 5. SEED DATA — Full Course Catalog (from manual_prerequisites.csv)
-- ══════════════════════════════════════════════════════════════
-- course_id assignments:
--  1 = ENG101        2 = BMT111        3 = BMT112        4 = BPH111
--  5 = CSC111        6 = PSC110        7 = ENG102        8 = BMT121
--  9 = CSC121       10 = CPS121       11 = BMT122       12 = CSC122
-- 13 = CPS211       14 = CSC211       15 = BPH211       16 = BMT212
-- 17 = HUM_ELEC1    18 = BMT211       19 = CSC221       20 = CSC222
-- 21 = CSC223       22 = CSS221       23 = ISI222       24 = ISI311
-- 25 = CSA311       26 = CSS312       27 = CSC311       28 = CSC312
-- 29 = CSC313       30 = CSC326       31 = CSC322       32 = CSC323
-- 33 = CSC324       34 = CSC325       35 = CS_ELEC1     36 = TR333
-- 37 = PR498        38 = CSC411       39 = CSC412       40 = CS_ELEC2
-- 41 = CS_ELEC3     42 = PR499        43 = DMT323       44 = CSC422
-- 45 = CS_ELEC4     46 = CS_ELEC5

INSERT INTO course (code, name, description, credits, instructor, semester)
VALUES
  -- ── Freshman — Semester 1 ──────────────────────────────────
  ('ENG101', 'English 1',                                    'English language fundamentals',                2, 'Dr. Laila',   'Fall 2025'),
  ('BMT111', 'Calculus',                                     'Limits, derivatives, and integrals',          3, 'Dr. Fathy',   'Fall 2025'),
  ('BMT112', 'Discrete Mathematics',                         'Logic, sets, relations, and combinatorics',   3, 'Dr. Hany',    'Fall 2025'),
  ('BPH111', 'Physics',                                      'Mechanics, waves, and thermodynamics',        3, 'Dr. Amgad',   'Fall 2025'),
  ('CSC111', 'Computing Fundamentals',                       'Introduction to computing and problem solving',3,'Dr. Mona',    'Fall 2025'),
  ('PSC110', 'Human Rights',                                 'Introduction to human rights',                2, 'Dr. Nadia',   'Fall 2025'),

  -- ── Freshman — Semester 2 ──────────────────────────────────
  ('ENG102', 'English 2',                                    'Advanced English skills',                     2, 'Dr. Laila',   'Spring 2026'),
  ('BMT121', 'Differential Equations',                       'ODEs and PDEs',                               3, 'Dr. Fathy',   'Spring 2026'),
  ('CSC121', 'Structured Programming',                       'C/C++ structured programming',                3, 'Dr. Mona',    'Spring 2026'),
  ('CPS121', 'Communication Skills and Report Writing',      'Academic writing and presentation skills',    2, 'Dr. Laila',   'Spring 2026'),
  ('BMT122', 'Probability and Statistics',                   'Probability distributions and statistics',    3, 'Dr. Hany',    'Spring 2026'),
  ('CSC122', 'Logic Design',                                 'Digital logic and circuit design',             3, 'Dr. Khaled',  'Spring 2026'),

  -- ── Sophomore — Semester 3 ─────────────────────────────────
  ('CPS211', 'Ethics and Social Impacts of Computing',       'Computing ethics and responsibility',         2, 'Dr. Nadia',   'Fall 2026'),
  ('CSC211', 'Object Oriented Programming',                  'OOP concepts with Java/C++',                  3, 'Dr. Mona',    'Fall 2026'),
  ('BPH211', 'Advanced Physics',                             'Electromagnetism and optics',                 3, 'Dr. Amgad',   'Fall 2026'),
  ('BMT212', 'Linear Algebra',                               'Vectors, matrices, and eigenvalues',          3, 'Dr. Fathy',   'Fall 2026'),
  ('HUM_ELEC1', 'Humanities and Ethics Elective',            'Elective in humanities',                      2, 'Dr. Nadia',   'Fall 2026'),
  ('BMT211', 'Advanced Probability and Statistics',          'Hypothesis testing and regression',           3, 'Dr. Hany',    'Fall 2026'),

  -- ── Sophomore — Semester 4 ─────────────────────────────────
  ('CSC221', 'Advanced Programming',                         'Advanced algorithms and design patterns',     3, 'Dr. Adel',    'Spring 2027'),
  ('CSC222', 'Data Structures',                              'Trees, graphs, hashing, and complexity',      3, 'Dr. Mona',    'Spring 2027'),
  ('CSC223', 'Software Engineering - 1',                     'SDLC, requirements, and UML',                 3, 'Dr. Adel',    'Spring 2027'),
  ('CSS221', 'Computer Networks',                            'OSI model, TCP/IP, and routing',              3, 'Dr. Khaled',  'Spring 2027'),
  ('ISI222', 'Database Systems - 1',                         'Relational databases, SQL, ER modeling',      3, 'Dr. Sara',    'Spring 2027'),

  -- ── Junior — Semester 5 ────────────────────────────────────
  ('ISI311', 'Modeling and Simulation',                      'Mathematical modeling and simulation',        3, 'Dr. Hany',    'Fall 2027'),
  ('CSA311', 'Artificial Intelligence Fundamentals',         'Search, knowledge, and machine learning',     3, 'Dr. Adel',    'Fall 2027'),
  ('CSS312', 'Computers and Information Security',           'Cryptography, firewalls, and security',       3, 'Dr. Khaled',  'Fall 2027'),
  ('CSC311', 'Operating Systems - 1',                        'Processes, threads, and memory management',   3, 'Dr. Amgad',   'Fall 2027'),
  ('CSC312', 'Analysis and Design of Algorithms',           'Algorithm complexity and design paradigms',   3, 'Dr. Adel',    'Fall 2027'),
  ('CSC313', 'Software Engineering - 2',                     'Testing, maintenance, and agile methods',     3, 'Dr. Adel',    'Fall 2027'),

  -- ── Junior — Semester 6 ────────────────────────────────────
  ('CSC326', 'Web Applications Development',                 'Frontend, backend, and full-stack web dev',   3, 'Dr. Mona',    'Spring 2028'),
  ('CSC322', 'Operating Systems - 2',                        'Advanced OS: scheduling and file systems',    3, 'Dr. Amgad',   'Spring 2028'),
  ('CSC323', 'Computer Architecture',                        'CPU architecture and microprocessors',        3, 'Dr. Khaled',  'Spring 2028'),
  ('CSC324', 'Theory of Computations',                       'Automata, grammars, and Turing machines',     3, 'Dr. Hany',    'Spring 2028'),
  ('CSC325', 'Computer Organization and Assembly Language',  'Assembly programming and hardware org',       3, 'Dr. Khaled',  'Spring 2028'),
  ('CS_ELEC1', 'Computer Science Program Elective - 1',     'Program elective course',                     3, 'TBA',         'Spring 2028'),

  -- ── Junior — Summer ────────────────────────────────────────
  ('TR333',  'Summer Training',                              'Practical industry training',                 3, 'TBA',         'Summer 2028'),

  -- ── Senior — Semester 7 ────────────────────────────────────
  ('PR498',  'Project - 1',                                  'Graduation project phase 1',                  3, 'Dr. Adel',    'Fall 2028'),
  ('CSC411', 'Cloud Computing',                              'Cloud services, virtualization, deployment',   3, 'Dr. Khaled',  'Fall 2028'),
  ('CSC412', 'Embedded Systems',                             'Microcontrollers and embedded design',        3, 'Dr. Amgad',   'Fall 2028'),
  ('CS_ELEC2', 'Computer Science Program Elective - 2',     'Program elective course',                     3, 'TBA',         'Fall 2028'),
  ('CS_ELEC3', 'Computer Science Program Elective - 3',     'Program elective course',                     3, 'TBA',         'Fall 2028'),

  -- ── Senior — Semester 8 ────────────────────────────────────
  ('PR499',  'Project - 2',                                  'Graduation project phase 2',                  3, 'Dr. Adel',    'Spring 2029'),
  ('DMT323', 'Computer Graphics',                            'Graphics pipelines and rendering',            3, 'Dr. Amgad',   'Spring 2029'),
  ('CSC422', 'Concepts of Programming Languages',           'Paradigms: functional, logic, OOP',           3, 'Dr. Mona',    'Spring 2029'),
  ('CS_ELEC4', 'Computer Science Program Elective - 4',     'Program elective course',                     3, 'TBA',         'Spring 2029'),
  ('CS_ELEC5', 'Computer Science Program Elective - 5',     'Program elective course',                     3, 'TBA',         'Spring 2029');


-- ══════════════════════════════════════════════════════════════
-- 6. SEED DATA — Prerequisites (from CSV)
-- ══════════════════════════════════════════════════════════════
-- Using sub-selects for clarity — maps code → course_id

-- ENG102 requires ENG101
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ENG102' AND p.code='ENG101';

-- BMT121 requires BMT111
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='BMT121' AND p.code='BMT111';

-- CSC121 requires CSC111
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC121' AND p.code='CSC111';

-- CPS121 requires ENG101
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CPS121' AND p.code='ENG101';

-- BMT122 requires BMT111
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='BMT122' AND p.code='BMT111';

-- CSC122 requires BMT112
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC122' AND p.code='BMT112';

-- CSC211 requires CSC121
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC211' AND p.code='CSC121';

-- BPH211 requires BPH111
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='BPH211' AND p.code='BPH111';

-- BMT212 requires BMT121
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='BMT212' AND p.code='BMT121';

-- BMT211 requires BMT122
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='BMT211' AND p.code='BMT122';

-- CSC221 requires CSC211
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC221' AND p.code='CSC211';

-- CSC222 requires CSC211
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC222' AND p.code='CSC211';

-- CSC223 requires CSC211
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC223' AND p.code='CSC211';

-- CSS221 requires CSC111 AND BMT112
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS221' AND p.code='CSC111';
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS221' AND p.code='BMT112';

-- ISI222 requires CSC121
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI222' AND p.code='CSC121';

-- ISI311 requires BMT122
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI311' AND p.code='BMT122';

-- CSA311 requires CSC211
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA311' AND p.code='CSC211';

-- CSS312 requires CSS221
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS312' AND p.code='CSS221';

-- CSC312 requires CSC222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC312' AND p.code='CSC222';

-- CSC313 requires CSC223
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC313' AND p.code='CSC223';

-- CSC326 requires CSC211 AND ISI222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC326' AND p.code='CSC211';
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC326' AND p.code='ISI222';

-- CSC322 requires CSC311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC322' AND p.code='CSC311';

-- CSC323 requires CSC122
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC323' AND p.code='CSC122';

-- CSC324 requires BMT112
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC324' AND p.code='BMT112';

-- CSC325 requires CSC121 AND CSC122
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC325' AND p.code='CSC121';
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC325' AND p.code='CSC122';

-- PR498 requires CSC223
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='PR498' AND p.code='CSC223';

-- CSC411 requires CSC223 AND CSS221
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC411' AND p.code='CSC223';
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC411' AND p.code='CSS221';

-- CSC412 requires CSC323
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC412' AND p.code='CSC323';

-- PR499 requires PR498
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='PR499' AND p.code='PR498';

-- DMT323 requires BMT212
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT323' AND p.code='BMT212';

-- CSC422 requires CSC221
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC422' AND p.code='CSC221';


-- ══════════════════════════════════════════════════════════════
-- 7. SEED DATA — Student Course Enrollments
-- ══════════════════════════════════════════════════════════════
-- Uses sub-selects: (SELECT course_id FROM course WHERE code='XXX')

-- ────────────────────────────────────────────────────────────
-- Student 1: Hassan Amr — SENIOR (Level 4)
-- GPA 3.40 | Completed semesters 1-6 + summer | In-progress sem 7
-- 93 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 1, course_id, 'completed' FROM course WHERE code IN (
  -- Semester 1 (all completed)
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  -- Semester 2 (all completed)
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  -- Semester 3 (all completed)
  'CPS211','CSC211','BPH211','BMT212','HUM_ELEC1','BMT211',
  -- Semester 4 (all completed)
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  -- Semester 5 (all completed)
  'ISI311','CSA311','CSS312','CSC311','CSC312','CSC313',
  -- Semester 6 (all completed)
  'CSC326','CSC322','CSC323','CSC324','CSC325','CS_ELEC1',
  -- Summer (completed)
  'TR333'
);
-- Semester 7 (in progress)
INSERT INTO student_course (student_id, course_id, status)
SELECT 1, course_id, 'in_progress' FROM course WHERE code IN (
  'PR498','CSC411','CSC412','CS_ELEC2','CS_ELEC3'
);

-- ────────────────────────────────────────────────────────────
-- Student 2: Ahmed Mostafa — JUNIOR (Level 3)
-- GPA 2.50 | Failed CSC211 and BMT211, retaking CSC211
-- Completed semesters 1-2 fully, semester 3 partially
-- 49 credits completed (sem1=16 + sem2=16 + partial sem3)
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 2, course_id, 'completed' FROM course WHERE code IN (
  -- Semester 1
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  -- Semester 2
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  -- Semester 3 (partial — passed these)
  'CPS211','BPH211','BMT212','HUM_ELEC1'
);
-- Ahmed FAILED these courses
INSERT INTO student_course (student_id, course_id, status)
SELECT 2, course_id, 'failed' FROM course WHERE code IN ('BMT211');
-- Ahmed is retaking CSC211 + taking remaining sem3 courses
INSERT INTO student_course (student_id, course_id, status)
SELECT 2, course_id, 'in_progress' FROM course WHERE code IN ('CSC211');

-- ────────────────────────────────────────────────────────────
-- Student 3: Yahya Khaled — SOPHOMORE (Level 2)
-- GPA 2.80 | In first half of sophomore year
-- Completed semester 1+2, in-progress semester 3
-- 32 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 3, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 3, course_id, 'in_progress' FROM course WHERE code IN (
  'CPS211','CSC211','BPH211','BMT212','HUM_ELEC1','BMT211'
);

-- ────────────────────────────────────────────────────────────
-- Student 4: Mostafa Tarek — FRESHMAN (Level 1)
-- GPA 3.10 | Just completed first semester, in-progress semester 2
-- 16 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 4, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 4, course_id, 'in_progress' FROM course WHERE code IN (
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122'
);

-- ────────────────────────────────────────────────────────────
-- Student 5: Omar Saeed — SENIOR (Level 4)
-- GPA 3.85 | Excellent student, completed through semester 7
-- In-progress semester 8 (final semester!)
-- 111 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 5, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BPH211','BMT212','HUM_ELEC1','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','CSC311','CSC312','CSC313',
  'CSC326','CSC322','CSC323','CSC324','CSC325','CS_ELEC1',
  'TR333',
  'PR498','CSC411','CSC412','CS_ELEC2','CS_ELEC3'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 5, course_id, 'in_progress' FROM course WHERE code IN (
  'PR499','DMT323','CSC422','CS_ELEC4','CS_ELEC5'
);

-- ────────────────────────────────────────────────────────────
-- Student 6: Nour ElDin — JUNIOR (Level 3, struggling)
-- GPA 1.90 | Failed CSC222, BMT122, CSC121. Retaking CSC121.
-- Completed semester 1 + partial semester 2
-- 28 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 6, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CPS121','CSC122'
);
-- Failed courses
INSERT INTO student_course (student_id, course_id, status)
SELECT 6, course_id, 'failed' FROM course WHERE code IN ('BMT122');
-- Retaking failed + continuing
INSERT INTO student_course (student_id, course_id, status)
SELECT 6, course_id, 'in_progress' FROM course WHERE code IN ('CSC121');

-- ────────────────────────────────────────────────────────────
-- Student 7: Fatma Ali — SOPHOMORE (Level 2)
-- GPA 3.20 | Completed semesters 1-3, in-progress semester 4
-- 48 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 7, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BPH211','BMT212','HUM_ELEC1','BMT211'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 7, course_id, 'in_progress' FROM course WHERE code IN (
  'CSC221','CSC222','CSC223','CSS221','ISI222'
);

-- ────────────────────────────────────────────────────────────
-- Student 8: Kareem Nasser — JUNIOR (Level 3)
-- GPA 3.50 | Completed semesters 1-4, in-progress semester 5
-- 63 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 8, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BPH211','BMT212','HUM_ELEC1','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 8, course_id, 'in_progress' FROM course WHERE code IN (
  'ISI311','CSA311','CSS312','CSC311','CSC312','CSC313'
);

-- ────────────────────────────────────────────────────────────
-- Student 9: Sara Mohamed — FRESHMAN (Level 1, second semester)
-- GPA 3.70 | Completed semester 1, in-progress semester 2
-- 16 credits completed
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 9, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 9, course_id, 'in_progress' FROM course WHERE code IN (
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122'
);

-- ────────────────────────────────────────────────────────────
-- Student 10: Mohamed Ibrahim — SENIOR (Level 4, recovering)
-- GPA 2.30 | Failed CSC312, CSS312, and CSC313 in sem5. Retook and passed.
-- Now in-progress semester 7. Had a rough junior year but recovering.
-- 93 credits completed (including retakes)
-- ────────────────────────────────────────────────────────────
INSERT INTO student_course (student_id, course_id, status)
SELECT 10, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BPH211','BMT212','HUM_ELEC1','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','CSC311','CSC312','CSC313',
  'CSC326','CSC322','CSC323','CSC324','CSC325','CS_ELEC1',
  'TR333'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 10, course_id, 'in_progress' FROM course WHERE code IN (
  'PR498','CSC411','CSC412','CS_ELEC2','CS_ELEC3'
);
