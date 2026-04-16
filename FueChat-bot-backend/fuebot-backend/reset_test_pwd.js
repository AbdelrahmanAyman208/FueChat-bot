const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function resetPassword() {
  const hash = await bcrypt.hash('student123', 10);
  await db.query('UPDATE student SET password = $1 WHERE email = $2', [hash, 'hassan@example.com']);
  console.log('✅ Password for hassan@example.com reset to: student123');
  process.exit(0);
}

resetPassword().catch(e => { console.error(e); process.exit(1); });
