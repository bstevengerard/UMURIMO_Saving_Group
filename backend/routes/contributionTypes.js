const express = require('express');
const router = express.Router();
const contributionTypeController = require('../controllers/contributionTypeController');
const { protect, admin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.post('/', protect, checkPermission('manage_contributions'), contributionTypeController.createContributionType);
router.get('/', protect, contributionTypeController.getContributionTypes);
router.put('/:id', protect, checkPermission('manage_contributions'), contributionTypeController.updateContributionType);
router.delete('/:id', protect, checkPermission('manage_contributions'), contributionTypeController.deleteContributionType);

module.exports = router;
