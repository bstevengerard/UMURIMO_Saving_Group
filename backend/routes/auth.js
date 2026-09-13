const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many resend requests, please try again later.' }
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', protect, authController.getCurrentMember);
router.post('/logout', protect, authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', resendLimiter, authController.resendVerificationEmail);

module.exports = router;
