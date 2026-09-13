const express = require('express');
const router = express.Router();
const contributionController = require('../controllers/contributionController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

// @route   POST api/contributions
// @desc    Record a contribution (admin only)
// @access  Private (Admin only)
router.post('/', protect, checkPermission('recordContribution'), contributionController.recordContribution);

// @route   GET api/contributions
// @desc    Get contribution records (members see own, admins see all)
// @access  Private
router.get('/', protect, contributionController.getContributions);

module.exports = router;