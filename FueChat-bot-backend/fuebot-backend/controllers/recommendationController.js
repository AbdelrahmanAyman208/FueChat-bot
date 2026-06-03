const db = require('../config/db');

// Helper: auto-generate recommendations for courses the student is eligible to take next
async function autoRecommend(studentId) {
  const query = `
    WITH completed AS (
      SELECT course_id FROM student_course WHERE student_id = $1 AND status = 'completed'
    ),
    in_progress AS (
      SELECT course_id FROM student_course WHERE student_id = $1 AND status = 'in_progress'
    ),
    taken AS (
      SELECT course_id FROM student_course WHERE student_id = $1
    ),
    eligible AS (
      SELECT c.course_id, c.code, c.name, c.credits, c.semester, c.description
      FROM course c
      WHERE c.course_id NOT IN (SELECT course_id FROM taken)
        AND NOT EXISTS (
          -- all prerequisites must be completed or in_progress
          SELECT 1 FROM course_prerequisite cp
          WHERE cp.course_id = c.course_id
            AND cp.prereq_course_id NOT IN (SELECT course_id FROM completed)
            AND cp.prereq_course_id NOT IN (SELECT course_id FROM in_progress)
        )
    )
    SELECT
      e.course_id AS id,
      e.course_id,
      e.code,
      e.name,
      e.credits,
      e.semester,
      e.description,
      -- score: prefer courses with more prerequisites met (advanced courses)
      (SELECT COUNT(*) FROM course_prerequisite cp WHERE cp.course_id = e.course_id) * 20 + 60 AS score,
      'Eligible — all prerequisites completed or in progress' AS reason,
      COALESCE((
        SELECT json_agg(pc.code)
        FROM course_prerequisite cp2
        JOIN course pc ON cp2.prereq_course_id = pc.course_id
        WHERE cp2.course_id = e.course_id
      ), '[]'::json) AS prerequisites
    FROM eligible e
    ORDER BY
      (SELECT COUNT(*) FROM course_prerequisite cp WHERE cp.course_id = e.course_id) DESC,
      e.code ASC
    LIMIT 20
  `;
  const result = await db.query(query, [studentId]);
  return result.rows;
}

exports.getRecommendations = async (req, res) => {
  try {
    const studentId = req.user.role === 'advisor' ? req.params.studentId : req.user.id;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID required' });
    }

    // First check for advisor-curated recommendations
    const advisorRecs = await db.query(
      `SELECT r.rec_id AS id, r.course_id, r.score, r.reason,
              c.code, c.name, c.credits, c.semester,
              COALESCE((
                  SELECT json_agg(pc.code)
                  FROM course_prerequisite cp
                  JOIN course pc ON cp.prereq_course_id = pc.course_id
                  WHERE cp.course_id = c.course_id
              ), '[]'::json) AS prerequisites
       FROM student_recommendations r
       JOIN course c ON r.course_id = c.course_id
       WHERE r.student_id = $1
       ORDER BY r.score DESC`,
      [studentId]
    );

    if (advisorRecs.rows.length > 0) {
      return res.json(advisorRecs.rows);
    }

    // No advisor recommendations — auto-generate based on eligibility
    const auto = await autoRecommend(studentId);
    return res.json(auto);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.addRecommendation = async (req, res) => {
  try {
    if (req.user.role !== 'advisor') return res.status(403).json({ message: 'Forbidden' });
    const { studentId, courseId, score, reason } = req.body;
    
    if (!studentId || !courseId) return res.status(400).json({ message: 'Student ID and Course ID are required' });

    const result = await db.query(
      `INSERT INTO student_recommendations (student_id, course_id, score, reason) 
       VALUES ($1, $2, $3, $4) 
       RETURNING rec_id AS id`,
      [studentId, courseId, score || 0, reason || '']
    );

    res.status(201).json({ message: 'Recommendation added', id: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ message: 'Course is already recommended for this student.' });
    }
    console.error('Add recommendation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.updateRecommendation = async (req, res) => {
  try {
    if (req.user.role !== 'advisor') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { score, reason } = req.body;

    await db.query(
      `UPDATE student_recommendations SET score = $1, reason = $2 WHERE rec_id = $3`,
      [score, reason, id]
    );

    res.json({ message: 'Recommendation updated' });
  } catch (error) {
    console.error('Update recommendation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteRecommendation = async (req, res) => {
  try {
    if (req.user.role !== 'advisor') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;

    await db.query(`DELETE FROM student_recommendations WHERE rec_id = $1`, [id]);
    res.json({ message: 'Recommendation deleted' });
  } catch (error) {
    console.error('Delete recommendation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
