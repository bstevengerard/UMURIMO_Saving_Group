const express = require('express');
const router  = express.Router();
const passwordController = require('../controllers/passwordController');
const { protect } = require('../middleware/auth');

const otpLimiter = require('../middleware/otpLimiter');

router.post('/forgot-password', otpLimiter, passwordController.forgotPassword);
router.post('/verify-otp', otpLimiter, passwordController.verifyOtp);
router.post('/reset-password', passwordController.resetPassword);
router.post('/resend-otp', otpLimiter, passwordController.resendOtp);

module.exports = router;
