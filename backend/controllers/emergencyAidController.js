const prisma = require('../lib/prisma').getDB();
const { toCamelCase } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { validateRequired, validatePositiveNumber, validateString } = require('../utils/validation');
const ledgerService = require('../services/ledgerService');

exports.createEmergencyAid = async (req, res) => {
  try {
    const data = req.body;

    const requiredCheck = validateRequired(req.body, ['title', 'amount', 'deadline']);
    if (!requiredCheck.valid) {
      return sendError(res, 400, requiredCheck.message);
    }

    const amountValidation = validatePositiveNumber(data.amount, 'Amount');
    if (!amountValidation.valid) {
      return sendError(res, 400, amountValidation.message);
    }
    const amountNum = amountValidation.value;

    const titleValidation = validateString(data.title, 'Title', 1, 255);
    if (!titleValidation.valid) {
      return sendError(res, 400, titleValidation.message);
    }

    const deadlineDate = new Date(data.deadline);
    if (isNaN(deadlineDate.getTime())) {
      return sendError(res, 400, 'Invalid deadline date');
    }
    if (deadlineDate <= new Date()) {
      return sendError(res, 400, 'Deadline must be in the future');
    }

    const emergencyAid = await prisma.emergencyAid.create({
      data: {
        title: titleValidation.value,
        description: data.description || '',
        amount: amountNum,
        deadline: deadlineDate,
        status: data.status || 'open',
        created_by_id: req.member.id
      },
      include: {
        created_by: {
          select: { full_name: true, email: true }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'create_emergency_aid',
        entity_type: 'EmergencyAid',
        entity_id: emergencyAid.id,
        new_values: { title: emergencyAid.title, amount: emergencyAid.amount }
      }
    });

    return sendSuccess(res, 'Emergency aid created', toCamelCase(emergencyAid), 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getEmergencyAids = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const aids = await prisma.emergencyAid.findMany({
      where,
      include: {
        created_by: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return sendSuccess(res, 'Emergency aids retrieved', toCamelCase(aids));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getEmergencyAidById = async (req, res) => {
  try {
    const aid = await prisma.emergencyAid.findUnique({
      where: { id: req.params.id },
      include: {
        created_by: {
          select: { full_name: true, email: true }
        }
      }
    });
    if (!aid) return sendError(res, 404, 'Emergency aid not found');
    return sendSuccess(res, 'Emergency aid retrieved', toCamelCase(aid));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateEmergencyAid = async (req, res) => {
  try {
    const aid = await prisma.emergencyAid.findUnique({ where: { id: req.params.id } });
    if (!aid) return sendError(res, 404, 'Emergency aid not found');

    const updateData = {};
    const allowedFields = ['title', 'description', 'amount', 'deadline', 'status'];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        const prismaKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
        updateData[prismaKey] = key === 'amount' ? Number(req.body[key]) : (key === 'deadline' ? new Date(req.body[key]) : req.body[key]);
      }
    }

    const updated = await prisma.emergencyAid.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        created_by: {
          select: { full_name: true, email: true }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'update_emergency_aid',
        entity_type: 'EmergencyAid',
        entity_id: updated.id,
        previous_values: toCamelCase(aid),
        new_values: toCamelCase(updated)
      }
    });

    return sendSuccess(res, 'Emergency aid updated', toCamelCase(updated));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.deleteEmergencyAid = async (req, res) => {
  try {
    const aid = await prisma.emergencyAid.findUnique({ where: { id: req.params.id } });
    if (!aid) return sendError(res, 404, 'Emergency aid not found');

    await prisma.auditLog.create({
      data: {
        actor_id: req.member.id,
        actor_role: req.member.role,
        action: 'delete_emergency_aid',
        entity_type: 'EmergencyAid',
        entity_id: aid.id,
        previous_values: toCamelCase(aid)
      }
    });

    await prisma.emergencyAid.delete({ where: { id: req.params.id } });
    return sendSuccess(res, 'Emergency aid deleted');
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.closeEmergencyAid = async (req, res) => {
  try {
    const aid = await prisma.emergencyAid.findUnique({ where: { id: req.params.id } });
    if (!aid) return sendError(res, 404, 'Emergency aid not found');

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.emergencyAid.update({
        where: { id: req.params.id },
        data: { status: 'closed' }
      });

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id,
          actor_role: req.member.role,
          action: 'close_emergency_aid',
          entity_type: 'EmergencyAid',
          entity_id: updated.id,
          previous_values: { status: 'open' },
          new_values: { status: 'closed' }
        }
      });

      return updated;
    });

    return sendSuccess(res, 'Emergency aid closed', { aid: toCamelCase(result) });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { emergencyAidId, memberId, amount } = req.body;

    const aid = await prisma.emergencyAid.findUnique({ where: { id: emergencyAidId } });
    if (!aid) return sendError(res, 404, 'Emergency aid not found');
    if (aid.status !== 'open') {
      return sendError(res, 400, 'This emergency aid is no longer open');
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });
    if (!member) return sendError(res, 404, 'Member not found');

    const existing = await prisma.emergencyAidPayment.findFirst({
      where: {
        emergency_aid_id: emergencyAidId,
        member_id: memberId
      }
    });

    const previousPayment = existing ? toCamelCase(existing) : null;

    const result = await prisma.$transaction(async (tx) => {
      let updated;
      if (existing) {
        const newAmount = Number(amount);
        const aidAmount = Number(aid.amount);
        const previousAmount = Number(existing.amount) || 0;
        const totalPaid = previousAmount + newAmount;
        const paymentStatus = totalPaid >= aidAmount ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');

        updated = await tx.emergencyAidPayment.update({
          where: { id: existing.id },
          data: {
            amount: totalPaid,
            payment_status: paymentStatus,
            recorded_by_id: req.member.id,
            paid_at: paymentStatus === 'paid' ? new Date() : existing.paid_at
          }
        });

        await tx.auditLog.create({
          data: {
            actor_id: req.member.id,
            actor_role: req.member.role,
            action: 'record_emergency_aid_payment',
            entity_type: 'EmergencyAidPayment',
            entity_id: updated.id,
            previous_values: previousPayment,
            new_values: toCamelCase(updated)
          }
        });

        return { updated, ledgerArgs: [updated.id, memberId, newAmount, 'emergency_aid', req.member.id, req.member.role] };
      } else {
        updated = await tx.emergencyAidPayment.create({
          data: {
            emergency_aid_id: emergencyAidId,
            member_id: memberId,
            amount: Number(amount),
            payment_status: Number(amount) >= Number(aid.amount) ? 'paid' : 'partial',
            recorded_by_id: req.member.id,
            paid_at: Number(amount) >= Number(aid.amount) ? new Date() : null
          }
        });

        await tx.auditLog.create({
          data: {
            actor_id: req.member.id,
            actor_role: req.member.role,
            action: 'record_emergency_aid_payment',
            entity_type: 'EmergencyAidPayment',
            entity_id: updated.id,
            previous_values: previousPayment,
            new_values: toCamelCase(updated)
          }
        });

        return { updated, ledgerArgs: [updated.id, memberId, Number(amount), 'emergency_aid', req.member.id, req.member.role] };
      }
    });

    const ledgerArgs = result.ledgerArgs;
    if (ledgerArgs) {
      ledgerService.postEmergencyAidPaymentLedger(...ledgerArgs).catch(() => {});
    }

    if (existing) {
      return sendSuccess(res, 'Payment recorded', { payment: toCamelCase(result) }, 201);
    }
    return sendSuccess(res, 'Payment recorded', { payment: toCamelCase(result) }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getPayments = async (req, res) => {
  try {
    const { emergencyAidId } = req.params;
    const payments = await prisma.emergencyAidPayment.findMany({
      where: { emergency_aid_id: emergencyAidId },
      include: {
        member: { select: { full_name: true, email: true, phone: true } },
        recorded_by: { select: { full_name: true, email: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return sendSuccess(res, 'Payments retrieved', toCamelCase(payments));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMyEmergencyAidObligations = async (req, res) => {
  try {
    const memberId = req.member.id;

    const openAids = await prisma.emergencyAid.findMany({
      where: { status: 'open' },
      include: {
        created_by: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const obligations = await prisma.emergencyAidPayment.findMany({
      where: {
        member_id: memberId,
        emergency_aid_id: { in: openAids.map(a => a.id) }
      },
      include: {
        emergency_aid: {
          select: { title: true, amount: true, deadline: true, status: true }
        }
      }
    });

    const result = openAids.map(aid => {
      const payment = obligations.find(o => o.emergency_aid_id === aid.id);
      return {
        id: aid.id,
        title: aid.title,
        description: aid.description,
        amount: Number(aid.amount),
        deadline: aid.deadline,
        status: aid.status,
        createdBy: aid.created_by?.full_name || 'System',
        paymentStatus: payment ? payment.payment_status : 'pending',
        amountPaid: payment ? Number(payment.amount) : 0,
        fineApplied: payment ? payment.fine_applied : false,
        fineAmount: payment ? Number(payment.fine_amount) : 0,
        outstandingAmount: payment ? Number(payment.outstanding_amount) : 0,
        paidAt: payment ? payment.paid_at : null
      };
    });

    return sendSuccess(res, 'Emergency aid obligations retrieved', result);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.applyFines = async (req, res) => {
  try {
    const { emergencyAidId } = req.params;
    const { getCurrentConfig } = require('../services/calculationService');
    const config = await getCurrentConfig();

    const aid = await prisma.emergencyAid.findUnique({ where: { id: emergencyAidId } });
    if (!aid) return sendError(res, 404, 'Emergency aid not found');

    const unpaidPayments = await prisma.emergencyAidPayment.findMany({
      where: {
        emergency_aid_id: emergencyAidId,
        payment_status: { in: ['pending', 'overdue'] }
      },
      include: {
        member: { select: { full_name: true, email: true } }
      }
    });

    const { batchResults, ledgerCalls } = await prisma.$transaction(async (tx) => {
      const batchResults = [];
      const ledgerCalls = [];
      for (const payment of unpaidPayments) {
        const paidSoFar = Number(payment.amount) || 0;
        const outstanding = Math.max(0, Number(aid.amount) - paidSoFar);
        const fineAmount = (outstanding * Number(config.emergency_aid_fine_rate)) / 100;

        const updated = await tx.emergencyAidPayment.update({
          where: { id: payment.id },
          data: {
            fine_applied: true,
            fine_amount: Math.round(fineAmount * 100) / 100,
            outstanding_amount: Math.round(outstanding * 100) / 100
          }
        });

        if (Number(fineAmount) > 0) {
          ledgerCalls.push({
            paymentId: updated.id,
            memberId: payment.member_id,
            fineAmount: Math.round(fineAmount * 100) / 100
          });
        }

        batchResults.push({
          memberId: updated.member_id,
          memberName: updated.member?.full_name || 'Unknown',
          outstanding: Number(updated.outstanding_amount),
          fineAmount: Number(updated.fine_amount),
          totalDue: Math.round((Number(updated.outstanding_amount) + Number(updated.fine_amount)) * 100) / 100
        });
      }

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id,
          actor_role: req.member.role,
          action: 'apply_emergency_aid_fines',
          entity_type: 'EmergencyAid',
          entity_id: aid.id,
          new_values: { fineCount: batchResults.length, fineRate: config.emergency_aid_fine_rate }
        }
      });

      return { batchResults, ledgerCalls };
    });

    for (const call of ledgerCalls) {
      ledgerService.postEmergencyAidFineLedger(
        call.paymentId, call.memberId, call.fineAmount, 'emergency_aid',
        req.member.id, req.member.role
      ).catch(() => {});
    }

    return sendSuccess(res, 'Fines applied', { results: batchResults });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
