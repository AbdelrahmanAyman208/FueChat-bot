const db = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendResetEmail } = require('../services/emailService');

// ── Student helpers ────────────────────────────────────────────────
const findStudentByEmailWithPassword = async (email) => {
  const r = await db.query('SELECT student_id, email, password FROM student WHERE email = $1', [email]);
  return r.rows[0];
};

const findStudentByEmail = async (email) => {
  const r = await db.query(
    'SELECT student_id, first_name, last_name, email, major, gpa FROM student WHERE email = $1',
    [email]
  );
  return r.rows[0];
};

// ── Advisor helpers ────────────────────────────────────────────────
const findAdvisorByEmailWithPassword = async (email) => {
  const r = await db.query('SELECT advisor_id, email, password FROM advisor WHERE email = $1', [email]);
  return r.rows[0];
};

const findAdvisorByEmail = async (email) => {
  const r = await db.query(
    'SELECT advisor_id, first_name, last_name, email, department FROM advisor WHERE email = $1',
    [email]
  );
  return r.rows[0];
};

// ── Register (student) ────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, major, gpa } = req.body;

    if (!firstName || !lastName || !email || !password || !major) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existing = await findStudentByEmailWithPassword(email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO student (first_name, last_name, email, password, gpa, major) VALUES ($1,$2,$3,$4,$5,$6) RETURNING student_id',
      [firstName, lastName, email, hashedPassword, gpa || null, major]
    );

    res.status(201).json({ message: 'Registered successfully', userId: result.rows[0].student_id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Register (advisor) ────────────────────────────────────────────
exports.registerAdvisor = async (req, res) => {
  try {
    const { firstName, lastName, email, password, department } = req.body;

    if (!firstName || !lastName || !email || !password || !department) {
      return res.status(400).json({ message: 'All fields are required (firstName, lastName, email, password, department)' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check both tables for duplicate email
    const existingStudent = await findStudentByEmailWithPassword(email);
    const existingAdvisor = await findAdvisorByEmailWithPassword(email);
    if (existingStudent || existingAdvisor) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO advisor (first_name, last_name, email, password, department) VALUES ($1,$2,$3,$4,$5) RETURNING advisor_id',
      [firstName, lastName, email, hashedPassword, department]
    );

    res.status(201).json({ message: 'Advisor registered successfully', advisorId: result.rows[0].advisor_id });
  } catch (error) {
    console.error('Register advisor error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Login (auto-detect role) ──────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    // Try student first
    let userWithPwd = await findStudentByEmailWithPassword(email);
    let role = 'student';

    // If not found in student, try advisor
    if (!userWithPwd) {
      userWithPwd = await findAdvisorByEmailWithPassword(email);
      role = 'advisor';
    }

    if (!userWithPwd) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, userWithPwd.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    if (role === 'student') {
      const user = await findStudentByEmail(email);
      req.session.userId = user.student_id;
      req.session.userEmail = user.email;
      req.session.userName = `${user.first_name} ${user.last_name}`;
      req.session.role = 'student';

      res.json({
        message: 'Logged in successfully',
        user: { id: user.student_id, email: user.email, name: `${user.first_name} ${user.last_name}`, major: user.major, role: 'student' },
      });
    } else {
      const advisor = await findAdvisorByEmail(email);
      req.session.userId = advisor.advisor_id;
      req.session.userEmail = advisor.email;
      req.session.userName = `${advisor.first_name} ${advisor.last_name}`;
      req.session.role = 'advisor';

      res.json({
        message: 'Logged in successfully',
        user: { id: advisor.advisor_id, email: advisor.email, name: `${advisor.first_name} ${advisor.last_name}`, department: advisor.department, role: 'advisor' },
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Logout ────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: 'Could not log out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
};

// ── Change Password (both roles) ─────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const email = req.user.email; // from session via requireAuth
    const role = req.user.role;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    let user;
    if (role === 'advisor') {
      user = await findAdvisorByEmailWithPassword(email);
    } else {
      user = await findStudentByEmailWithPassword(email);
    }

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Old password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);

    if (role === 'advisor') {
      await db.query('UPDATE advisor SET password = $1 WHERE email = $2', [hashed, email]);
    } else {
      await db.query('UPDATE student SET password = $1 WHERE email = $2', [hashed, email]);
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Me ────────────────────────────────────────────────────────────
exports.me = (req, res) => {
  res.json({ user: req.user });
};

// ── Forgot Password (request reset code) ─────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Find user in either table
    let user = null;
    let role = 'student';

    const studentResult = await db.query(
      'SELECT first_name, last_name, email FROM student WHERE email = $1', [email]
    );
    if (studentResult.rows.length) {
      user = studentResult.rows[0];
      role = 'student';
    } else {
      const advisorResult = await db.query(
        'SELECT first_name, last_name, email FROM advisor WHERE email = $1', [email]
      );
      if (advisorResult.rows.length) {
        user = advisorResult.rows[0];
        role = 'advisor';
      }
    }

    if (!user) {
      // Don't reveal if email exists — always return success
      return res.json({ message: 'If this email is registered, a reset code has been sent.' });
    }

    // Generate 6-digit code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate any previous tokens for this email
    await db.query(
      'UPDATE password_reset_token SET used = TRUE WHERE email = $1 AND used = FALSE',
      [email]
    );

    // Store token
    await db.query(
      'INSERT INTO password_reset_token (email, token, role, expires_at) VALUES ($1, $2, $3, $4)',
      [email, resetCode, role, expiresAt]
    );

    // Send email
    const userName = `${user.first_name} ${user.last_name}`;
    const result = await sendResetEmail(email, resetCode, userName);

    const response = { message: 'If this email is registered, a reset code has been sent.' };

    // In development, include the preview URL so you can see the email
    if (result.previewUrl) {
      response.previewUrl = result.previewUrl;
    }

    res.json(response);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Reset Password (verify code + set new password) ──────────────
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Find valid token
    const tokenResult = await db.query(
      `SELECT token_id, role FROM password_reset_token
       WHERE email = $1 AND token = $2 AND used = FALSE AND expires_at > NOW()`,
      [email, code]
    );

    if (!tokenResult.rows.length) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    const { token_id, role } = tokenResult.rows[0];

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Update password in the correct table
    if (role === 'advisor') {
      await db.query('UPDATE advisor SET password = $1 WHERE email = $2', [hashed, email]);
    } else {
      await db.query('UPDATE student SET password = $1 WHERE email = $2', [hashed, email]);
    }

    // Mark token as used
    await db.query('UPDATE password_reset_token SET used = TRUE WHERE token_id = $1', [token_id]);

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
