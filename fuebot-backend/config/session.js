const session = require('express-session');
require('dotenv').config();

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is missing from environment variables');
}

const sessionConfig = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    httpOnly: true,               // prevent XSS access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'lax',
  },
});

module.exports = sessionConfig;
