const db = require('../config/db');

// GET /student/profile
exports.getProfile = async (req, res) => {
  try {
    const studentId = req.user.id;

    const result = await db.query(
      `SELECT s.student_id, s.first_name, s.last_name, s.email, s.gpa, s.major,
              dr.description AS degree_description, dr.credits_needed,
              COALESCE(SUM(c.credits) FILTER (WHERE sc.status = 'completed'), 0) AS credits_earned
       FROM student s
       LEFT JOIN degree_requirement dr ON dr.req_id = s.req_id
       LEFT JOIN student_course sc ON sc.student_id = s.student_id
       LEFT JOIN course c ON c.course_id = sc.course_id
       WHERE s.student_id = $1
       GROUP BY s.student_id, dr.description, dr.credits_needed`,
      [studentId]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Student not found' });

    res.json({ profile: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /student/profile — update GPA or major
exports.updateProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { gpa, major } = req.body;

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

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
