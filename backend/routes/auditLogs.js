const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, admin } = require('../middleware/auth');

router.get('/', protect, admin, auditLogController.getAuditLogs);
router.get('/entity/:entityType/:entityId', protect, admin, auditLogController.getEntityAuditLogs);

module.exports = router;
