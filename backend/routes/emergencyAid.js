const express = require('express');
const router = express.Router();
const emergencyAidController = require('../controllers/emergencyAidController');
const { protect, admin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.post('/', protect, checkPermission('manage_contributions'), emergencyAidController.createEmergencyAid);
router.get('/', protect, emergencyAidController.getEmergencyAids);
router.get('/my-obligations', protect, emergencyAidController.getMyEmergencyAidObligations);
router.get('/:id', protect, emergencyAidController.getEmergencyAidById);
router.put('/:id', protect, checkPermission('manage_contributions'), emergencyAidController.updateEmergencyAid);
router.delete('/:id', protect, checkPermission('manage_contributions'), emergencyAidController.deleteEmergencyAid);
router.post('/:id/close', protect, checkPermission('manage_contributions'), emergencyAidController.closeEmergencyAid);
router.post('/:emergencyAidId/payments', protect, checkPermission('manage_contributions'), emergencyAidController.recordPayment);
router.get('/:emergencyAidId/payments', protect, emergencyAidController.getPayments);
router.post('/:emergencyAidId/apply-fines', protect, checkPermission('manage_contributions'), emergencyAidController.applyFines);

module.exports = router;
