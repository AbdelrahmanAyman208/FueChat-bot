/**
 * One-time utility to hash any plain-text passwords already in the DB.
 * Run with: npm run hash-passwords
 */
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function hashExistingPasswords() {
  try {
    console.log('🔐 Starting password hashing...');
    const result = await db.query('SELECT student_id, password FROM student');

    let updated = 0;
    for (const user of result.rows) {
      if (!user.password.startsWith('$2')) {
        const hashed = await bcrypt.hash(user.password, 10);
        await db.query('UPDATE student SET password = $1 WHERE student_id = $2', [hashed, user.student_id]);
        console.log(`  ✅ Hashed password for student ${user.student_id}`);
        updated++;
      }
    }

    console.log(`\n✔ Done. ${updated} password(s) updated, ${result.rows.length - updated} already hashed.`);
  } catch (error) {
    console.error('❌ Error hashing passwords:', error);
  } finally {
    process.exit();
  }
}

hashExistingPasswords();
