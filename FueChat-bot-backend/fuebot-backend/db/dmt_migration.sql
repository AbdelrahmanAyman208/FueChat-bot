-- ============================================================
-- DMT Department Migration Script
-- Safe to run multiple times (uses conflict handling).
-- ============================================================

-- 1. Add DMT degree requirement
INSERT INTO degree_requirement (description, major, credits_needed, effective_date)
VALUES ('Digital Media Technology BSc 2024 plan', 'DM', 136, '2024-09-01')
ON CONFLICT DO NOTHING;

-- 2. Add DMT-specific courses
INSERT INTO course (code, name, description, credits, instructor, semester) VALUES
  ('DMT212',    'Introduction to Media Technology',            'Fundamentals of digital media',               3, 'TBA', 'Fall 2026'),
  ('DMT311',    'Digital Signal Processing',                   'Signal analysis and digital filters',         3, 'TBA', 'Fall 2027'),
  ('DMT322',    'Video and Audio Technology',                  'Multimedia processing and encoding',          3, 'TBA', 'Spring 2028'),
  ('DMT324',    'Introduction to 2D Animation',                '2D animation principles and tools',           3, 'TBA', 'Spring 2028'),
  ('DMT325',    'Character Design for Film and Games',         'Character art and design pipelines',          3, 'TBA', 'Spring 2028'),
  ('DMT326',    'User Experience Design',                      'UX research, wireframing, and prototyping',   3, 'TBA', 'Spring 2028'),
  ('DMT411',    'Introduction to 3D Animation',                '3D modeling, rigging, and animation',         3, 'TBA', 'Fall 2028'),
  ('DMT412',    'Game Development',                            'Game engines, mechanics, and design',         3, 'TBA', 'Fall 2028'),
  ('DMT_ELEC1', 'Digital Media Technology Program Elective 1', 'DMT program elective course',                 3, 'TBA', 'Fall 2028'),
  ('DMT_ELEC2', 'Digital Media Technology Program Elective 2', 'DMT program elective course',                 3, 'TBA', 'Fall 2028'),
  ('DMT421',    'Virtual Reality',                             'VR systems and immersive experiences',        3, 'TBA', 'Spring 2029'),
  ('DMT422',    'Augmented Reality',                           'AR frameworks and applications',              3, 'TBA', 'Spring 2029'),
  ('DMT_ELEC3', 'Digital Media Technology Program Elective 3', 'DMT program elective course',                 3, 'TBA', 'Spring 2029'),
  ('DMT_ELEC4', 'Digital Media Technology Program Elective 4', 'DMT program elective course',                 3, 'TBA', 'Spring 2029')
ON CONFLICT (code) DO NOTHING;

-- 3. Add DMT prerequisite relationships
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT212' AND p.code='CSC111'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT311' AND p.code='BMT121'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT322' AND p.code='DMT311'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT324' AND p.code='DMT212'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT325' AND p.code='DMT212'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT326' AND p.code='CSC223'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT411' AND p.code='DMT324'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT412' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT412' AND p.code='DMT324'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT421' AND p.code='DMT412'
  ON CONFLICT DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='DMT422' AND p.code='CSC211'
  ON CONFLICT DO NOTHING;

-- 4. Verify
SELECT '--- DMT Courses Added ---' AS status;
SELECT code, name, credits FROM course WHERE code LIKE 'DMT%' ORDER BY code;

SELECT '--- DMT Prerequisites ---' AS status;
SELECT c.code AS course, p.code AS prerequisite
FROM course_prerequisite cp
JOIN course c ON cp.course_id = c.course_id
JOIN course p ON cp.prereq_course_id = p.course_id
WHERE c.code LIKE 'DMT%'
ORDER BY c.code, p.code;

SELECT '--- All Programs ---' AS status;
SELECT * FROM degree_requirement ORDER BY req_id;

SELECT '--- Total Courses in DB ---' AS status;
SELECT count(*) AS total_courses FROM course;
