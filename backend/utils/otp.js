const crypto = require('crypto');

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function generateOtp() {
  return crypto.randomInt(0, 100000).toString().padStart(5, '0');
}

function hashString(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = {
  hashOtp,
  generateOtp,
  hashString,
};
