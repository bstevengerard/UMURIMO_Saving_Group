function validateRequired(params, fields) {
  const missing = fields.filter(f => !params[f] && params[f] !== 0);
  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }
  return { valid: true };
}

function validatePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, message: `${fieldName} must be a positive number` };
  }
  return { valid: true, value: num };
}

function validateString(value, fieldName, minLength = 1, maxLength = 255) {
  if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
    return { valid: false, message: `${fieldName} must be between ${minLength} and ${maxLength} characters` };
  }
  return { valid: true, value: value.trim() };
}

function validateEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { valid: false, message: 'Invalid email format' };
  }
  return { valid: true };
}

module.exports = {
  validateRequired,
  validatePositiveNumber,
  validateString,
  validateEmail
};
