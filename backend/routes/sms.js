const express = require('express');
const router  = express.Router();
const smsController = require('../controllers/smsController');
const { protect, admin } = require('../middleware/auth');

// ── Templates ────────────────────────────────────────────────────────────────
router.post('/templates',            protect, admin, smsController.createTemplate);
router.get('/templates',             protect,        smsController.getTemplates);
router.put('/templates/:id',         protect, admin, smsController.updateTemplate);

// ── Sending ──────────────────────────────────────────────────────────────────
router.post('/send',                 protect, admin, smsController.sendSms);
router.post('/broadcast',            protect, admin, smsController.broadcastSms);
router.get('/',                      protect, admin, smsController.listNotifications);
router.put('/:id/status',            protect, admin, smsController.updateStatus);

// ── Subscription management ──────────────────────────────────────────────────
router.get('/subscription/me',       protect,        smsController.getSubscription);
router.put('/subscription/me',       protect,        smsController.updateSubscription);

module.exports = router;
