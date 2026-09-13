const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

function buildLoanFilter(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.memberId) where.member_id = query.memberId;
  if (query.startDate) where.created_at = { gte: new Date(query.startDate) };
  if (query.endDate) where.created_at = { ...(where.created_at || {}), lte: new Date(query.endDate) };
  return where;
}

exports.contributionsReport = async (req, res) => {
  try {
    const isAdmin = req.member.role === 'admin';
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate) where.week = { gte: new Date(startDate) };
    if (endDate) where.week = { ...(where.week || {}), lte: new Date(endDate) };
    if (!isAdmin) where.member_id = req.member.id;

    const rows = await prisma.contribution.findMany({
      where,
      include: {
        member: { select: { full_name: true, email: true, phone: true } },
        recorded_by: { select: { full_name: true, email: true } }
      },
      orderBy: { week: 'desc' }
    });

    const grouped = {};
    let totalSavingsValue = 0;

    for (const c of rows) {
      const wk = c.week ? new Date(c.week).toISOString().split('T')[0] : 'Unknown';
      if (!grouped[wk]) grouped[wk] = { week: wk, count: 0, totalAmount: 0 };
      grouped[wk].count += 1;
      grouped[wk].totalAmount += Number(c.amount);
      totalSavingsValue += Number(c.amount);
    }

    const data = Object.values(grouped);

    return sendSuccess(res, 'Weekly contributions report retrieved', {
      data,
      total: data.length,
      title: 'Weekly Contributions Report',
      generatedAt: new Date().toISOString(),
      summary: { totalSavingsValue, totalContributionsRecorded: rows.length }
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.loansReport = async (req, res) => {
  try {
    const isAdmin = req.member.role === 'admin';
    let where = buildLoanFilter(req.query);

    if (!isAdmin) {
      where.member_id = req.member.id;
    }

    const rows = await prisma.loan.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });

    const memberIds = [...new Set(rows.map(l => l.member_id).filter(Boolean))];
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, full_name: true }
    });

    const memberMap = {};
    for (const m of members) memberMap[m.id] = m.full_name;

    const formatted = rows.map(l => {
      const memberName = memberMap[l.member_id] || `Unknown (${l.member_id.slice(0, 8)})`;
      return {
        id: l.id,
        memberName,
        amount: l.amount,
        interestRate: l.interest_rate,
        termMonths: l.term_months,
        status: l.status,
        requestDate: l.request_date ? new Date(l.request_date).toISOString().split('T')[0] : '',
        balance: l.balance
      };
    });

    const totalOutstanding = formatted.reduce((s, r) => s + (r.status === 'disbursed' || r.status === 'overdue' ? Number(r.balance || r.amount) : 0), 0);
    const totalLoansEver = formatted.length;
    const repaidLoans = formatted.filter(r => r.status === 'completed').length;
    const repaymentRate = totalLoansEver > 0 ? +((repaidLoans / totalLoansEver) * 100).toFixed(1) : 0;

    return sendSuccess(res, 'Loans report retrieved', {
      data: formatted,
      total: formatted.length,
      summary: {
        totalOutstandingPrincipal: totalOutstanding,
        repaymentRatePercent: repaymentRate,
        outstandingActiveCount: formatted.filter(r => r.status === 'disbursed' || r.status === 'overdue').length
      }
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.printLoansReport = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const rows = await prisma.loan.findMany({
      where: buildLoanFilter(req.query),
      orderBy: { created_at: 'desc' }
    });

    const memberIds = [...new Set(rows.map(l => l.member_id).filter(Boolean))];
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, full_name: true }
    });

    const memberMap = {};
    for (const m of members) memberMap[m.id] = m.full_name;

    const escapeHtml = (str) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loan Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Loan Report</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Amount</th>
              <th>Interest%</th>
              <th>Term</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(l => `
              <tr>
                <td>${escapeHtml(memberMap[l.member_id] || `Unknown (${String(l.member_id || '').slice(0, 8)})`)}</td>
                <td>${escapeHtml(l.amount)}</td>
                <td>${escapeHtml(l.interest_rate)}</td>
                <td>${escapeHtml(l.term_months)} months</td>
                <td>${escapeHtml(l.status)}</td>
                <td>${escapeHtml(l.balance)}</td>
                <td>${l.request_date ? escapeHtml(new Date(l.request_date).toISOString().split('T')[0]) : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button class="no-print" onclick="window.print()">Print</button>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.attendanceReport = async (req, res) => {
  try {
    const isAdmin = req.member.role === 'admin';
    const { meetingId } = req.query;

    const where = {};
    if (!isAdmin) where.member_id = req.member.id;
    if (meetingId) where.meeting_id = meetingId;

    const meetings = await prisma.meeting.findMany({});
    const meetingCodeMap = {};
    for (const m of meetings) meetingCodeMap[m.id] = m;

    const totalRegisteredMembers = await prisma.member.count({ where: { is_active: true } });

    let rows = await prisma.attendance.findMany({
      where,
      include: {
        member: { select: { full_name: true, email: true, phone: true } },
        verified_by: { select: { full_name: true, email: true } }
      },
      orderBy: { timestamp: 'desc' }
    });

    const byMeeting = {};

    for (const a of rows) {
      const mid = a.meeting_id;

      if (!byMeeting[mid]) {
        const meeting = meetings.find(m => m.id === mid) || meetingCodeMap[mid];
        const dateStr = meeting?.date
          ? (typeof meeting.date === 'string' ? meeting.date : new Date(meeting.date).toISOString().split('T')[0])
          : 'TBA';
        byMeeting[mid] = {
          meetingId: mid,
          title: meeting?.title || (mid === 'unknown' ? 'Unlinked Attendance Records' : `Assembly ${mid.slice(0, 8)}`),
          location: meeting?.location || 'TBA',
          date: dateStr,
          attendedCount: 0,
          totalRegisteredMembers
        };
      }
      byMeeting[mid].attendedCount += 1;
    }

    const data = Object.values(byMeeting).map(r => ({
      ...r,
      attendanceRatePercent: r.totalRegisteredMembers > 0 ? +(r.attendedCount / r.totalRegisteredMembers * 100).toFixed(1) : 0
    }));

    return sendSuccess(res, 'Attendance report retrieved', { data, total: data.length });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.defaultersReport = async (req, res) => {
  try {
    if (req.member.role !== 'admin') return sendError(res, 403, 'Not authorized');

    const overdueInstallments = await prisma.loanRepaymentSchedule.findMany({
      where: { status: 'overdue' },
      include: { loan: { select: { amount: true, status: true } } }
    });

    const memberIds = overdueInstallments.map(i => i.member_id).filter(Boolean);
    const uniqueMemberIds = [...new Set(memberIds)];

    const members = await prisma.member.findMany({
      where: { id: { in: uniqueMemberIds } },
      select: { id: true, full_name: true }
    });

    const memberMap = {};
    for (const m of members) memberMap[m.id] = m.full_name;

    const memberLoanMap = {};

    for (const inst of overdueInstallments) {
      const memberId = inst.member_id;
      const loanId = inst.loan_id;
      const memberName = memberMap[memberId] || `Unknown (${String(memberId || '').slice(0, 8)})`;
      const totalLoanAmount = Number(inst.loan?.amount || 0);
      const amountOverdue = (Number(inst.total_amount) || 0) - (Number(inst.paid_amount) || 0);
      const key = `${memberId}_${loanId}`;

      if (!memberLoanMap[key]) {
        memberLoanMap[key] = {
          memberId,
          loanId,
          memberName,
          totalLoanAmount,
          amountOverdue: 0,
          overdueInstallmentsCount: 0,
          lastDueDate: inst.due_date ? new Date(inst.due_date).toISOString().split('T')[0] : ''
        };
      }

      memberLoanMap[key].amountOverdue += Math.max(0, amountOverdue);
      memberLoanMap[key].overdueInstallmentsCount += 1;

      if (inst.due_date && new Date(inst.due_date) > new Date(memberLoanMap[key].lastDueDate)) {
        memberLoanMap[key].lastDueDate = new Date(inst.due_date).toISOString().split('T')[0];
      }
    }

    return sendSuccess(res, 'Defaulters report retrieved', {
      defaultersCount: Object.keys(memberLoanMap).length,
      data: Object.values(memberLoanMap)
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.memberActivityReport = async (req, res) => {
  try {
    const isAdmin = req.member.role === 'admin';
    const { memberId, startDate, endDate } = req.query;

    const memberFilter = isAdmin
      ? (memberId ? { id: memberId } : {})
      : { id: req.member.id };

    const members = await prisma.member.findMany({
      where: memberFilter,
      select: { id: true, full_name: true, role: true }
    });

    const enriched = await Promise.all(members.map(async (m) => {
      const loanCount = await prisma.loan.count({ where: { member_id: m.id } });
      const contribCount = await prisma.contribution.count({ where: { member_id: m.id } });
      const attendanceCount = await prisma.attendance.count({ where: { member_id: m.id } });

      return {
        memberId: m.id,
        fullName: m.full_name,
        role: m.role,
        contributionsSubmitted: contribCount,
        loansApplied: loanCount,
        meetingsAttended: attendanceCount
      };
    }));

    return sendSuccess(res, 'Member activity report retrieved', { data: enriched, total: enriched.length });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};
