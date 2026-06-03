const db = require('./config/db');
async function main() {
  const r1 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'course_prerequisite' ORDER BY ordinal_position");
  console.log('course_prerequisite columns:', r1.rows.map(x => x.column_name));
  
  const r2 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'student_course' ORDER BY ordinal_position");
  console.log('student_course columns:', r2.rows.map(x => x.column_name));

  // Check what student 27 has completed
  const r3 = await db.query("SELECT sc.course_id, c.code, c.name, sc.status FROM student_course sc JOIN course c ON c.course_id = sc.course_id WHERE sc.student_id = 27 ORDER BY sc.status, c.code");
  console.log('Student 27 courses:', r3.rows);

  // Count total courses
  const r4 = await db.query("SELECT COUNT(*) FROM course");
  console.log('Total courses:', r4.rows[0].count);

  process.exit();
}
main();
