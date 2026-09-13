const express = require('express');
const router  = express.Router();
const repaymentController = require('../controllers/repaymentController');
const { protect, admin } = require('../middleware/auth');

router.post('/:loanId/schedule', protect, admin, repaymentController.generateSchedule);
router.get('/:loanId/schedule', protect, repaymentController.getSchedule);
router.get('/installments/:installmentId', protect, repaymentController.getInstallment);
router.put('/installments/:installmentId/pay', protect, repaymentController.recordPayment);
router.put('/installments/:installmentId/approve', protect, admin, repaymentController.approvePayment);
router.put('/installments/:installmentId/deny', protect, admin, repaymentController.denyPayment);
router.get('/history', protect, repaymentController.getRepaymentHistory);
router.get('/overdue', protect, repaymentController.getOverdueInstallments);
router.get('/pending', protect, admin, repaymentController.getPendingApprovals);

module.exports = router;
