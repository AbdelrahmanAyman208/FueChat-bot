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

const fs = require('fs');
const path = require('path');

// ── GET /student/schedule ────────────────────────────────────────
// Fetches the available Level 8 schedules and the student's current status
exports.getScheduleInfo = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Check credits
    const creditRes = await db.query(
      `SELECT COALESCE(SUM(c.credits) FILTER (WHERE sc.status = 'completed'), 0) AS credits_earned
       FROM student_course sc
       LEFT JOIN course c ON c.course_id = sc.course_id
       WHERE sc.student_id = $1`, [studentId]
    );
    const credits = Number(creditRes.rows[0]?.credits_earned || 0);

    // If not Level 8
    if (credits < 102) {
      return res.json({ eligible: false, message: 'You need at least 102 credits to request a Level 8 schedule.' });
    }

    // Load available schedules
    const schedulesPath = path.join(__dirname, '../data/level8_schedules.json');
    const availableGroups = JSON.parse(fs.readFileSync(schedulesPath, 'utf-8'));

    // Get current request
    const reqRes = await db.query(
      `SELECT group_code, status, updated_at FROM student_schedule_request WHERE student_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [studentId]
    );

    res.json({
      eligible: true,
      availableGroups,
      currentRequest: reqRes.rows.length ? reqRes.rows[0] : null
    });
  } catch (error) {
    console.error('Get schedule info error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── POST /student/schedule ───────────────────────────────────────
// Submit a schedule group preference
exports.submitSchedule = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { groupCode } = req.body;

    if (!groupCode) return res.status(400).json({ message: 'Group code is required' });

    // Verify eligibility
    const creditRes = await db.query(
      `SELECT COALESCE(SUM(c.credits) FILTER (WHERE sc.status = 'completed'), 0) AS credits_earned
       FROM student_course sc
       LEFT JOIN course c ON c.course_id = sc.course_id
       WHERE sc.student_id = $1`, [studentId]
    );
    if (Number(creditRes.rows[0]?.credits_earned || 0) < 102) {
      return res.status(403).json({ message: 'Not eligible for Level 8 schedules.' });
    }

    // Check if an approved request exists
    const existing = await db.query(`SELECT status FROM student_schedule_request WHERE student_id = $1`, [studentId]);
    if (existing.rows.length && existing.rows[0].status === 'approved') {
      return res.status(400).json({ message: 'Your schedule has already been approved and cannot be changed.' });
    }

    // Insert or update
    await db.query(
      `INSERT INTO student_schedule_request (student_id, group_code, status, updated_at)
       VALUES ($1, $2, 'pending', NOW())
       ON CONFLICT (student_id) DO UPDATE SET group_code = EXCLUDED.group_code, status = 'pending', updated_at = NOW()`,
      [studentId, groupCode]
    );

    res.json({ message: 'Schedule requested successfully' });
  } catch (error) {
    console.error('Submit schedule error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
