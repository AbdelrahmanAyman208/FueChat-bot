-- ENROLLMENTS: DM (19-22), DS (23-26), CY (27-30)

-- === DM-001 Ali (ID=19) — FRESHMAN ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 19, course_id, 'completed' FROM course WHERE code IN ('ENG101','BMT111','BMT112','BPH111','CSC111','PSC110');
INSERT INTO student_course (student_id, course_id, status)
SELECT 19, course_id, 'in_progress' FROM course WHERE code IN ('ENG102','BMT121','CSC121','CPS121','BMT122','CSC122');

-- === DM-002 Salma (ID=20) — SOPHOMORE w/failures: failed CSC211 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 20, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','DMT212','BMT212','ELEC_S3','BMT211'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 20, course_id, 'failed' FROM course WHERE code IN ('CSC211');
INSERT INTO student_course (student_id, course_id, status)
SELECT 20, course_id, 'in_progress' FROM course WHERE code IN ('CSC211');

-- === DM-003 Hazem (ID=21) — JUNIOR: completed sem1-5, in-progress sem6 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 21, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','DMT212','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','DMT311','CSC312','CSC311'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 21, course_id, 'in_progress' FROM course WHERE code IN (
  'CSC326','DMT322','DMT323','DMT324','DMT325','DMT326'
);

-- === DM-004 Mariam (ID=22) — SENIOR: completed through sem7, in-progress sem8 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 22, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','DMT212','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','DMT311','CSC312','CSC311',
  'CSC326','DMT322','DMT323','DMT324','DMT325','DMT326',
  'TR333','PR498','DMT411','DMT412'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 22, course_id, 'in_progress' FROM course WHERE code IN ('PR499','DMT421','DMT422');

-- === DS-001 Khaled (ID=23) — FRESHMAN ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 23, course_id, 'completed' FROM course WHERE code IN ('ENG101','BMT111','BMT112','BPH111','CSC111','PSC110');
INSERT INTO student_course (student_id, course_id, status)
SELECT 23, course_id, 'in_progress' FROM course WHERE code IN ('ENG102','BMT121','CSC121','CPS121','BMT122','CSC122');

-- === DS-002 Hana (ID=24) — SOPHOMORE w/failures: failed BMT211 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 24, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','ISD211','BMT212','ELEC_S3'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 24, course_id, 'failed' FROM course WHERE code IN ('BMT211');
INSERT INTO student_course (student_id, course_id, status)
SELECT 24, course_id, 'in_progress' FROM course WHERE code IN ('CSC221','CSC222','CSC223','CSS221','ISI222');

-- === DS-003 Bassem (ID=25) — JUNIOR: completed sem1-5, in-progress sem6 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 25, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','ISD211','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','CSC311','CSC312','ISD311'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 25, course_id, 'in_progress' FROM course WHERE code IN ('ISD321','ISD322','CSA321','CSC326');

-- === DS-004 Yasmin (ID=26) — SENIOR: completed through sem7, in-progress sem8 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 26, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','ISD211','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'ISI311','CSA311','CSS312','CSC311','CSC312','ISD311',
  'ISD321','ISD322','CSA321','CSC326',
  'TR333','CSA411','ISD411','ISD412','CSC411','PR498'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 26, course_id, 'in_progress' FROM course WHERE code IN ('ISD421','ISD422','PR499');

-- === CY-001 Seif (ID=27) — FRESHMAN ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 27, course_id, 'completed' FROM course WHERE code IN ('ENG101','BMT111','BMT112','BPH111','CSC111','PSC110');
INSERT INTO student_course (student_id, course_id, status)
SELECT 27, course_id, 'in_progress' FROM course WHERE code IN ('ENG102','BMT121','CSC121','CPS121','BMT122','CSC122');

-- === CY-002 Reem (ID=28) — SOPHOMORE w/failures: failed CSC211+BMT213 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 28, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','BMT212','ELEC_S3','BMT211'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 28, course_id, 'failed' FROM course WHERE code IN ('CSC211','BMT213');
INSERT INTO student_course (student_id, course_id, status)
SELECT 28, course_id, 'in_progress' FROM course WHERE code IN ('CSC211','BMT213');

-- === CY-003 Tarek (ID=29) — JUNIOR: completed sem1-5, in-progress sem6 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 29, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BMT213','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'CSS311','CSA311','CSS312','CSC311','CSS313','CSC312'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 29, course_id, 'in_progress' FROM course WHERE code IN ('CSS321','CSC326','CSS322','CSS323','CSS324');

-- === CY-004 Noura (ID=30) — SENIOR: completed through sem7, in-progress sem8 ===
INSERT INTO student_course (student_id, course_id, status)
SELECT 30, course_id, 'completed' FROM course WHERE code IN (
  'ENG101','BMT111','BMT112','BPH111','CSC111','PSC110',
  'ENG102','BMT121','CSC121','CPS121','BMT122','CSC122',
  'CPS211','CSC211','BMT213','BMT212','ELEC_S3','BMT211',
  'CSC221','CSC222','CSC223','CSS221','ISI222',
  'CSS311','CSA311','CSS312','CSC311','CSS313','CSC312',
  'CSS321','CSC326','CSS322','CSS323','CSS324',
  'TR333','PR498','CSC411','CSS411'
);
INSERT INTO student_course (student_id, course_id, status)
SELECT 30, course_id, 'in_progress' FROM course WHERE code IN ('PR499','CSS421','CSS422');

-- Verify all
SELECT '--- All New Students Summary ---';
SELECT s.university_id, s.first_name||' '||s.last_name AS name, s.major, s.gpa,
  count(*) FILTER (WHERE sc.status='completed') AS done,
  count(*) FILTER (WHERE sc.status='in_progress') AS current,
  count(*) FILTER (WHERE sc.status='failed') AS failed
FROM student s JOIN student_course sc ON s.student_id=sc.student_id
WHERE s.major IN ('DM','DS','CY')
GROUP BY s.university_id, s.first_name, s.last_name, s.major, s.gpa
ORDER BY s.major, s.university_id;
