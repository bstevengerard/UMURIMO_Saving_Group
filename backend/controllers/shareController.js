const prisma = require('../lib/prisma').getDB();
const { toCamelCase } = require('../utils/responseHelper');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { validateRequired, validatePositiveNumber } = require('../utils/validation');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');
const ledgerService = require('../services/ledgerService');
const shareService = require('../services/shareService');

exports.upsertMemberShares = async (req, res) => {
  try {
    const { memberId, numberOfShares, shareValue } = req.body;

    const requiredCheck = validateRequired(req.body, ['memberId']);
    if (!requiredCheck.valid) {
      return sendError(res, 400, requiredCheck.message);
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });
    if (!member) return sendError(res, 404, 'Member not found');

    const existing = await prisma.memberShare.findUnique({
      where: { member_id: memberId }
    });

    const previousValues = existing ? toCamelCase(existing) : null;

    const numShares = numberOfShares !== undefined ? Number(numberOfShares) : existing.number_of_shares;
    const sValue = shareValue !== undefined ? Number(shareValue) : existing.share_value;

    if (numShares < 0) {
      return sendError(res, 400, 'Number of shares cannot be negative');
    }
    if (sValue <= 0) {
      return sendError(res, 400, 'Share value must be positive');
    }

    const share = await prisma.$transaction(async (tx) => {
      let result;
      if (existing) {
        result = await tx.memberShare.update({
          where: { member_id: memberId },
          data: {
            number_of_shares: numShares,
            share_value: sValue
          }
        });
      } else {
        result = await tx.memberShare.create({
          data: {
            member_id: memberId,
            number_of_shares: numShares,
            share_value: sValue
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actor_id: req.member.id,
          actor_role: req.member.role,
          action: 'upsert_member_shares',
          entity_type: 'MemberShare',
          entity_id: result.id,
          previousValues,
          new_values: toCamelCase(result)
        }
      });

      return result;
    });

    if (!existing) {
      ledgerService.postShareCapitalLedger(
        share.id, memberId, sValue, numShares, 'shares',
        req.member.id, req.member.role
      ).catch(() => {});
    }

    return sendSuccess(res, 'Member shares updated', toCamelCase(share), 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMemberShares = async (req, res) => {
  try {
    const { memberId } = req.query;
    const where = {};
    if (memberId) where.member_id = memberId;

    const shares = await prisma.memberShare.findMany({
      where,
      include: {
        member: {
          select: { full_name: true, email: true, phone: true }
        }
      },
      orderBy: { number_of_shares: 'desc' }
    });

    return sendSuccess(res, 'Member shares retrieved', toCamelCase(shares));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMemberShare = async (req, res) => {
  try {
    const memberId = req.member.id;
    const share = await prisma.memberShare.findUnique({
      where: { member_id: memberId },
      include: {
        member: {
          select: { full_name: true, email: true, phone: true }
        }
      }
    });

    if (!share) {
      return sendSuccess(res, 'Member share retrieved', {
        memberId,
        numberOfShares: 0,
        shareValue: 1000,
        totalProfit: 0
      });
    }

    return sendSuccess(res, 'Member share retrieved', toCamelCase(share));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getTotalSharesSummary = async (req, res) => {
  try {
    const result = await prisma.memberShare.aggregate({
      _sum: { number_of_shares: true },
      _count: { _all: true }
    });

    const summary = {
      totalShares: result._sum?.number_of_shares || 0,
      totalMembers: result._count?._all || 0
    };
    return sendSuccess(res, 'Shares summary retrieved', summary);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.distributeShareProfit = async (req, res) => {
  try {
    const { distributionPeriod, periodStart, periodEnd } = req.body;

    if (!distributionPeriod || !periodStart || !periodEnd) {
      return sendError(res, 400, 'Distribution period, start date and end date are required');
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return sendError(res, 400, 'Invalid date format');
    }

    if (startDate >= endDate) {
      return sendError(res, 400, 'Start date must be before end date');
    }

    const existingDistribution = await prisma.shareProfitDistribution.findFirst({
      where: {
        distribution_period: distributionPeriod,
        period_start: startDate,
        period_end: endDate
      }
    });

    if (existingDistribution) {
      return sendError(res, 409, 'A share profit distribution for this period already exists');
    }

    const result = await prisma.$transaction(async (tx) => {
      const allocationResult = await calculateShareProfitAllocation(
        distributionPeriod,
        startDate,
        endDate,
        req.member.id,
        tx
      );

      if (allocationResult.distributionId) {
        await tx.auditLog.create({
          data: {
            actor_id: req.member.id,
            actor_role: req.member.role,
            action: 'distribute_share_profit',
            entity_type: 'ShareProfitDistribution',
            entity_id: allocationResult.distributionId,
            new_values: { totalProfit: allocationResult.totalProfit, distributions: allocationResult.distributions.length }
          }
        });
      }

      return allocationResult;
    });

    return sendSuccess(res, 'Share profit distributed', result, 201);
  } catch (err) {
    console.error('[distributeShareProfit]', err.message);
    const statusCode = err.message.includes('No member shares found') ? 400 : 500;
    return sendError(res, statusCode, err.message.includes('No member shares found') ? err.message : 'An unexpected error occurred. Please try again later.');
  }
};

exports.getShareProfitDistributions = async (req, res) => {
  try {
    const distributions = await prisma.shareProfitDistribution.findMany({
      include: {
        created_by: {
          select: { full_name: true, email: true }
        }
      },
      orderBy: { distributed_at: 'desc' }
    });

    return sendSuccess(res, 'Share profit distributions retrieved', toCamelCase(distributions));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getShareConfiguration = async (req, res) => {
  try {
    const config = await shareService.getActiveShareConfiguration();
    if (!config) {
      return sendSuccess(res, 'No active share configuration found', null);
    }
    return sendSuccess(res, 'Share configuration retrieved', toCamelCase(config));
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.updateShareConfiguration = async (req, res) => {
  try {
    const data = req.body;

    const requiredCheck = validateRequired(data, ['effectiveFrom']);
    if (!requiredCheck.valid) {
      return sendError(res, 400, requiredCheck.message);
    }

    const minShares = data.minShares !== undefined ? Number(data.minShares) : 1;
    const maxShares = data.maxShares !== undefined ? Number(data.maxShares) : 5;
    const shareValue = data.shareValue !== undefined ? Number(data.shareValue) : 1000;
    const interestRate = data.interestRate !== undefined ? Number(data.interestRate) : 3;

    if (minShares < 1 || maxShares < 1) {
      return sendError(res, 400, 'Share limits must be at least 1');
    }
    if (maxShares < minShares) {
      return sendError(res, 400, 'Maximum shares cannot be less than minimum shares');
    }
    if (shareValue <= 0) {
      return sendError(res, 400, 'Share value must be positive');
    }
    if (interestRate < 0 || interestRate > 100) {
      return sendError(res, 400, 'Interest rate must be between 0 and 100');
    }

    const config = await shareService.createShareConfiguration(data, req.member.id);

    return sendSuccess(res, 'Share configuration created', toCamelCase(config), 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
