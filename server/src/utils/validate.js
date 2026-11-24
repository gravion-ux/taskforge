const { ApiError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === '' || body[f] === null);
  if (missing.length) throw new ApiError(400, `Missing required field(s): ${missing.join(', ')}`);
}

function validateEmail(email) {
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Invalid email address');
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters');
  }
}

function validateString(value, field, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new ApiError(400, `${field} must be a string of ${min}-${max} characters`);
  }
}

function validateEnum(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw new ApiError(400, `${field} must be one of: ${allowed.join(', ')}`);
  }
}

module.exports = { requireFields, validateEmail, validatePassword, validateString, validateEnum };
