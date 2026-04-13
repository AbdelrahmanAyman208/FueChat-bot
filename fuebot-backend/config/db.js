const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error:', err.message);
});

// Test connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ Database connection failed:', err.message);
  else console.log('✅ Database connected');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};
