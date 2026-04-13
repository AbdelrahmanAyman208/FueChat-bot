/**
 * Global error handler — must be registered LAST in Express app.
 * Catches anything passed to next(err).
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Duplicate entry — this record already exists' });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist' });
  }

  // Postgres check constraint
  if (err.code === '23514') {
    return res.status(400).json({ message: 'Value out of allowed range' });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
