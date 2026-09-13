const { getDB } = require('../lib/prisma');
const prisma = getDB();
const ledgerService = require('../services/ledgerService');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

const { admin } = require('../middleware/auth');

const listAccounts = async (req, res) => {
  try {
    const { type, category, is_active } = req.query;
    const where = {};
    if (type) where.account_type = type;
    if (category) where.category = category;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const accounts = await prisma.chartOfAccount.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { select: { id: true, code: true, name: true } },
      },
    });

    sendSuccess(res, 'Chart of accounts fetched', accounts);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const createAccount = async (req, res) => {
  try {
    const { code, name, account_type, category, parent_id, description } = req.body;

    if (!code || !name || !account_type || !category) {
      return sendError(res, 400, 'code, name, account_type and category are required');
    }

    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense'];
    if (!validTypes.includes(account_type)) {
      return sendError(res, 400, 'Invalid account_type');
    }

    const account = await prisma.chartOfAccount.create({
      data: {
        code,
        name,
        account_type,
        category,
        parent_id: parent_id || null,
        description: description || '',
      },
    });

    sendSuccess(res, 'Account created', account, 201);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description, is_active } = req.body;

    const account = await prisma.chartOfAccount.update({
      where: { id },
      data: {
        name: name || undefined,
        parent_id: parent_id !== undefined ? parent_id : undefined,
        description: description !== undefined ? description : undefined,
        is_active: is_active !== undefined ? is_active : undefined,
      },
    });

    sendSuccess(res, 'Account updated', account);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const listTransactions = async (req, res) => {
  try {
    const { account_id, member_id, loan_id, source_module, status, start_date, end_date, page = 1, limit = 50 } = req.query;

    const where = {};
    if (account_id) where.account_id = account_id;
    if (member_id) where.member_id = member_id;
    if (loan_id) where.loan_id = loan_id;
    if (source_module) where.source_module = source_module;
    if (status) where.status = status;
    if (start_date || end_date) {
      where.transaction_date = {};
      if (start_date) where.transaction_date.gte = new Date(start_date);
      if (end_date) where.transaction_date.lte = new Date(end_date);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: { transaction_date: 'desc' },
        skip,
        take: Number(limit),
        include: {
          account: { select: { id: true, code: true, name: true, account_type: true, category: true } },
        },
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    sendSuccess(res, 'Transactions fetched', { entries, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const getTrialBalance = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const report = await ledgerService.getTrialBalance(start_date, end_date);
    sendSuccess(res, 'Trial balance fetched', report);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const getMemberStatement = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { start_date, end_date } = req.query;

    if (req.member.role !== 'admin' && req.member.id !== memberId) {
      return sendError(res, 403, 'Not authorized');
    }

    const statement = await ledgerService.getMemberStatement(memberId, start_date, end_date);
    sendSuccess(res, 'Member statement fetched', statement);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const reconcileLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const report = await ledgerService.reconcileLoanBalance(loanId);
    sendSuccess(res, 'Loan reconciliation report', report);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const reconcileContributions = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const report = await ledgerService.reconcileContributions(start_date, end_date);
    sendSuccess(res, 'Contributions reconciliation report', report);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const reconcileShares = async (req, res) => {
  try {
    const report = await ledgerService.reconcileShareDistributions();
    sendSuccess(res, 'Shares reconciliation report', report);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

const reverseEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { reason } = req.body;

    const reversal = await ledgerService.reverseTransaction(entryId, req.member.id, req.member.role, reason);
    sendSuccess(res, 'Transaction reversed', reversal);
  } catch (err) {
    handlePrismaError(res, err);
  }
};

module.exports = {
  listAccounts,
  createAccount,
  updateAccount,
  listTransactions,
  getTrialBalance,
  getMemberStatement,
  reconcileLoan,
  reconcileContributions,
  reconcileShares,
  reverseEntry,
};
