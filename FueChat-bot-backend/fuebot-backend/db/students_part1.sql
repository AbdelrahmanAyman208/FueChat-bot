-- Step 1: Add advisors for new departments
INSERT INTO advisor (first_name, last_name, email, password, department) VALUES
  ('Dr. Mona','Kamal','mona.advisor@fue.edu.eg','$2a$10$SUy/13TUiaiRZiuFzMvmTeUx2qShm3BtN5F5CsHJAVjnKqNvGz/Rq','AI'),
  ('Dr. Tarek','Nabil','tarek.advisor@fue.edu.eg','$2a$10$SUy/13TUiaiRZiuFzMvmTeUx2qShm3BtN5F5CsHJAVjnKqNvGz/Rq','DM'),
  ('Dr. Heba','Farid','heba.advisor@fue.edu.eg','$2a$10$SUy/13TUiaiRZiuFzMvmTeUx2qShm3BtN5F5CsHJAVjnKqNvGz/Rq','DS'),
  ('Dr. Khaled','Youssef','khaled.advisor@fue.edu.eg','$2a$10$SUy/13TUiaiRZiuFzMvmTeUx2qShm3BtN5F5CsHJAVjnKqNvGz/Rq','CY')
ON CONFLICT DO NOTHING;

-- Step 2: Add 4 students per new program (AI=3, IS=2, DM=4, DS=5, CY=6 advisor_id)
-- Cases: 1=Freshman, 2=Sophomore w/failures, 3=Junior on-track, 4=Senior near graduation
INSERT INTO student (university_id, first_name, last_name, email, password, gpa, major, req_id, advisor_id) VALUES
  -- AI Students (req_id=3, advisor=3)
  ('FUE-AI-001','Ziad','Hassan','ziad.ai@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.20,'AI',3,3),
  ('FUE-AI-002','Layla','Adel','layla.ai@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',2.40,'AI',3,3),
  ('FUE-AI-003','Youssef','Magdy','youssef.ai@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.60,'AI',3,3),
  ('FUE-AI-004','Dina','Sherif','dina.ai@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.80,'AI',3,3),
  -- IS Students (req_id=2, advisor=2)
  ('FUE-IS-001','Tamer','Hossam','tamer.is@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.10,'IS',2,2),
  ('FUE-IS-002','Rana','Emad','rana.is@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',2.30,'IS',2,2),
  ('FUE-IS-003','Amr','Gamal','amr.is@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.45,'IS',2,2),
  ('FUE-IS-004','Nada','Fathy','nada.is@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.90,'IS',2,2),
  -- DM Students (req_id=4, advisor=4)
  ('FUE-DM-001','Ali','Wael','ali.dm@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.00,'DM',4,4),
  ('FUE-DM-002','Salma','Ashraf','salma.dm@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',2.20,'DM',4,4),
  ('FUE-DM-003','Hazem','Reda','hazem.dm@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.55,'DM',4,4),
  ('FUE-DM-004','Mariam','Samy','mariam.dm@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.75,'DM',4,4),
  -- DS Students (req_id=5, advisor=5)
  ('FUE-DS-001','Khaled','Nour','khaled.ds@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.15,'DS',5,5),
  ('FUE-DS-002','Hana','Tawfik','hana.ds@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',2.50,'DS',5,5),
  ('FUE-DS-003','Bassem','Lotfy','bassem.ds@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.40,'DS',5,5),
  ('FUE-DS-004','Yasmin','Fouad','yasmin.ds@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.85,'DS',5,5),
  -- CY Students (req_id=6, advisor=6)
  ('FUE-CY-001','Seif','Mansour','seif.cy@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.05,'CY',6,6),
  ('FUE-CY-002','Reem','Badr','reem.cy@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',2.10,'CY',6,6),
  ('FUE-CY-003','Tarek','Hamdy','tarek.cy@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.50,'CY',6,6),
  ('FUE-CY-004','Noura','Samir','noura.cy@fue.edu.eg','$2a$10$7bT.n302akx2pLt7vMLdReZjirt4UXSRlgnSQQnZGqWAtpfvqL6FO',3.70,'CY',6,6);

SELECT '--- Students Added ---';
SELECT student_id, university_id, first_name, last_name, major, gpa FROM student WHERE major IN ('AI','IS','DM','DS','CY') ORDER BY major, student_id;
