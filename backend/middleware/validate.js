/**
 * Simple validation helper — no extra library needed.
 * Usage: router.post('/route', validate(rules), controller)
 */

const validate = (rules) => (req, res, next) => {
  const errors = [];

  for (const [field, checks] of Object.entries(rules)) {
    const value = req.body[field];

    if (checks.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }
    if (value === undefined || value === null || value === '') continue; // optional & empty — skip

    if (checks.minLength && String(value).length < checks.minLength) {
      errors.push(`${field} must be at least ${checks.minLength} characters`);
    }
    if (checks.maxLength && String(value).length > checks.maxLength) {
      errors.push(`${field} must be at most ${checks.maxLength} characters`);
    }
    if (checks.isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push(`${field} must be a valid email address`);
    }
    if (checks.isNumber && isNaN(Number(value))) {
      errors.push(`${field} must be a number`);
    }
    if (checks.min !== undefined && Number(value) < checks.min) {
      errors.push(`${field} must be at least ${checks.min}`);
    }
    if (checks.max !== undefined && Number(value) > checks.max) {
      errors.push(`${field} must be at most ${checks.max}`);
    }
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }
  next();
};

module.exports = validate;
