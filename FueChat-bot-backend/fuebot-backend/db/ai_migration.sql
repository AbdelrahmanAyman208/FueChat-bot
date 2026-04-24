-- ============================================================
-- AI Department Migration Script
-- Run this on an EXISTING fuebot_db to add AI curriculum data.
-- Safe to run multiple times (uses conflict handling).
-- ============================================================

-- 1. Add AI degree requirement
INSERT INTO degree_requirement (description, major, credits_needed, effective_date)
VALUES ('Artificial Intelligence BSc 2024 plan', 'AI', 136, '2024-09-01')
ON CONFLICT DO NOTHING;

-- 2. Add AI-specific courses (shared courses already exist)
INSERT INTO course (code, name, description, credits, instructor, semester) VALUES
  ('ELEC_S3', 'Elective: Science & Ethics',                 'Elective in science and ethics',              2, 'TBA', 'Fall 2026'),
  ('CSA313',  'Image Processing',                            'Digital image processing techniques',          3, 'TBA', 'Fall 2027'),
  ('CSA321',  'Machine Learning',                            'Supervised and unsupervised learning',         3, 'TBA', 'Spring 2028'),
  ('CSA322',  'Reasoning and Agents',                        'Logical reasoning and intelligent agents',    3, 'TBA', 'Spring 2028'),
  ('CSA423',  'Computer Vision',                             'Image recognition and visual understanding',  3, 'TBA', 'Spring 2028'),
  ('CSA323',  'Artificial Intelligence Applications',        'Applied AI in real-world domains',            3, 'TBA', 'Spring 2028'),
  ('CSA324',  'Processing of Formal and Natural Language',   'NLP and formal language processing',          3, 'TBA', 'Spring 2028'),
  ('CSA411',  'Neural Networks and Deep Learning',           'Deep learning architectures and training',    3, 'TBA', 'Fall 2028'),
  ('AI_ELEC1','AI Program Elective 1',                       'AI program elective course',                  3, 'TBA', 'Fall 2028'),
  ('AI_ELEC2','AI Program Elective 2',                       'AI program elective course',                  3, 'TBA', 'Fall 2028'),
  ('CSA424',  'Reinforcement Learning',                      'RL agents and policy optimization',           3, 'TBA', 'Spring 2029'),
  ('CSA422',  'Intelligent Autonomous Robotics',             'Autonomous robot systems and control',        3, 'TBA', 'Spring 2029'),
  ('AI_ELEC3','AI Program Elective 3',                       'AI program elective course',                  3, 'TBA', 'Spring 2029'),
  ('AI_ELEC4','AI Program Elective 4',                       'AI program elective course',                  3, 'TBA', 'Spring 2029')
ON CONFLICT (code) DO NOTHING;

-- 3. Add AI prerequisite relationships
-- CSA313 requires BMT212 AND CSC121
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA313' AND p.code='BMT212'
  ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA313' AND p.code='CSC121'
  ON CONFLICT DO NOTHING;

-- CSA321 requires BMT122 AND CSA311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA321' AND p.code='BMT122'
  ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA321' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;

-- CSA322 requires CSA311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA322' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;

-- CSA423 requires CSA313 AND CSA311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA423' AND p.code='CSA313'
  ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA423' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;

-- CSA323 requires CSA311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA323' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;

-- CSA324 requires CSA311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA324' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;

-- CSA411 requires BMT121 AND CSA311
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA411' AND p.code='BMT121'
  ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA411' AND p.code='CSA311'
  ON CONFLICT DO NOTHING;

-- CSC311 requires CSC211 (AI curriculum prerequisite)
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSC311' AND p.code='CSC211'
  ON CONFLICT DO NOTHING;

-- CSA424 requires CSA321
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA424' AND p.code='CSA321'
  ON CONFLICT DO NOTHING;

-- CSA422 requires CSC412
INSERT INTO course_prerequisite (course_id, prereq_course_id)
  SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSA422' AND p.code='CSC412'
  ON CONFLICT DO NOTHING;

-- 4. Verify
SELECT '--- AI Courses Added ---' AS status;
SELECT code, name, credits FROM course WHERE code LIKE 'CSA%' OR code LIKE 'AI_%' OR code = 'ELEC_S3' ORDER BY code;

SELECT '--- AI Prerequisites ---' AS status;
SELECT c.code AS course, p.code AS prerequisite
FROM course_prerequisite cp
JOIN course c ON cp.course_id = c.course_id
JOIN course p ON cp.prereq_course_id = p.course_id
WHERE c.code LIKE 'CSA%' OR c.code = 'ELEC_S3'
ORDER BY c.code, p.code;

SELECT '--- Degree Requirements ---' AS status;
SELECT * FROM degree_requirement;
