const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { toCamelCase } = require('../utils/responseHelper');

exports.getStats = async (req, res) => {
  try {
    const totalMembers = await prisma.member.count();
    const activeMembers = await prisma.member.count({ where: { is_active: true } });

    const totalLoans = await prisma.loan.count();
    const pendingLoans = await prisma.loan.count({ where: { status: 'pending' } });
    const approvedLoans = await prisma.loan.count({ where: { status: 'approved' } });
    const activeLoanCount = await prisma.loan.count({ where: { status: { in: ['disbursed', 'overdue'] } } });
    const overdueLoans = await prisma.loan.count({ where: { status: 'overdue' } });
    const completedLoans = await prisma.loan.count({ where: { status: 'completed' } });

    const outstandingResult = await prisma.loan.aggregate({
      where: { status: { in: ['disbursed', 'overdue'] } },
      _sum: { balance: true }
    });

    const contributionResult = await prisma.contribution.aggregate({
      _sum: { amount: true }
    });

    const totalContributions = contributionResult._sum.amount || 0;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const allContributions = await prisma.contribution.findMany({
      select: { amount: true, week: true }
    });

    const weeklyContributions = allContributions.reduce((sum, c) => {
      const weekDate = new Date(c.week);
      if (weekDate >= weekStart) return sum + (Number(c.amount) || 0);
      return sum;
    }, 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const totalAttendanceRecords = await prisma.attendance.count({
      where: { timestamp: { gte: thirtyDaysAgo } }
    });
    const verifiedCount = await prisma.attendance.count({
      where: { timestamp: { gte: thirtyDaysAgo }, verified: true }
    });

    const attendanceRate = totalMembers > 0
      ? +(verifiedCount / (totalMembers * Math.max(1, Math.ceil(30 / 7))) * 100).toFixed(1)
      : 0;

    const defaulters = await prisma.loan.count({ where: { status: 'overdue', balance: { gt: 0 } } });

    const loanPendingCount = await prisma.loan.count({ where: { status: 'pending' } });
    const contribPendingCount = await prisma.contribution.count({ where: { payment_status: 'pending' } });

    return sendSuccess(res, 'Dashboard stats retrieved', {
      totalMembers,
      activeMembers,
      totalLoans,
      activeLoans: activeLoanCount,
      pendingLoans,
      approvedLoans,
      overdueLoans,
      completedLoans,
      outstandingLoanBalance: outstandingResult._sum.balance || 0,
      totalContributions,
      weeklyContributions,
      attendanceRate,
      defaulters,
      pendingApprovals: loanPendingCount + contribPendingCount,
      loanPendingCount,
      contribPendingCount,
      totalAttendanceRecords,
      verifiedAttendanceCount: verifiedCount
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getOverview = async (req, res) => {
  try {
    if (req.member.role !== 'admin') {
      return sendError(res, 403, 'Not authorized');
    }

    const [
      totalMembers,
      activeMembers,
      totalLoans,
      pendingLoans,
      approvedLoans,
      activeLoanCount,
      overdueLoans,
      completedLoans,
      outstandingResult,
      contributionResult,
      totalAttendanceRecords,
      verifiedCount,
      defaulters,
      loanPendingCount,
      contribPendingCount,
      disbursedCount,
      pendingCount,
      completedLoansCount,
      overdueCount,
      outstandingLoanResult,
      announcements,
      upcomingMeetings,
      recentAuditLogs,
      recentNotifications,
      recentShares,
      contributions,
      loansForPortfolio
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { is_active: true } }),
      prisma.loan.count(),
      prisma.loan.count({ where: { status: 'pending' } }),
      prisma.loan.count({ where: { status: 'approved' } }),
      prisma.loan.count({ where: { status: { in: ['disbursed', 'overdue'] } } }),
      prisma.loan.count({ where: { status: 'overdue' } }),
      prisma.loan.count({ where: { status: 'completed' } }),
      prisma.loan.aggregate({ where: { status: { in: ['disbursed', 'overdue'] } }, _sum: { balance: true } }),
      prisma.contribution.aggregate({ _sum: { amount: true } }),
      prisma.attendance.count({ where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.attendance.count({ where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, verified: true } }),
      prisma.loan.count({ where: { status: 'overdue', balance: { gt: 0 } } }),
      prisma.loan.count({ where: { status: 'pending' } }),
      prisma.contribution.count({ where: { payment_status: 'pending' } }),
      prisma.loan.count({ where: { status: { in: ['disbursed', 'overdue'] } } }),
      prisma.loan.count({ where: { status: 'pending' } }),
      prisma.loan.count({ where: { status: 'completed' } }),
      prisma.loan.count({ where: { status: 'overdue' } }),
      prisma.loan.aggregate({ where: { status: { in: ['disbursed', 'overdue'] } }, _sum: { balance: true } }),
      prisma.announcement.findMany({
        where: { is_active: true, OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] },
        include: { created_by: { select: { full_name: true, email: true } } },
        orderBy: { created_at: 'desc' },
        take: 5
      }),
      prisma.meeting.findMany({
        where: { is_active: true, date: { gte: new Date() } },
        select: { id: true, title: true, date: true, start_time: true, end_time: true, location: true, description: true, created_by: { select: { full_name: true } }, created_at: true },
        orderBy: { date: 'asc' },
        take: 5
      }),
      prisma.auditLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 10,
        include: { actor: { select: { full_name: true, email: true } } }
      }),
      prisma.smsNotification.findMany({
        where: { status: { in: ['pending', 'sent'] } },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: { id: true, message: true, status: true, created_at: true, category: true, recipient_member: { select: { full_name: true } } }
      }),
      prisma.shareProfitDistribution.findMany({
        orderBy: { distributed_at: 'desc' },
        take: 5,
        include: { created_by: { select: { full_name: true, email: true } } }
      }),
      prisma.contribution.findMany({
        select: { amount: true, week: true },
        orderBy: { week: 'desc' },
        take: 200
      }),
      prisma.loan.findMany({
        where: { status: { in: ['disbursed', 'overdue', 'completed'] } },
        select: { amount: true, status: true, member: { select: { full_name: true } } },
        take: 20
      })
    ]);

    const weeklyContributions = contributions.reduce((sum, c) => {
      const weekDate = new Date(c.week);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      if (weekDate >= weekStart) return sum + (Number(c.amount) || 0);
      return sum;
    }, 0);

    const attendanceRate = totalMembers > 0
      ? +(verifiedCount / (totalMembers * Math.max(1, Math.ceil(30 / 7))) * 100).toFixed(1)
      : 0;

    const now = new Date();
    const activityItems = [
      ...toCamelCase(recentAuditLogs).map(log => ({
        id: `audit-${log.id}`,
        type: 'audit',
        text: `${log.action || 'Action'} on ${log.entityType || 'system'}`,
        sub: log.actor?.fullName || 'System',
        time: log.createdAt,
        icon: 'ShieldCheck'
      })),
      ...toCamelCase(recentNotifications).map(n => ({
        id: `notif-${n.id}`,
        type: 'notification',
        text: n.message || `${n.category || 'system'} notification`,
        sub: n.recipientMember?.fullName || 'System',
        time: n.createdAt,
        icon: 'Radio'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

    const loanPortfolio = loansForPortfolio.map(l => ({
      name: l.member?.fullName || 'Member',
      Disbursed: l.status === 'disbursed' ? Number(l.amount) : 0,
      Paid: l.status === 'completed' ? Number(l.amount) : 0
    }));

    const grouped = {};
    const trendLimit = 8;
    for (const c of contributions) {
      const wk = c.week ? new Date(c.week).toISOString().split('T')[0] : 'Unknown';
      if (!grouped[wk]) grouped[wk] = { week: wk, count: 0, totalAmount: 0 };
      grouped[wk].count += 1;
      grouped[wk].totalAmount += Number(c.amount);
    }
    const savingsTrend = Object.values(grouped).sort((a, b) => a.week.localeCompare(b.week)).slice(-trendLimit);

    return sendSuccess(res, 'Dashboard overview retrieved', {
      stats: {
        totalMembers,
        activeMembers,
        totalLoans,
        activeLoans: activeLoanCount,
        pendingLoans,
        approvedLoans,
        overdueLoans,
        completedLoans,
        outstandingLoanBalance: outstandingResult._sum.balance || 0,
        totalContributions: contributionResult._sum.amount || 0,
        weeklyContributions,
        attendanceRate,
        defaulters,
        pendingApprovals: loanPendingCount + contribPendingCount,
        loanPendingCount,
        contribPendingCount,
        totalAttendanceRecords,
        verifiedAttendanceCount: verifiedCount
      },
      loanStats: {
        disbursedCount,
        pendingCount,
        completedCount: completedLoansCount,
        overdueCount,
        totalDisbursedAmount: outstandingLoanResult._sum.balance ? Number(outstandingLoanResult._sum.balance) : 0,
        totalPendingAmount: pendingCount,
        repaymentPerformance: (disbursedCount + overdueCount) > 0 ? +(completedLoansCount / (disbursedCount + overdueCount + completedLoansCount) * 100).toFixed(1) : 0
      },
      announcements: toCamelCase(announcements),
      meetings: toCamelCase(upcomingMeetings),
      recentActivity: activityItems,
      recentShares: toCamelCase(recentShares),
      savingsTrend,
      loanPortfolio
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
