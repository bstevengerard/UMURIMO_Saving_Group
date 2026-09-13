const express = require('express');
const router = express.Router();
const obligationController = require('../controllers/obligationController');
const { protect } = require('../middleware/auth');

router.get('/', protect, obligationController.getObligations);

module.exports = router;
