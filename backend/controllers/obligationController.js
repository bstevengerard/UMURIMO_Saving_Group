const { getDB } = require('../lib/prisma');
const prisma = getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

exports.getObligations = async (req, res) => {
  try {
    const memberId = req.query.memberId || req.member?.id;
    const typeFilter = (req.query.type || '').toLowerCase();

    if (!memberId) {
      return sendError(res, 400, 'memberId is required');
    }

    const obligations = [];

    // Contributions
    if (!typeFilter || typeFilter === 'contribution') {
      const contributions = await prisma.contribution.findMany({
        where: {
          member_id: memberId,
          payment_status: { in: ['pending', 'overdue'] }
        },
        orderBy: { created_at: 'desc' }
      });
      for (const c of contributions) {
        obligations.push({
          id: c.id,
          type: 'contribution',
          title: 'Contribution',
          description: c.contribution_type?.name || 'Weekly/Monthly Contribution',
          amount: Number(c.amount),
          due_date: c.week,
          status: c.payment_status,
          created_at: c.created_at
        });
      }
    }

    // Loan installments
    if (!typeFilter || typeFilter === 'loan_installment') {
      const installments = await prisma.loanRepaymentSchedule.findMany({
        where: {
          member_id: memberId,
          status: { in: ['pending', 'overdue'] }
        },
        include: {
          loan: {
            select: { id: true, amount: true, status: true }
          }
        },
        orderBy: { due_date: 'asc' }
      });
      for (const inst of installments) {
        obligations.push({
          id: inst.id,
          type: 'loan_installment',
          title: `Loan Installment #${inst.installment_number}`,
          description: `Loan ${inst.loan?.id?.slice(0, 8) || ''}`,
          amount: Number(inst.total_amount),
          due_date: inst.due_date,
          status: inst.status,
          created_at: inst.created_at
        });
      }
    }

    // Emergency aid obligations
    if (!typeFilter || typeFilter === 'emergency_aid') {
      const openAids = await prisma.emergencyAid.findMany({
        where: {
          status: 'open',
          deadline: { gte: new Date() }
        },
        select: { id: true, title: true, description: true, amount: true, deadline: true, status: true }
      });

      const aidPayments = await prisma.emergencyAidPayment.findMany({
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
        const payment = aidPayments.find(p => p.emergency_aid_id === aid.id);
        return {
          id: aid.id,
          type: 'emergency_aid',
          title: aid.title,
          description: aid.description || 'Emergency Aid',
          amount: Number(payment?.outstanding_amount ?? aid.amount),
          due_date: aid.deadline,
          status: payment ? payment.payment_status : 'pending',
          created_at: aid.created_at
        };
      });
      obligations.push(...result);
    }

    // Meeting fines
    if (!typeFilter || typeFilter === 'fine') {
      const fines = await prisma.meetingFine.findMany({
        where: {
          member_id: memberId,
          status: 'pending'
        },
        orderBy: { created_at: 'desc' }
      });
      for (const fine of fines) {
        obligations.push({
          id: fine.id,
          type: 'fine',
          title: 'Meeting Fine',
          description: fine.reason || 'Meeting fine',
          amount: Number(fine.amount),
          due_date: fine.created_at,
          status: fine.status,
          created_at: fine.created_at
        });
      }
    }

    return sendSuccess(res, 'Obligations retrieved', obligations);
  } catch (err) {
    return handlePrismaError(res, err, '[Obligations]');
  }
};
