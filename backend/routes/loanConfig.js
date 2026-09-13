const express = require('express');
const router = express.Router();
const loanConfigController = require('../controllers/loanConfigController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, loanConfigController.getConfig);
router.put('/', protect, admin, loanConfigController.updateConfig);

module.exports = router;