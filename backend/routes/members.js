const express = require('express');
const router  = express.Router();
const memberController = require('../controllers/memberController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.get('/', protect, checkPermission('view_members'), memberController.getAllMembers);
router.get('/pending', protect, checkPermission('approve_member'), memberController.getPendingApprovals);
router.get('/:id', protect, memberController.getMemberById);
router.post('/', protect, checkPermission('manage_members'), memberController.createMember);
router.put('/:id', protect, checkPermission('manage_members'), memberController.updateMember);
router.put('/:id/status', protect, checkPermission('manage_members'), memberController.setMemberStatus);
router.put('/:id/approve', protect, checkPermission('approve_member'), memberController.approveMember);
router.put('/:id/reset-password', protect, checkPermission('manage_members'), memberController.resetMemberPassword);
router.put('/me', protect, memberController.updateOwnProfile);
router.post('/:id/documents', protect, checkPermission('approve_member'), memberController.uploadDocument);
router.delete('/:id', protect, checkPermission('manage_members'), memberController.deleteMember);

module.exports = router;
