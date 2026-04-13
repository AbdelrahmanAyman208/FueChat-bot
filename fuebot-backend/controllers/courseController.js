const db = require('../config/db');

// GET /courses — list all courses
exports.getAllCourses = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT course_id, code, name, description, credits, instructor, semester FROM course ORDER BY code'
    );
    res.json({ courses: result.rows });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /courses/:code — get single course + its prerequisites
exports.getCourseByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const course = await db.query(
      'SELECT * FROM course WHERE UPPER(code) = $1',
      [code.toUpperCase()]
    );
    if (!course.rows.length) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const prereqs = await db.query(
      `SELECT c.code, c.name
       FROM course_prerequisite cp
       JOIN course c ON c.course_id = cp.prereq_course_id
       WHERE cp.course_id = $1`,
      [course.rows[0].course_id]
    );

    res.json({
      course: course.rows[0],
      prerequisites: prereqs.rows,
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /courses/student/enrolled — current student's courses
exports.getStudentCourses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await db.query(
      `SELECT c.course_id, c.code, c.name, c.credits, c.instructor, c.semester, sc.status
       FROM student_course sc
       JOIN course c ON c.course_id = sc.course_id
       WHERE sc.student_id = $1
       ORDER BY sc.status, c.code`,
      [studentId]
    );

    const grouped = {
      completed: result.rows.filter(r => r.status === 'completed'),
      in_progress: result.rows.filter(r => r.status === 'in_progress'),
      planned: result.rows.filter(r => r.status === 'planned'),
    };

    res.json(grouped);
  } catch (error) {
    console.error('Get student courses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /courses/student/enroll — enroll student in a course
exports.enrollCourse = async (req, res) => {
  try {
    const { courseCode, status = 'planned' } = req.body;
    const studentId = req.user.id;

    if (!courseCode) return res.status(400).json({ message: 'courseCode is required' });
    if (!['completed', 'in_progress', 'planned'].includes(status)) {
      return res.status(400).json({ message: 'status must be completed, in_progress, or planned' });
    }

    const course = await db.query('SELECT course_id FROM course WHERE UPPER(code) = $1', [courseCode.toUpperCase()]);
    if (!course.rows.length) return res.status(404).json({ message: 'Course not found' });

    const courseId = course.rows[0].course_id;

    // Check already enrolled
    const existing = await db.query(
      'SELECT 1 FROM student_course WHERE student_id = $1 AND course_id = $2',
      [studentId, courseId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'You are already enrolled in this course' });
    }

    await db.query(
      'INSERT INTO student_course (student_id, course_id, status) VALUES ($1, $2, $3)',
      [studentId, courseId, status]
    );

    res.status(201).json({ message: `Successfully enrolled in ${courseCode.toUpperCase()} with status: ${status}` });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /courses/student/:courseCode/status — update status of enrolled course
exports.updateCourseStatus = async (req, res) => {
  try {
    const { courseCode } = req.params;
    const { status } = req.body;
    const studentId = req.user.id;

    if (!['completed', 'in_progress', 'planned'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const course = await db.query('SELECT course_id FROM course WHERE UPPER(code) = $1', [courseCode.toUpperCase()]);
    if (!course.rows.length) return res.status(404).json({ message: 'Course not found' });

    const result = await db.query(
      'UPDATE student_course SET status = $1 WHERE student_id = $2 AND course_id = $3 RETURNING *',
      [status, studentId, course.rows[0].course_id]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Enrollment record not found' });

    res.json({ message: `Course status updated to "${status}"` });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
