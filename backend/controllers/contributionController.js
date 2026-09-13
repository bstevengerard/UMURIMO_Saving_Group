const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { buildPaginationMeta, parsePagination, applySorting } = require('../utils/pagination');

exports.recordContribution = async (req, res) => {
  try {
    const { memberId, week, amount, paymentStatus, paymentMethod } = req.body;

    const member = await prisma.member.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return sendError(res, 404, 'Member not found');
    }

    let weekValue = week;
    if (typeof week === 'string') {
      const d = new Date(week);
      if (!isNaN(d)) {
        weekValue = d.toISOString().split('T')[0];
      }
    }

    const existing = await prisma.contribution.findFirst({
      where: { member_id: memberId, week: new Date(weekValue) }
    });

    if (existing) {
      const updated = await prisma.contribution.update({
        where: { id: existing.id },
        data: {
          amount: Number(amount),
          payment_status: paymentStatus || 'paid',
          recorded_by_id: req.member.id,
          updated_at: new Date()
        }
      });

      return sendSuccess(res, 'Contribution updated', { contribution: updated });
    }

    const contribution = await prisma.contribution.create({
      data: {
        member_id: memberId,
        week: new Date(weekValue),
        amount: Number(amount),
        payment_status: paymentStatus || 'paid',
        recorded_by_id: req.member.id
      }
    });

    return sendSuccess(res, 'Contribution recorded', { contribution }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getContributions = async (req, res) => {
  try {
    const { memberId, week: weekQuery, status: statusQuery, page, limit } = req.query;
    const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { limit: 25 });
    const where = {};

    if (req.member.role !== 'admin') {
      where.member_id = req.member.id;
    } else if (memberId) {
      where.member_id = memberId;
    }

    if (statusQuery) {
      where.payment_status = statusQuery;
    }

    if (weekQuery) {
      const d = new Date(weekQuery);
      if (!isNaN(d)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        where.week = { gte: new Date(year, d.getMonth(), d.getDate()), lt: new Date(year, d.getMonth(), d.getDate() + 1) };
      }
    }

    const allowedSortFields = ['created_at', 'week', 'amount', 'payment_status'];
    const orderBy = applySorting(req.query, allowedSortFields, 'created_at');

    const [contributions, total] = await Promise.all([
      prisma.contribution.findMany({
        where,
        select: {
          id: true,
          member_id: true,
          week: true,
          amount: true,
          payment_status: true,
          payment_method: true,
          created_at: true,
          member: { select: { full_name: true, email: true } },
          recorded_by: { select: { full_name: true, email: true } }
        },
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.contribution.count({ where })
    ]);

    const formatted = contributions.map(c => ({
      id: c.id,
      memberId: c.member_id,
      memberName: c.member?.full_name || 'Unknown',
      week: c.week ? new Date(c.week).toISOString().split('T')[0] : '',
      amount: c.amount,
      status: c.payment_status,
      paymentDate: c.created_at ? new Date(c.created_at).toISOString() : '',
      paymentMethod: c.payment_method || 'Mobile Money',
      timestamp: c.created_at ? new Date(c.created_at).toISOString() : ''
    }));

    const pagination = buildPaginationMeta(pageNum, limitNum, total);

    return sendSuccess(res, 'Contributions retrieved', {
      data: formatted,
      ...pagination
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
