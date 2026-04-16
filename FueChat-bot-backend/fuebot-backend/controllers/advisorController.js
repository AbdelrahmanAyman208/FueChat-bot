const db = require('../config/db');

// ── GET /advisor/profile ──────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const advisorId = req.user.id;

    const result = await db.query(
      `SELECT a.advisor_id, a.first_name, a.last_name, a.email, a.department,
              COUNT(s.student_id) AS assigned_students
       FROM advisor a
       LEFT JOIN student s ON s.advisor_id = a.advisor_id
       WHERE a.advisor_id = $1
       GROUP BY a.advisor_id`,
      [advisorId]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Advisor not found' });

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Get advisor profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /advisor/students ─────────────────────────────────────────
exports.getAssignedStudents = async (req, res) => {
  try {
    const advisorId = req.user.id;

    const result = await db.query(
      `SELECT s.student_id, s.university_id, s.first_name, s.last_name, s.email, s.major, s.gpa,
              COALESCE(SUM(c.credits) FILTER (WHERE sc.status = 'completed'), 0) AS credits_earned,
              COUNT(sc.course_id) FILTER (WHERE sc.status = 'completed') AS completed_courses,
              COUNT(sc.course_id) FILTER (WHERE sc.status = 'in_progress') AS in_progress_courses
       FROM student s
       LEFT JOIN student_course sc ON sc.student_id = s.student_id
       LEFT JOIN course c ON c.course_id = sc.course_id
       WHERE s.advisor_id = $1
       GROUP BY s.student_id
       ORDER BY s.last_name, s.first_name`,
      [advisorId]
    );

    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get assigned students error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /advisor/students/:studentId ──────────────────────────────
exports.getStudentDetails = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { studentId } = req.params;

    // Verify the student is assigned to this advisor
    const studentResult = await db.query(
      `SELECT s.student_id, s.university_id, s.first_name, s.last_name, s.email, s.gpa, s.major,
              dr.description AS degree_description, dr.credits_needed
       FROM student s
       LEFT JOIN degree_requirement dr ON dr.req_id = s.req_id
       WHERE s.student_id = $1 AND s.advisor_id = $2`,
      [studentId, advisorId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ message: 'Student not found or not assigned to you' });
    }

    const student = studentResult.rows[0];

    // Get student's courses
    const coursesResult = await db.query(
      `SELECT c.course_id, c.code, c.name, c.credits, c.instructor, c.semester, sc.status
       FROM student_course sc
       JOIN course c ON c.course_id = sc.course_id
       WHERE sc.student_id = $1
       ORDER BY sc.status, c.code`,
      [studentId]
    );

    const courses = coursesResult.rows;
    const creditsEarned = courses
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + c.credits, 0);

    res.json({
      student: {
        ...student,
        credits_earned: creditsEarned,
        credits_remaining: (student.credits_needed || 0) - creditsEarned,
      },
      courses: {
        completed: courses.filter(c => c.status === 'completed'),
        in_progress: courses.filter(c => c.status === 'in_progress'),
        planned: courses.filter(c => c.status === 'planned'),
        failed: courses.filter(c => c.status === 'failed'),
      },
    });
  } catch (error) {
    console.error('Get student details error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /advisor/students/:studentId/course/:courseCode ─────────
// Advisor can update a student's course status
exports.updateStudentCourseStatus = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { studentId, courseCode } = req.params;
    const { status } = req.body;

    if (!['completed', 'in_progress', 'planned', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be completed, in_progress, planned, or failed' });
    }

    // Verify the student is assigned to this advisor
    const studentCheck = await db.query(
      'SELECT student_id FROM student WHERE student_id = $1 AND advisor_id = $2',
      [studentId, advisorId]
    );
    if (!studentCheck.rows.length) {
      return res.status(403).json({ message: 'Student not assigned to you' });
    }

    // Find the course
    const course = await db.query(
      'SELECT course_id FROM course WHERE UPPER(code) = $1',
      [courseCode.toUpperCase()]
    );
    if (!course.rows.length) return res.status(404).json({ message: 'Course not found' });

    // Update
    const result = await db.query(
      'UPDATE student_course SET status = $1 WHERE student_id = $2 AND course_id = $3 RETURNING *',
      [status, studentId, course.rows[0].course_id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Student is not enrolled in this course' });
    }

    res.json({ message: `Course ${courseCode.toUpperCase()} status updated to "${status}" for student ${studentId}` });
  } catch (error) {
    console.error('Update student course status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── POST /advisor/students/:studentId/enroll ─────────────────────
// Advisor can enroll a student in a course
exports.enrollStudentInCourse = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { studentId } = req.params;
    const { courseCode, status = 'planned' } = req.body;

    if (!courseCode) return res.status(400).json({ message: 'courseCode is required' });
    if (!['completed', 'in_progress', 'planned', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be completed, in_progress, planned, or failed' });
    }

    // Verify the student is assigned to this advisor
    const studentCheck = await db.query(
      'SELECT student_id FROM student WHERE student_id = $1 AND advisor_id = $2',
      [studentId, advisorId]
    );
    if (!studentCheck.rows.length) {
      return res.status(403).json({ message: 'Student not assigned to you' });
    }

    const course = await db.query(
      'SELECT course_id FROM course WHERE UPPER(code) = $1',
      [courseCode.toUpperCase()]
    );
    if (!course.rows.length) return res.status(404).json({ message: 'Course not found' });

    const courseId = course.rows[0].course_id;

    // Check already enrolled
    const existing = await db.query(
      'SELECT 1 FROM student_course WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'Student is already enrolled in this course' });
    }

    await db.query(
      'INSERT INTO student_course (student_id, course_id, status) VALUES ($1, $2, $3)',
      [studentId, courseId, status]
    );

    res.status(201).json({ message: `Student ${studentId} enrolled in ${courseCode.toUpperCase()} with status: ${status}` });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── PATCH /advisor/students/:studentId/profile ───────────────────
// Advisor can update a student's GPA or major
exports.updateStudentProfile = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { studentId } = req.params;
    const { gpa, major } = req.body;

    // Verify the student is assigned to this advisor
    const studentCheck = await db.query(
      'SELECT student_id FROM student WHERE student_id = $1 AND advisor_id = $2',
      [studentId, advisorId]
    );
    if (!studentCheck.rows.length) {
      return res.status(403).json({ message: 'Student not assigned to you' });
    }

    if (gpa !== undefined && (gpa < 0 || gpa > 4.0)) {
      return res.status(400).json({ message: 'GPA must be between 0.00 and 4.00' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (gpa !== undefined) { fields.push(`gpa = $${idx++}`); values.push(gpa); }
    if (major) { fields.push(`major = $${idx++}`); values.push(major); }

    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });

    values.push(studentId);
    await db.query(`UPDATE student SET ${fields.join(', ')} WHERE student_id = $${idx}`, values);

    res.json({ message: 'Student profile updated successfully' });
  } catch (error) {
    console.error('Update student profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── POST /advisor/students/:studentId/assign ─────────────────────
// Assign a student to this advisor
exports.assignStudent = async (req, res) => {
  try {
    const advisorId = req.user.id;
    const { studentId } = req.params;

    const student = await db.query('SELECT student_id, advisor_id FROM student WHERE student_id = $1', [studentId]);
    if (!student.rows.length) return res.status(404).json({ message: 'Student not found' });

    const currentAdvisor = student.rows[0].advisor_id;

    if (currentAdvisor === advisorId) {
      return res.status(409).json({ message: 'Student is already assigned to you' });
    }

    if (currentAdvisor !== null) {
      return res.status(409).json({
        message: 'Student is already assigned to another advisor. They must be unassigned first.',
      });
    }

    await db.query('UPDATE student SET advisor_id = $1 WHERE student_id = $2', [advisorId, studentId]);

    res.json({ message: `Student ${studentId} assigned to you successfully` });
  } catch (error) {
    console.error('Assign student error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /advisor/students/all ────────────────────────────────────
// List all students (for assigning)
exports.getAllStudents = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.student_id, s.university_id, s.first_name, s.last_name, s.email, s.major, s.gpa, s.advisor_id,
              a.first_name AS advisor_first_name, a.last_name AS advisor_last_name
       FROM student s
       LEFT JOIN advisor a ON a.advisor_id = s.advisor_id
       ORDER BY s.last_name, s.first_name`
    );

    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get all students error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /advisor/students/search ─────────────────────────────────
// Search for any student globally by email or university ID
exports.searchStudents = async (req, res) => {
  try {
    let { query } = req.query;
    
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ message: 'Search query must be at least 3 characters long' });
    }

    const searchTerm = `%${query.trim()}%`;

    const result = await db.query(
      `SELECT s.student_id, s.university_id, s.first_name, s.last_name, s.email, s.major, s.gpa, s.advisor_id,
              a.first_name AS advisor_first_name, a.last_name AS advisor_last_name
       FROM student s
       LEFT JOIN advisor a ON a.advisor_id = s.advisor_id
       WHERE s.email ILIKE $1 OR s.university_id ILIKE $1 OR s.first_name ILIKE $1 OR s.last_name ILIKE $1
       ORDER BY s.last_name, s.first_name
       LIMIT 20`,
      [searchTerm]
    );

    res.json({ students: result.rows });
  } catch (error) {
    console.error('Search students error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
