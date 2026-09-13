const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const { protect, admin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.post('/', protect, checkPermission('manage_contributions'), savingsController.recordSavings);
router.get('/', protect, savingsController.getSavings);
router.get('/summary/:memberId', protect, savingsController.getMemberSavingsSummary);
router.put('/:id', protect, checkPermission('manage_contributions'), savingsController.updateSavings);
router.delete('/:id', protect, checkPermission('manage_contributions'), savingsController.deleteSavings);

module.exports = router;
