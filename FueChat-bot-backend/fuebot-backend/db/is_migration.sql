-- ============================================================
-- IS Department Migration Script
-- Run this on an EXISTING fuebot_db to add IS curriculum data.
-- Safe to run multiple times (uses conflict handling).
-- ============================================================

-- 1. Add IS-specific courses (shared courses already exist)
INSERT INTO course (code, name, description, credits, instructor, semester) VALUES
  ('ISI211',   'Introduction to Information Systems',        'Fundamentals of information systems',         3, 'TBA', 'Fall 2026'),
  ('ISI312',   'Systems Analysis and Design 1',              'Requirements analysis and system design',     3, 'TBA', 'Fall 2027'),
  ('ISI321',   'Database Systems 2',                         'Advanced database concepts and NoSQL',        3, 'TBA', 'Spring 2028'),
  ('ISI322',   'Information Storage and Retrieval',          'Search engines and information retrieval',    3, 'TBA', 'Spring 2028'),
  ('ISI323',   'Geographical Information Systems',           'GIS concepts and spatial databases',          3, 'TBA', 'Spring 2028'),
  ('ISI324',   'Software Project Management',                'Project planning, scheduling, and control',   3, 'TBA', 'Spring 2028'),
  ('IS_ELEC1', 'Information Systems Program Elective 1',     'IS program elective course',                  3, 'TBA', 'Spring 2028'),
  ('ISI411',   'Management Information Systems',             'MIS concepts and enterprise systems',         3, 'TBA', 'Fall 2028'),
  ('ISI412',   'Data Mining and Data Warehousing',           'Data mining techniques and warehousing',      3, 'TBA', 'Fall 2028'),
  ('ISI413',   'Enterprise Resource Planning',               'ERP systems and business processes',          3, 'TBA', 'Fall 2028'),
  ('IS_ELEC2', 'Information Systems Program Elective 2',     'IS program elective course',                  3, 'TBA', 'Fall 2028'),
  ('ISI421',   'Decision Support Systems',                   'DSS architectures and decision modeling',     3, 'TBA', 'Spring 2029'),
  ('ISI422',   'Business Intelligence',                      'BI tools, analytics, and dashboards',         3, 'TBA', 'Spring 2029'),
  ('IS_ELEC3', 'Information Systems Program Elective 3',     'IS program elective course',                  3, 'TBA', 'Spring 2029'),
  ('IS_ELEC4', 'Information Systems Program Elective 4',     'IS program elective course',                  3, 'TBA', 'Spring 2029')
ON CONFLICT (code) DO NOTHING;

-- 2. Add IS prerequisite relationships
-- ISI211 requires CSC111
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI211' AND p.code='CSC111'
  ON CONFLICT DO NOTHING;

-- ISI312 requires ISI211
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI312' AND p.code='ISI211'
  ON CONFLICT DO NOTHING;

-- ISI321 requires ISI222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI321' AND p.code='ISI222'
  ON CONFLICT DO NOTHING;

-- ISI322 requires ISI222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI322' AND p.code='ISI222'
  ON CONFLICT DO NOTHING;

-- ISI323 requires ISI222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI323' AND p.code='ISI222'
  ON CONFLICT DO NOTHING;

-- ISI324 requires CSC223
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI324' AND p.code='CSC223'
  ON CONFLICT DO NOTHING;

-- ISI411 requires ISI222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI411' AND p.code='ISI222'
  ON CONFLICT DO NOTHING;

-- ISI412 requires ISI321
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI412' AND p.code='ISI321'
  ON CONFLICT DO NOTHING;

-- ISI413 requires ISI222
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI413' AND p.code='ISI222'
  ON CONFLICT DO NOTHING;

-- ISI421 requires ISI321
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI421' AND p.code='ISI321'
  ON CONFLICT DO NOTHING;

-- ISI422 requires ISI412
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISI422' AND p.code='ISI412'
  ON CONFLICT DO NOTHING;

-- 3. Verify
SELECT '--- IS Courses Added ---' AS status;
SELECT code, name, credits FROM course WHERE code LIKE 'ISI%' OR code LIKE 'IS_%' ORDER BY code;

SELECT '--- IS Prerequisites ---' AS status;
SELECT c.code AS course, p.code AS prerequisite
FROM course_prerequisite cp
JOIN course c ON cp.course_id = c.course_id
JOIN course p ON cp.prereq_course_id = p.course_id
WHERE c.code LIKE 'ISI%'
ORDER BY c.code, p.code;

SELECT '--- All Programs Summary ---' AS status;
SELECT * FROM degree_requirement ORDER BY req_id;

SELECT '--- Total Courses in DB ---' AS status;
SELECT count(*) AS total_courses FROM course;
