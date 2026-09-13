const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { protect, admin } = require('../middleware/auth');

router.post('/send-test-email', protect, admin, async (req, res) => {
  try {
    const { to, subject = 'IKIMI test email', message = 'This is a test email from IKIMI.' } = req.body;
    if (!to) return res.status(400).json({ msg: 'Recipient email "to" is required' });

    const info = await emailService.sendNotificationEmail(
      { email: to, fullName: 'Test User' },
      { title: subject, message }
    );

    if (!info) return res.status(502).json({ msg: 'Email send failed or transporter not configured' });
    res.json({ msg: 'Test email sent', messageId: info.messageId });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
