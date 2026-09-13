const prisma = require('../lib/prisma').getDB();
const { toCamelCase } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { validateRequired, validatePositiveNumber } = require('../utils/validation');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');
const ledgerService = require('../services/ledgerService');

exports.recordSavings = async (req, res) => {
  try {
    const { memberId, amount, transactionDate, paymentMethod, notes } = req.body;

    const requiredCheck = validateRequired(req.body, ['memberId', 'amount']);
    if (!requiredCheck.valid) {
      return sendError(res, 400, requiredCheck.message);
    }

    const amountValidation = validatePositiveNumber(amount, 'Amount');
    if (!amountValidation.valid) {
      return sendError(res, 400, amountValidation.message);
    }
    const amountNum = amountValidation.value;

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });
    if (!member) return sendError(res, 404, 'Member not found');

    const result = await prisma.$transaction(async (tx) => {
      const savings = await tx.savings.create({
        data: {
          member_id: memberId, amount: amountNum,
          transaction_date: transactionDate ? new Date(transactionDate) : new Date(),
          payment_method: paymentMethod || 'Mobile Money',
          notes: notes || '', recorded_by_id: req.member.id
        },
        include: {
          member: { select: { full_name: true, email: true, phone: true } },
          recorded_by: { select: { full_name: true, email: true } }
        }
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'record_savings', entity_type: 'Savings', entity_id: savings.id,
          new_values: { amount: savings.amount, memberId: savings.member_id }
        }
      });

      return savings;
    });

    ledgerService.postSavingsLedger(
      result.id, memberId, amountNum, 'savings',
      req.member.id, req.member.role
    ).catch(() => {});

    return sendSuccess(res, 'Savings recorded', { savings: toCamelCase(result) }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getSavings = async (req, res) => {
  try {
    const { memberId, fromDate, toDate } = req.query;
    const { page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });
    const where = {};

    if (req.member.role !== 'admin') {
      where.member_id = req.member.id;
    } else if (memberId) {
      where.member_id = memberId;
    }

    if (fromDate || toDate) {
      where.transaction_date = {};
      if (fromDate) where.transaction_date.gte = new Date(fromDate);
      if (toDate) where.transaction_date.lte = new Date(toDate);
    }

    const allowedSortFields = ['transaction_date', 'amount'];
    const orderBy = applySorting(req.query, allowedSortFields, 'transaction_date');

    const [savings, total] = await Promise.all([
      prisma.savings.findMany({
        where,
        select: {
          id: true,
          member_id: true,
          amount: true,
          transaction_date: true,
          payment_method: true,
          notes: true,
          created_at: true,
          member: { select: { full_name: true, email: true, phone: true } },
          recorded_by: { select: { full_name: true, email: true } }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.savings.count({ where })
    ]);

    const formatted = savings.map(s => ({
      id: s.id,
      memberId: s.member_id,
      memberName: s.member?.full_name || 'Unknown',
      amount: Number(s.amount),
      transactionDate: s.transaction_date,
      paymentMethod: s.payment_method,
      notes: s.notes,
      recordedBy: s.recorded_by?.full_name || 'Unknown'
    }));

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Savings retrieved', { data: formatted, ...pagination });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMemberSavingsSummary = async (req, res) => {
  try {
    const memberId = req.member.role === 'admin' ? req.params.memberId : req.member.id;

    const result = await prisma.savings.aggregate({
      where: { member_id: memberId },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { transaction_date: true }
    });

    const summary = {
      memberId,
      totalSavings: result._sum?.amount ? Number(result._sum.amount) : 0,
      transactionCount: result._count?._all || 0,
      lastTransaction: result._max?.transaction_date || null
    };

    return sendSuccess(res, 'Savings summary retrieved', summary);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateSavings = async (req, res) => {
  try {
    const savings = await prisma.savings.findUnique({ where: { id: req.params.id } });
    if (!savings) return sendError(res, 404, 'Savings record not found');

    const updateData = {};
    const allowedFields = ['amount', 'transaction_date', 'payment_method', 'notes'];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        const prismaKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
        if (key === 'amount') {
          const amountNum = Number(req.body[key]);
          if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return sendError(res, 400, 'Amount must be greater than zero');
          }
          updateData[prismaKey] = amountNum;
        } else {
          updateData[prismaKey] = req.body[key];
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.savings.update({
        where: { id: req.params.id },
        data: updateData
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'update_savings', entity_type: 'Savings', entity_id: updated.id,
          previous_values: toCamelCase(savings),
          new_values: toCamelCase(updated)
        }
      });

      return updated;
    });

    return sendSuccess(res, 'Savings updated', { savings: toCamelCase(result) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteSavings = async (req, res) => {
  try {
    const savings = await prisma.savings.findUnique({ where: { id: req.params.id } });
    if (!savings) return sendError(res, 404, 'Savings record not found');

    await prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actor_id: req.member.id, actor_role: req.member.role,
          action: 'delete_savings', entity_type: 'Savings', entity_id: savings.id,
          previous_values: toCamelCase(savings)
        }
      });

      await tx.savings.delete({ where: { id: req.params.id } });
    });

    return sendSuccess(res, 'Savings record deleted');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
