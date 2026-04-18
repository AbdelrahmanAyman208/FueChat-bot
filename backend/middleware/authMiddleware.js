const db = require('../config/db');

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ message: 'Unauthorized — please log in' });
    }

    const role = req.session.role || 'student';

    if (role === 'advisor') {
      const result = await db.query(
        'SELECT advisor_id, first_name, last_name, email, department FROM advisor WHERE advisor_id = $1',
        [req.session.userId]
      );

      if (!result.rows.length) {
        req.session.destroy();
        return res.status(401).json({ message: 'Session invalid — please log in again' });
      }

      const advisor = result.rows[0];
      req.user = {
        id: advisor.advisor_id,
        email: advisor.email,
        name: `${advisor.first_name} ${advisor.last_name}`,
        department: advisor.department,
        role: 'advisor',
      };
    } else {
      const result = await db.query(
        'SELECT student_id, first_name, last_name, email, major, gpa FROM student WHERE student_id = $1',
        [req.session.userId]
      );

      if (!result.rows.length) {
        req.session.destroy();
        return res.status(401).json({ message: 'Session invalid — please log in again' });
      }

      const user = result.rows[0];
      req.user = {
        id: user.student_id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        major: user.major,
        gpa: user.gpa,
        role: 'student',
      };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Restrict access to a specific role.
 * Usage: router.use(requireRole('advisor'))
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden — insufficient permissions' });
  }
  next();
};

module.exports = requireAuth;
module.exports.requireRole = requireRole;
