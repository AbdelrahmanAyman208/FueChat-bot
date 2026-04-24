-- ============================================================
-- ENROLLMENTS: AI Students (IDs 11-14) + IS Students (IDs 15-18)
-- Case 1=Freshman, 2=Sophomore w/failures, 3=Junior, 4=Senior
-- ============================================================

-- === AI-001 Ziad (ID=11) — FRESHMAN: completed sem1, in-progress sem2 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 11, course_id, 'completed' FROM course WHERE code IN ('ENG101','BMT111','BMT112','BPH111','CSC111','PSC110');
INSERT INTO student_course (student_id, course_id, status)
SELECT 11, course_id, 'in_progress' FROM course WHERE code IN ('ENG102','BMT121','CSC121','CPS121','BMT122','CSC122');

-- === AI-002 Layla (ID=12) — SOPHOMORE w/failures: sem1-2 done, failed BMT211+CSC211 in sem3 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 12, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','BMT212','ELEC_S3'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 12, course_id, 'failed' FROM course WHERE code IN ('BMT211');
INSERT INTO student_course (student_id, course_id, status)
SELECT 12, course_id, 'in_progress' FROM course WHERE code IN ('CSC211','BMT211');

-- === AI-003 Youssef (ID=13) — JUNIOR: completed sem1-5, in-progress sem6 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 13, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','CSC311','CSC312','CSA313'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 13, course_id, 'in_progress' FROM course WHERE code IN (
  'CSA321','CSA322','CSA423','CSA323','CSA324','CSC323'
);

-- === AI-004 Dina (ID=14) — SENIOR: completed sem1-7+summer, in-progress sem8 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 14, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','CSC311','CSC312','CSA313',
  'CSA321','CSA322','CSA423','CSA323','CSA324',
  'TR333',
  'PR498','CSA411','CSC412'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 14, course_id, 'in_progress' FROM course WHERE code IN (
  'PR499','CSA424','CSA422'
);

-- === IS-001 Tamer (ID=15) — FRESHMAN ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 15, course_id, 'completed' FROM course WHERE code IN ('ENG101','BMT111','BMT112','BPH111','CSC111','PSC110');
INSERT INTO student_course (student_id, course_id, status)
SELECT 15, course_id, 'in_progress' FROM course WHERE code IN ('ENG102','BMT121','CSC121','CPS121','BMT122','CSC122');

-- === IS-002 Rana (ID=16) — SOPHOMORE w/failures: failed ISI222, retaking ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 16, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','ISI211','BMT212','ELEC_S3','BMT211'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 16, course_id, 'failed' FROM course WHERE code IN ('ISI222');
INSERT INTO student_course (student_id, course_id, status)
SELECT 16, course_id, 'in_progress' FROM course WHERE code IN ('CSC221','CSC222','CSC223','CSS221','ISI222');

-- === IS-003 Amr (ID=17) — JUNIOR: completed sem1-5, in-progress sem6 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 17, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','ISI211','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','ISI312','CSC312','CSC311'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 17, course_id, 'in_progress' FROM course WHERE code IN (
  'CSC326','ISI321','ISI322','ISI323','ISI324'
);

-- === IS-004 Nada (ID=18) — SENIOR: completed sem1-7+summer, in-progress sem8 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 18, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','ISI211','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','ISI312','CSC312','CSC311',
  'CSC326','ISI321','ISI322','ISI323','ISI324',
  'TR333',
  'PR498','ISI411','ISI412','ISI413'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 18, course_id, 'in_progress' FROM course WHERE code IN (
  'PR499','ISI421','ISI422'
);

SELECT 'AI+IS enrollments done' AS status;
SELECT s.university_id, s.first_name, s.major,
  count(*) FILTER (WHERE sc.status='completed') AS completed,
  count(*) FILTER (WHERE sc.status='in_progress') AS in_progress,
  count(*) FILTER (WHERE sc.status='failed') AS failed
FROM student s JOIN student_course sc ON s.student_id=sc.student_id
WHERE s.major IN ('AI','IS')
GROUP BY s.university_id, s.first_name, s.major ORDER BY s.major, s.university_id;
