const express = require('express');
const router  = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

// ── Weekly Contributions Report ───────────────────────────────────────────────
router.get('/contributions', protect, reportController.contributionsReport);

// ── Loan Report ───────────────────────────────────────────────────────────────
router.get('/loans', protect, reportController.loansReport);
router.get('/loans/print', protect, require('../middleware/auth').admin, reportController.printLoansReport);

// ── Attendance Report ─────────────────────────────────────────────────────────
router.get('/attendance', protect, reportController.attendanceReport);

// ── Defaulters Report ─────────────────────────────────────────────────────────
router.get('/defaulters', protect, require('../middleware/auth').admin, reportController.defaultersReport);

// ── Member Activity Report ────────────────────────────────────────────────────
router.get('/members/activity', protect, reportController.memberActivityReport);

module.exports = router;
