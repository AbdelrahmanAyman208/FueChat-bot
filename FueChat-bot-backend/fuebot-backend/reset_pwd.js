require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  await db.query('UPDATE student SET password = $1 WHERE email = $2', [hash, 'hassan@example.com']);
  console.log('Password for hassan@example.com reset to: password123');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
