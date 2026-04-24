-- DS Department Migration Script (safe to re-run)

INSERT INTO degree_requirement (description, major, credits_needed, effective_date)
VALUES ('Data Science BSc 2024 plan', 'DS', 136, '2024-09-01') ON CONFLICT DO NOTHING;

INSERT INTO course (code, name, description, credits, instructor, semester) VALUES
  ('ISD211',   'Fundamentals of Data Science',               'Introduction to data science concepts',       3, 'TBA', 'Fall 2026'),
  ('ISD311',   'Data Wrangling and Knowledge Discovery',     'Data cleaning, ETL, and knowledge mining',    3, 'TBA', 'Fall 2027'),
  ('ISD321',   'Computational Statistics and Data Analysis', 'Statistical computing and inference',         3, 'TBA', 'Spring 2028'),
  ('ISD322',   'Theory and Practice of Data Analysis',       'Analytical frameworks and methodology',       3, 'TBA', 'Spring 2028'),
  ('DS_ELEC1', 'Data Science Program Elective 1',            'DS program elective course',                  3, 'TBA', 'Spring 2028'),
  ('DS_ELEC2', 'Data Science Program Elective 2',            'DS program elective course',                  3, 'TBA', 'Spring 2028'),
  ('ISD411',   'Big Data Analytics',                         'Hadoop, Spark, and large-scale analytics',    3, 'TBA', 'Fall 2028'),
  ('ISD412',   'Applied Regression Methods',                 'Linear, logistic, and advanced regression',   3, 'TBA', 'Fall 2028'),
  ('ISD421',   'Data Visualization and Exploration',         'Dashboards, charts, and exploratory analysis',3, 'TBA', 'Spring 2029'),
  ('ISD422',   'Applied Multivariate Analysis',              'PCA, factor analysis, and clustering',        3, 'TBA', 'Spring 2029'),
  ('DS_ELEC3', 'Data Science Program Elective 3',            'DS program elective course',                  3, 'TBA', 'Spring 2029'),
  ('DS_ELEC4', 'Data Science Program Elective 4',            'DS program elective course',                  3, 'TBA', 'Spring 2029')
ON CONFLICT (code) DO NOTHING;

INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD211' AND p.code='CSC111' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD311' AND p.code='ISI222' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD321' AND p.code='BMT211' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD322' AND p.code='CSA311' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD411' AND p.code='ISD311' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD411' AND p.code='ISD211' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD412' AND p.code='BMT212' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD412' AND p.code='BMT211' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD421' AND p.code='ISD322' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='ISD422' AND p.code='ISD322' ON CONFLICT DO NOTHING;

-- Verify
SELECT '--- DS Courses ---' AS info;
SELECT code, name, credits FROM course WHERE code LIKE 'ISD%' OR code LIKE 'DS_%' ORDER BY code;
SELECT '--- DS Prerequisites ---' AS info;
SELECT c.code AS course, p.code AS prerequisite FROM course_prerequisite cp JOIN course c ON cp.course_id = c.course_id JOIN course p ON cp.prereq_course_id = p.course_id WHERE c.code LIKE 'ISD%' ORDER BY c.code, p.code;
SELECT '--- All Programs ---' AS info;
SELECT * FROM degree_requirement ORDER BY req_id;
SELECT '--- Total Courses ---' AS info;
SELECT count(*) AS total FROM course;
