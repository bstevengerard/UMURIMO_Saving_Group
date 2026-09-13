const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.get('/history', protect, attendanceController.getAttendanceHistory);
router.post('/', protect, attendanceController.markAttendance);
router.post('/bulk', protect, checkPermission('manage_attendance'), attendanceController.bulkSaveAttendance);
router.get('/', protect, attendanceController.getAttendance);
router.put('/:id/verify', protect, checkPermission('verify_attendance'), attendanceController.verifyAttendance);
router.get('/stats', protect, attendanceController.getAttendanceStats);
router.get('/stats/:memberId', protect, attendanceController.getAttendanceStats);

module.exports = router;
