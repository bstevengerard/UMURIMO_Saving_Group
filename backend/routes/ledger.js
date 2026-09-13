const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
const { protect, admin } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permission');

router.use(protect);

router.get('/accounts', admin, ledgerController.listAccounts);
router.post('/accounts', admin, ledgerController.createAccount);
router.put('/accounts/:id', admin, ledgerController.updateAccount);

router.get('/transactions', admin, ledgerController.listTransactions);
router.get('/trial-balance', admin, ledgerController.getTrialBalance);

router.get('/reconciliation/loan/:loanId', admin, ledgerController.reconcileLoan);
router.get('/reconciliation/contributions', admin, ledgerController.reconcileContributions);
router.get('/reconciliation/shares', admin, ledgerController.reconcileShares);

router.post('/reverse/:entryId', admin, ledgerController.reverseEntry);

router.get('/member/:memberId/statement', (req, res, next) => {
  if (req.member.role !== 'admin' && req.member.id !== req.params.memberId) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  next();
}, ledgerController.getMemberStatement);

module.exports = router;
