-- CY Department Migration Script (safe to re-run)

INSERT INTO degree_requirement (description, major, credits_needed, effective_date)
VALUES ('Cyber Security BSc 2024 plan', 'CY', 136, '2024-09-01') ON CONFLICT DO NOTHING;

INSERT INTO course (code, name, description, credits, instructor, semester) VALUES
  ('BMT213',   'Number Theory',                                'Number theory for cryptography',              3, 'TBA', 'Fall 2026'),
  ('CSS311',   'Cyber Security Fundamentals',                  'Core cybersecurity principles',               3, 'TBA', 'Fall 2027'),
  ('CSS313',   'Advanced Computer Networks',                    'Network protocols and advanced routing',      3, 'TBA', 'Fall 2027'),
  ('CSS321',   'Cryptography and Network Security',            'Encryption algorithms and secure comms',      3, 'TBA', 'Spring 2028'),
  ('CSS322',   'Software Security',                            'Secure coding and vulnerability analysis',    3, 'TBA', 'Spring 2028'),
  ('CSS323',   'Security Threats and Risk Analysis',            'Threat modeling and risk assessment',         3, 'TBA', 'Spring 2028'),
  ('CSS324',   'Ethical Hacking and Penetration Testing',       'Pen testing methodologies and tools',         3, 'TBA', 'Spring 2028'),
  ('CY_ELEC1', 'Cyber Security Program Elective 1',            'CY program elective course',                  3, 'TBA', 'Spring 2028'),
  ('CSS411',   'Digital Forensics',                            'Forensic analysis and evidence handling',     3, 'TBA', 'Fall 2028'),
  ('CY_ELEC2', 'Cyber Security Program Elective 2',            'CY program elective course',                  3, 'TBA', 'Fall 2028'),
  ('CY_ELEC3', 'Cyber Security Program Elective 3',            'CY program elective course',                  3, 'TBA', 'Fall 2028'),
  ('CSS421',   'Mobile and Wireless Security',                 'Wireless protocols and mobile security',      3, 'TBA', 'Spring 2029'),
  ('CSS422',   'Cyber Security Incident Detection and Response','SIEM, IR, and incident management',          3, 'TBA', 'Spring 2029'),
  ('CY_ELEC4', 'Cyber Security Program Elective 4',            'CY program elective course',                  3, 'TBA', 'Spring 2029'),
  ('CY_ELEC5', 'Cyber Security Program Elective 5',            'CY program elective course',                  3, 'TBA', 'Spring 2029')
ON CONFLICT (code) DO NOTHING;

-- Prerequisites
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='BMT213' AND p.code='BMT112' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS311' AND p.code='CSS221' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS313' AND p.code='CSS221' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS321' AND p.code='BMT213' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS321' AND p.code='CSS313' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS322' AND p.code='CSC221' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS322' AND p.code='CSS312' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS323' AND p.code='CSS311' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS324' AND p.code='CSS313' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS411' AND p.code='CSS322' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS421' AND p.code='CSS321' ON CONFLICT DO NOTHING;
INSERT INTO course_prerequisite (course_id, prereq_course_id) SELECT c.course_id, p.course_id FROM course c, course p WHERE c.code='CSS422' AND p.code='CSS323' ON CONFLICT DO NOTHING;

-- Verify
SELECT '--- CY Courses ---' AS info;
SELECT code, name, credits FROM course WHERE code LIKE 'CSS%' OR code LIKE 'CY_%' OR code = 'BMT213' ORDER BY code;
SELECT '--- CY Prerequisites ---' AS info;
SELECT c.code AS course, p.code AS prerequisite FROM course_prerequisite cp JOIN course c ON cp.course_id = c.course_id JOIN course p ON cp.prereq_course_id = p.course_id WHERE c.code LIKE 'CSS%' OR c.code = 'BMT213' ORDER BY c.code, p.code;
SELECT '--- All Programs ---' AS info;
SELECT * FROM degree_requirement ORDER BY req_id;
SELECT '--- Total Courses ---' AS info;
SELECT count(*) AS total FROM course;
