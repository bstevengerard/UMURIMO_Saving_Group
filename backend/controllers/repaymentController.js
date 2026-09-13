const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { toCamelCase } = require('../utils/responseHelper');
const { buildPaginationMeta, parsePagination } = require('../utils/pagination');

exports.generateSchedule = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const loan = await prisma.loan.findUnique({
      where: { id: req.params.loanId }
    });

    if (!loan) {
      return sendError(res, 404, 'Loan not found');
    }

    const existing = await prisma.loanRepaymentSchedule.count({
      where: { loan_id: loan.id }
    });

    if (existing > 0) {
      return sendError(res, 409, 'Repayment schedule already exists', { count: existing });
    }

    const totalAmount = loan.balance;
    const monthlyPrincipal = Math.ceil(totalAmount / loan.term_months);
    const schedule = [];
    let runningBalance = totalAmount;

    for (let i = 1; i <= loan.term_months; i++) {
      const principalThis = Math.min(monthlyPrincipal, runningBalance);
      const interestPart = +((totalAmount * (loan.interest_rate / 100)) / loan.term_months).toFixed(2);
      const payThis = +(principalThis + interestPart).toFixed(2);
      runningBalance = +(runningBalance - principalThis).toFixed(2);

      const dueDate = new Date(loan.request_date);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        loan_id: loan.id,
        member_id: loan.member_id,
        installment_number: i,
        due_date: dueDate,
        principal_amount: principalThis,
        interest_amount: interestPart,
        total_amount: payThis,
        status: 'pending'
      });
    }

    await prisma.loanRepaymentSchedule.createMany({ data: schedule });

    const created = await prisma.loanRepaymentSchedule.findMany({
      where: { loan_id: loan.id },
      orderBy: { installment_number: 'asc' }
    });

    return sendSuccess(res, 'Repayment schedule created', { installmentsCreated: schedule.length, schedule: toCamelCase(created) }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { installmentId } = req.params;
    const { amount, paymentMethod } = req.body;

    const installment = await prisma.loanRepaymentSchedule.findUnique({
      where: { id: installmentId }
    });

    if (!installment) {
      return sendError(res, 404, 'Installment not found');
    }

    if (req.member.role !== 'admin' && req.member.role !== 'treasurer' && installment.member_id !== req.member.id) {
      return sendError(res, 403, 'Not authorized');
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return sendError(res, 400, 'Payment amount must be a positive number');
    }

    const loan = await prisma.loan.findUnique({
      where: { id: installment.loan_id }
    });

    if (!loan) {
      return sendError(res, 404, 'Loan not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedInstallment = await tx.loanRepaymentSchedule.update({
        where: { id: installmentId },
        data: {
          paid_amount: { increment: amountNum },
          payment_method: paymentMethod || installment.payment_method,
          paid_at: new Date()
        }
      });

      const remainingBalance = Number(loan.balance) - amountNum;
      const newBalance = Math.max(0, remainingBalance);

      await tx.loan.update({
        where: { id: installment.loan_id },
        data: {
          balance: Number(newBalance.toFixed(2)),
          ...(newBalance === 0 && { status: 'completed' })
        }
      });

      const allPendingOverdue = await tx.loanRepaymentSchedule.findMany({
        where: {
          loan_id: installment.loan_id,
          status: 'pending',
          due_date: { lt: new Date() }
        }
      });

      for (const inst of allPendingOverdue) {
        if (inst.id !== installmentId) {
          await tx.loanRepaymentSchedule.update({
            where: { id: inst.id },
            data: { status: 'overdue' }
          });
        }
      }

      return updatedInstallment;
    });

    return sendSuccess(res, 'Payment recorded', { installment: toCamelCase(result) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getSchedule = async (req, res) => {
  try {
    const { loanId } = req.params;

    let where = { loan_id: loanId };

    if (req.member.role !== 'admin' && req.member.role !== 'treasurer') {
      where.member_id = req.member.id;
    }

    const schedule = await prisma.loanRepaymentSchedule.findMany({
      where,
      include: {
        loan: { select: { amount: true, status: true, balance: true } }
      },
      orderBy: { installment_number: 'asc' }
    });

    return sendSuccess(res, 'Schedule retrieved', toCamelCase(schedule));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getInstallment = async (req, res) => {
  try {
    const installment = await prisma.loanRepaymentSchedule.findUnique({
      where: { id: req.params.installmentId }
    });

    if (!installment) {
      return sendError(res, 404, 'Installment not found');
    }

    if (req.member.role !== 'admin' && installment.member_id !== req.member.id) {
      return sendError(res, 403, 'Not authorized');
    }

    return sendSuccess(res, 'Installment retrieved', toCamelCase(installment));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const { installmentId } = req.params;
    const { approvalNote } = req.body;

    const installment = await prisma.loanRepaymentSchedule.findUnique({
      where: { id: installmentId }
    });

    if (!installment) {
      return sendError(res, 404, 'Installment not found');
    }

    const updated = await prisma.loanRepaymentSchedule.update({
      where: { id: installmentId },
      data: {
        approval_status: 'approved',
        approval_note: approvalNote || '',
        approved_by_id: req.member.id,
        approved_at: new Date(),
        approved_paid_amount: installment.paid_amount
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'approve_repayment',
        entity_type: 'LoanRepaymentSchedule',
        entity_id: installmentId
      }
    }).catch(() => {});

    return sendSuccess(res, 'Payment approved', { installment: toCamelCase(updated) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.denyPayment = async (req, res) => {
  try {
    const { installmentId } = req.params;
    const { approvalNote } = req.body;

    const installment = await prisma.loanRepaymentSchedule.findUnique({
      where: { id: installmentId }
    });

    if (!installment) {
      return sendError(res, 404, 'Installment not found');
    }

    const updated = await prisma.loanRepaymentSchedule.update({
      where: { id: installmentId },
      data: {
        approval_status: 'denied',
        approval_note: approvalNote || '',
        approved_by_id: req.member.id,
        approved_at: new Date()
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'deny_repayment',
        entity_type: 'LoanRepaymentSchedule',
        entity_id: installmentId
      }
    }).catch(() => {});

    return sendSuccess(res, 'Payment denied', { installment: toCamelCase(updated) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getRepaymentHistory = async (req, res) => {
  try {
    const where = req.member.role === 'admin' ? {} : { member_id: req.member.id };
    const { page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const [installments, total] = await Promise.all([
      prisma.loanRepaymentSchedule.findMany({
        where: {
          ...where,
          status: { in: ['paid', 'partial'] }
        },
        include: {
          loan: {
            include: {
              member: { select: { full_name: true } }
            }
          }
        },
        orderBy: { paid_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.loanRepaymentSchedule.count({
        where: {
          ...where,
          status: { in: ['paid', 'partial'] }
        }
      })
    ]);

    const history = installments.map(inst => ({
      loanId: inst.loan_id,
      memberName: inst.loan?.member?.full_name || 'Unknown',
      installmentId: inst.id,
      dueDate: inst.due_date ? inst.due_date.toISOString().split('T')[0] : '',
      amountDue: inst.total_amount,
      amountPaid: inst.paid_amount,
      paidDate: inst.paid_at ? inst.paid_at.toISOString().split('T')[0] : '',
      paymentMethod: inst.payment_method || 'Mobile Money'
    }));

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'History retrieved', { data: history, ...pagination });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getOverdueInstallments = async (req, res) => {
  try {
    const where = req.member.role === 'admin' ? {} : { member_id: req.member.id };
    const { page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const [installments, total] = await Promise.all([
      prisma.loanRepaymentSchedule.findMany({
        where: {
          ...where,
          status: 'overdue'
        },
        include: {
          loan: {
            include: {
              member: { select: { full_name: true } }
            }
          }
        },
        orderBy: { due_date: 'asc' },
        skip,
        take: limitNum
      }),
      prisma.loanRepaymentSchedule.count({
        where: {
          ...where,
          status: 'overdue'
        }
      })
    ]);

    const overdue = installments.map(inst => {
      const dueDate = inst.due_date ? new Date(inst.due_date) : new Date();
      const daysOverdue = Math.ceil((new Date() - dueDate) / (1000 * 3600 * 24));

      return {
        loanId: inst.loan_id,
        memberId: inst.member_id,
        memberName: inst.loan?.member?.full_name || 'Unknown',
        installmentId: inst.id,
        dueDate: inst.due_date ? inst.due_date.toISOString().split('T')[0] : '',
        amountDue: inst.total_amount,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0
      };
    });

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Overdue retrieved', { data: overdue, ...pagination });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });

    const [installments, total] = await Promise.all([
      prisma.loanRepaymentSchedule.findMany({
        where: {
          approval_status: 'pending'
        },
        include: {
          loan: {
            include: {
              member: { select: { full_name: true } }
            }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.loanRepaymentSchedule.count({
        where: {
          approval_status: 'pending'
        }
      })
    ]);

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Pending approvals retrieved', { data: toCamelCase(installments), ...pagination });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
