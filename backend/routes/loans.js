const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const repaymentController = require('../controllers/repaymentController');
const { protect } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');
const { getDB } = require('../lib/prisma');
const prisma = getDB();
const { calculateTotalRepayment, calculateMonthlyInstallment } = require('../services/calculationService');

router.get('/stats', protect, async (req, res) => {
  try {
    const prisma = require('../lib/prisma').getDB();
    const filter = req.member.role === 'admin' ? {} : { member_id: req.member.id };
    const [disbursed, pending, completed, overdue] = await Promise.all([
      prisma.loan.count({ where: { ...filter, status: { in: ['disbursed', 'overdue'] } } }),
      prisma.loan.count({ where: { ...filter, status: 'pending' } }),
      prisma.loan.count({ where: { ...filter, status: 'completed' } }),
      prisma.loan.count({ where: { ...filter, status: 'overdue' } })
    ]);

    const outstandingResult = await prisma.loan.aggregate({
      where: { ...filter, status: { in: ['disbursed', 'overdue'] } },
      _sum: { balance: true }
    });
    const totalDisbursedAmt = outstandingResult._sum.balance ? Number(outstandingResult._sum.balance) : 0;

    res.json({
      disbursedCount: disbursed,
      pendingCount: pending,
      completedCount: completed,
      totalDisbursedAmount: totalDisbursedAmt,
      totalPendingAmount: pending,
      overdueCount: overdue,
      repaymentPerformance: (disbursed + overdue) > 0 ? +(completed / (disbursed + overdue + completed) * 100).toFixed(1) : 0
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error', details: err.message });
  }
});

router.post('/preview', protect, async (req, res) => {
  try {
    const { amount, termMonths, interestRate } = req.body;
    if (!amount || !termMonths) {
      return res.status(400).json({ success: false, message: 'Amount and termMonths are required' });
    }
    const config = await prisma.loanConfiguration.findFirst();
    const rate = interestRate || config?.base_interest_rate || 5;
    const totalRepayment = calculateTotalRepayment(Number(amount), Number(rate), Number(termMonths));
    const monthlyInstallment = calculateMonthlyInstallment(totalRepayment, Number(termMonths));
    const interest = totalRepayment - Number(amount);
    res.json({ amount: Number(amount), interestRate: Number(rate), termMonths: Number(termMonths), totalRepayment, monthlyInstallment, interest });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', protect, loanController.submitLoanRequest);
router.get('/', protect, loanController.getLoans);
router.get('/eligibility', protect, loanController.getEligibility);
router.get('/:id', protect, loanController.getLoanById);
router.put('/:id', protect, checkPermission('updateLoanStatus'), loanController.updateLoanStatus);
router.put('/:id/cancel', protect, loanController.cancelLoan);
router.post('/:id/apply-interest-increment', protect, checkPermission('updateLoanStatus'), loanController.applyInterestIncrement);
router.post('/:loanId/schedule', protect, checkPermission('manage_loans'), repaymentController.generateSchedule);
router.get('/:loanId/schedule', protect, repaymentController.getSchedule);

module.exports = router;
