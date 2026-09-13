const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.post('/', protect, checkPermission('manageShares'), shareController.upsertMemberShares);
router.get('/', protect, checkPermission('viewMembers'), shareController.getMemberShares);
router.get('/me', protect, shareController.getMemberShare);
router.get('/summary', protect, shareController.getTotalSharesSummary);
router.post('/distribute', protect, checkPermission('manageShares'), shareController.distributeShareProfit);
router.get('/distributions', protect, shareController.getShareProfitDistributions);
router.get('/config', protect, shareController.getShareConfiguration);
router.put('/config', protect, checkPermission('manageShares'), shareController.updateShareConfiguration);

module.exports = router;