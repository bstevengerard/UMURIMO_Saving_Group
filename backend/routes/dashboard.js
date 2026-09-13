const express = require('express');
const router  = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get admin dashboard statistics
// @access  Private
router.get('/stats', protect, dashboardController.getStats);

// @route   GET /api/dashboard/overview
// @desc    Get aggregated admin dashboard data in a single request
// @access  Private (Admin only)
router.get('/overview', protect, dashboardController.getOverview);

module.exports = router;
