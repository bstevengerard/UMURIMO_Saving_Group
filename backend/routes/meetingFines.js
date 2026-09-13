const express = require('express');
const router = express.Router();
const meetingFineController = require('../controllers/meetingFineController');
const { protect, admin } = require('../middleware/auth');

// Apply fines to absent members
router.post('/:meetingId/fines', protect, admin, meetingFineController.applyFinesToAbsent);

// Get fines for a meeting
router.get('/:meetingId/fines', protect, meetingFineController.getMeetingFines);

// Waive a fine
router.put('/:id/waive', protect, admin, meetingFineController.waiveFine);

// Mark fine as paid
router.put('/:id/mark-paid', protect, admin, meetingFineController.markFinePaid);

module.exports = router;
