const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.post('/', protect, checkPermission('createMeeting'), meetingController.createMeeting);
router.get('/', protect, meetingController.getMeetings);
router.get('/:id', protect, meetingController.getMeetingById);
router.put('/:id', protect, checkPermission('updateMeeting'), meetingController.updateMeeting);
router.delete('/:id', protect, checkPermission('deleteMeeting'), meetingController.deleteMeeting);

router.post('/:id/attendance/open', protect, checkPermission('manageAttendance'), meetingController.openAttendance);
router.post('/:id/attendance/close', protect, checkPermission('manageAttendance'), meetingController.closeAttendance);
router.post('/:id/attendance/finalize', protect, checkPermission('manageAttendance'), meetingController.finalizeAttendance);
router.get('/:id/attendance', protect, meetingController.getMeetingAttendance);
router.get('/:id/attendance/summary', protect, meetingController.getMeetingAttendanceSummary);
router.post('/:id/attendance/bulk', protect, checkPermission('manageAttendance'), meetingController.bulkSaveAttendance);

module.exports = router;