const express = require('express');
const router  = express.Router();
const monthlyReportController = require('../controllers/monthlyReportController');
const { protect } = require('../middleware/auth');

// ── Monthly Report Archive ────────────────────────────────────────────────────
router.get('/archive', protect, monthlyReportController.listMonthlyReports);

// ── Monthly Report Summary ────────────────────────────────────────────────────
router.get('/summary', protect, monthlyReportController.getMonthlyMemberSummary);

// ── Generate Monthly Report ───────────────────────────────────────────────────
router.post('/generate', protect, monthlyReportController.generateMonthlyMemberSummary);

// ── Export Monthly Report ─────────────────────────────────────────────────────
router.get('/export', protect, monthlyReportController.exportMonthlyMemberSummary);

module.exports = router;
