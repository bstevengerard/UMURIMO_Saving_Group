const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect } = require('../middleware/auth');

// @route   POST api/announcements
// @desc    Create an announcement (admin only)
// @access  Private (Admin only)
router.post('/', protect, announcementController.createAnnouncement);

// @route   GET api/announcements
// @desc    Get announcements (with optional filtering)
// @access  Private
router.get('/', protect, announcementController.getAnnouncements);

// @route   GET api/announcements/:id
// @desc    Get announcement by ID
// @access  Private
router.get('/:id', protect, announcementController.getAnnouncementById);

// @route   PUT api/announcements/:id
// @desc    Update announcement (admin only)
// @access  Private (Admin only)
router.put('/:id', protect, announcementController.updateAnnouncement);

// @route   DELETE api/announcements/:id
// @desc    Delete announcement (admin only)
// @access  Private (Admin only)
router.delete('/:id', protect, announcementController.deleteAnnouncement);

module.exports = router;