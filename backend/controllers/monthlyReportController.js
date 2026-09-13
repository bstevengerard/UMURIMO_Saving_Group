const prisma = require('../lib/prisma').getDB();
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');
const { computeHash, buildEnvelope } = require('../services/reportRenderService');
const PDF_COLUMNS = [
  { key: 'fullName', label: 'Full Name', type: 'string' },
  { key: 'phone', label: 'Phone', type: 'string' },
  { key: 'contributionAmount', label: 'Contribution (RWF)', type: 'currency' },
  { key: 'contributionStatus', label: 'Contr. Status', type: 'string' },
  { key: 'outstandingContributionAmount', label: 'Outstanding Contr.', type: 'currency' },
  { key: 'loanCount', label: 'Loans', type: 'number' },
  { key: 'approvedDisbursedAmount', label: 'Disbursed (RWF)', type: 'currency' },
  { key: 'outstandingLoanBalance', label: 'Loan Balance', type: 'currency' },
  { key: 'totalBalance', label: 'Total Balance', type: 'currency' },
  { key: 'totalRepaidThisPeriod', label: 'Repaid (RWF)', type: 'currency' },
  { key: 'totalRepaidToDate', label: 'Total Repaid', type: 'currency' },
  { key: 'overdueAmount', label: 'Overdue (RWF)', type: 'currency' },
  { key: 'overdueInstallmentsCount', label: 'Overdue Inst.', type: 'number' },
  { key: 'attendanceCount', label: 'Attended', type: 'number' },
  { key: 'expectedMeetings', label: 'Meetings', type: 'number' },
  { key: 'attendancePercentage', label: 'Attendance %', type: 'number' },
  { key: 'missedMeetings', label: 'Missed', type: 'number' }
];

const COLUMNS = [
  { key: 'fullName', label: 'Full Name', type: 'string' },
  { key: 'phone', label: 'Phone', type: 'string' },
  { key: 'contributionAmount', label: 'Contribution (RWF)', type: 'currency' },
  { key: 'contributionStatus', label: 'Contr. Status', type: 'string' },
  { key: 'outstandingContributionAmount', label: 'Outstanding Contr.', type: 'currency' },
  { key: 'loanCount', label: 'Loans', type: 'number' },
  { key: 'approvedDisbursedAmount', label: 'Disbursed (RWF)', type: 'currency' },
  { key: 'outstandingLoanBalance', label: 'Loan Balance', type: 'currency' },
  { key: 'totalBalance', label: 'Total Balance', type: 'currency' },
  { key: 'totalRepaidThisPeriod', label: 'Repaid (RWF)', type: 'currency' },
  { key: 'totalRepaidToDate', label: 'Total Repaid', type: 'currency' },
  { key: 'overdueAmount', label: 'Overdue (RWF)', type: 'currency' },
  { key: 'overdueInstallmentsCount', label: 'Overdue Inst.', type: 'number' },
  { key: 'attendanceCount', label: 'Attended', type: 'number' },
  { key: 'expectedMeetings', label: 'Meetings', type: 'number' },
  { key: 'attendancePercentage', label: 'Attendance %', type: 'number' },
  { key: 'missedMeetings', label: 'Missed', type: 'number' }
];

function getMonthBounds(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return null;
  const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}

function getMonthLabel(year, month) {
  const y = Number(year);
  const m = Number(month);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

async function logAudit(actorId, actorRole, action, entityType, entityId, changes = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        actor_id: actorId,
        actor_role: actorRole,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes
      }
    });
  } catch (err) {
    console.error('[AuditLog Error]', err.message);
  }
}

async function buildReportPayload(year, month, member) {
  const bounds = getMonthBounds(year, month);
  if (!bounds) throw new Error('Invalid year or month');
  const { startDate, endDate } = bounds;
  const label = getMonthLabel(year, month);

  const members = await prisma.member.findMany({
    select: { id: true, full_name: true, phone: true }
  });

  const contributionWhere = { week: { gte: startDate, lte: endDate } };
  const contributions = await prisma.contribution.findMany({
    where: contributionWhere,
    include: { member: { select: { full_name: true, phone: true } } }
  });

  const contribByMember = {};
  const outstandingByMember = {};
  for (const c of contributions) {
    if (!contribByMember[c.member_id]) {
      contribByMember[c.member_id] = { total: 0, status: c.payment_status };
    }
    contribByMember[c.member_id].total += Number(c.amount);
    if (c.payment_status === 'pending' || c.payment_status === 'overdue') {
      outstandingByMember[c.member_id] = (outstandingByMember[c.member_id] || 0) + Number(c.amount);
    }
  }

  const loanWhere = { request_date: { gte: startDate, lte: endDate } };
  const loans = await prisma.loan.findMany({
    where: loanWhere,
    include: { member: { select: { full_name: true, phone: true } } }
  });

  const loanByMember = {};
  for (const l of loans) {
    if (!loanByMember[l.member_id]) {
      loanByMember[l.member_id] = { count: 0, disbursed: 0, balance: 0 };
    }
    loanByMember[l.member_id].count += 1;
    if (l.status === 'disbursed' || l.status === 'overdue') {
      loanByMember[l.member_id].disbursed += Number(l.amount);
      loanByMember[l.member_id].balance += Number(l.balance);
    }
  }

  const repaymentWhere = { paid_at: { gte: startDate, lte: endDate }, approval_status: 'approved' };
  const repayments = await prisma.loanRepaymentSchedule.findMany({
    where: repaymentWhere
  });

  const repaymentByMember = {};
  for (const r of repayments) {
    if (!repaymentByMember[r.member_id]) {
      repaymentByMember[r.member_id] = { thisPeriod: 0, toDate: 0 };
    }
    repaymentByMember[r.member_id].thisPeriod += Number(r.paid_amount) || 0;
    repaymentByMember[r.member_id].toDate += Number(r.paid_amount) || 0;
  }

  const allRepayments = await prisma.loanRepaymentSchedule.findMany({
    where: { approval_status: 'approved' }
  });
  const allRepaymentByMember = {};
  for (const r of allRepayments) {
    if (!allRepaymentByMember[r.member_id]) {
      allRepaymentByMember[r.member_id] = 0;
    }
    allRepaymentByMember[r.member_id] += Number(r.paid_amount) || 0;
  }

  const overdueInstallments = await prisma.loanRepaymentSchedule.findMany({
    where: { status: 'overdue' },
    include: { loan: { select: { amount: true } } }
  });

  const overdueByMember = {};
  for (const inst of overdueInstallments) {
    if (!overdueByMember[inst.member_id]) {
      overdueByMember[inst.member_id] = { amount: 0, count: 0 };
    }
    overdueByMember[inst.member_id].amount += Math.max(0, Number(inst.total_amount) - (Number(inst.paid_amount) || 0));
    overdueByMember[inst.member_id].count += 1;
  }

  const attendanceWhere = { timestamp: { gte: startDate, lte: endDate } };
  const attendances = await prisma.attendance.findMany({
    where: attendanceWhere
  });

  const attendanceByMember = {};
  for (const a of attendances) {
    if (!attendanceByMember[a.member_id]) {
      attendanceByMember[a.member_id] = 0;
    }
    attendanceByMember[a.member_id] += 1;
  }

  const meetings = await prisma.meeting.findMany({
    where: { date: { gte: startDate, lte: endDate } }
  });
  const expectedMeetings = meetings.length;

  const data = members.map(m => {
    const contrib = contribByMember[m.id] || { total: 0, status: 'pending' };
    const loan = loanByMember[m.id] || { count: 0, disbursed: 0, balance: 0 };
    const repayment = repaymentByMember[m.id] || { thisPeriod: 0, toDate: 0 };
    const overdue = overdueByMember[m.id] || { amount: 0, count: 0 };
    const attended = attendanceByMember[m.id] || 0;
    const missed = Math.max(0, expectedMeetings - attended);
    const attendancePercentage = expectedMeetings > 0 ? +(attended / expectedMeetings * 100).toFixed(1) : 0;

    return {
      fullName: m.full_name,
      phone: m.phone,
      contributionAmount: contrib.total,
      contributionStatus: contrib.status,
      outstandingContributionAmount: outstandingByMember[m.id] || 0,
      loanCount: loan.count,
      approvedDisbursedAmount: loan.disbursed,
      outstandingLoanBalance: loan.balance,
      totalBalance: loan.balance,
      totalRepaidThisPeriod: repayment.thisPeriod,
      totalRepaidToDate: allRepaymentByMember[m.id] || 0,
      overdueAmount: overdue.amount,
      overdueInstallmentsCount: overdue.count,
      attendanceCount: attended,
      expectedMeetings,
      attendancePercentage,
      missedMeetings: missed
    };
  });

  const summary = {
    totalMembers: members.length,
    totalContributions: contributions.length,
    totalLoansApplied: loans.length,
    totalMeetingsAttended: attendances.length
  };

  const payload = buildEnvelope({
    title: `${label} Monthly Member Report`,
    period: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), label },
    generatedBy: { id: member.id, fullName: member.full_name, role: member.role },
    summary,
    columns: COLUMNS,
    data,
    total: data.length
  });

  return payload;
}

exports.listMonthlyReports = async (req, res) => {
  try {
    const { year, month } = req.query;
    let where = { report_type: 'monthly-member-summary' };

    if (year || month) {
      const y = Number(year);
      const m = Number(month);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);
        where.period_start_date = { gte: startDate };
        where.period_end_date = { lte: endDate };
      }
    }

    const reports = await prisma.reportSnapshot.findMany({
      where,
      orderBy: { period_start_date: 'desc' },
      select: {
        id: true,
        report_type: true,
        period_start_date: true,
        period_end_date: true,
        period_label: true,
        generated_by_id: true,
        generated_by_full_name: true,
        generated_by_role: true,
        generated_at: true,
        created_at: true,
        payload_hash: true
      }
    });

    const formatted = reports.map(r => ({
      id: r.id,
      reportType: r.report_type,
      period: {
        startDate: r.period_start_date,
        endDate: r.period_end_date,
        label: r.period_label
      },
      generatedBy: {
        id: r.generated_by_id,
        fullName: r.generated_by_full_name,
        role: r.generated_by_role
      },
      generatedAt: r.generated_at,
      createdAt: r.created_at,
      payloadHash: r.payload_hash
    }));

    return sendSuccess(res, 'Monthly report archive retrieved', {
      data: formatted,
      total: formatted.length
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.getMonthlyMemberSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) {
      return sendError(res, 400, 'year and month are required');
    }

    const bounds = getMonthBounds(year, month);
    if (!bounds) {
      return sendError(res, 400, 'Invalid year or month');
    }

    const { startDate, endDate } = bounds;
    const label = getMonthLabel(year, month);

    const existing = await prisma.reportSnapshot.findFirst({
      where: {
        report_type: 'monthly-member-summary',
        period_start_date: startDate,
        period_end_date: endDate
      },
      orderBy: { generated_at: 'desc' }
    });

    if (existing) {
      return sendSuccess(res, 'Monthly report found', {
        exists: true,
        report: {
          id: existing.id,
          reportType: existing.report_type,
          period: { startDate: existing.period_start_date, endDate: existing.period_end_date, label: existing.period_label },
          generatedBy: { id: existing.generated_by_id, fullName: existing.generated_by_full_name, role: existing.generated_by_role },
          generatedAt: existing.generated_at,
          createdAt: existing.created_at,
          payload: existing.payload,
          payloadHash: existing.payload_hash
        }
      });
    }

    return sendSuccess(res, 'No monthly report found', {
      exists: false,
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), label }
    });
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.generateMonthlyMemberSummary = async (req, res) => {
  try {
    const { year, month, forceRegenerate = false } = req.body;
    if (!year || !month) {
      return sendError(res, 400, 'year and month are required');
    }

    const bounds = getMonthBounds(year, month);
    if (!bounds) {
      return sendError(res, 400, 'Invalid year or month');
    }

    const { startDate, endDate } = bounds;
    const label = getMonthLabel(year, month);

    const existing = await prisma.reportSnapshot.findFirst({
      where: {
        report_type: 'monthly-member-summary',
        period_start_date: startDate,
        period_end_date: endDate
      },
      orderBy: { generated_at: 'desc' }
    });

    if (existing && !forceRegenerate) {
      return sendError(res, 409, 'A report for this period already exists', {
        snapshotId: existing.id,
        report: {
          id: existing.id,
          period: { startDate: existing.period_start_date, endDate: existing.period_end_date, label: existing.period_label },
          generatedAt: existing.generated_at,
          generatedBy: { id: existing.generated_by_id, fullName: existing.generated_by_full_name, role: existing.generated_by_role },
          payload: existing.payload
        }
      });
    }

    if (existing && forceRegenerate) {
      await prisma.reportSnapshot.delete({ where: { id: existing.id } });
    }

    const payload = await buildReportPayload(year, month, req.member);
    const payloadHash = computeHash(payload);

    const generatedBy = {
      id: req.member.id,
      fullName: req.member.full_name,
      role: req.member.role
    };

    const snapshot = await prisma.reportSnapshot.create({
      data: {
        report_type: 'monthly-member-summary',
        period_start_date: startDate,
        period_end_date: endDate,
        period_label: label,
        generated_by_id: req.member.id,
        generated_by_full_name: req.member.full_name,
        generated_by_role: req.member.role,
        payload: { ...payload, generatedBy },
        payload_hash: payloadHash
      }
    });

    await logAudit(req.member.id, req.member.role, 'generate_monthly_report', 'ReportSnapshot', snapshot.id, {
      period: { startDate, endDate, label }, payloadHash
    });

    return sendSuccess(res, 'Monthly report generated successfully', {
      snapshotId: snapshot.id, report: payload
    }, 201);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};

exports.exportMonthlyMemberSummary = async (req, res) => {
  try {
    const { year, month, format = 'pdf' } = req.query;
    if (!year || !month) {
      return sendError(res, 400, 'year and month are required');
    }

    const bounds = getMonthBounds(year, month);
    if (!bounds) {
      return sendError(res, 400, 'Invalid year or month');
    }

    const { startDate, endDate } = bounds;
    const label = getMonthLabel(year, month);

    const snapshot = await prisma.reportSnapshot.findFirst({
      where: {
        report_type: 'monthly-member-summary',
        period_start_date: startDate,
        period_end_date: endDate
      },
      orderBy: { generated_at: 'desc' }
    });

    if (!snapshot) {
      return sendError(res, 404, 'No report found for this period. Please generate it first.');
    }

    const { renderExport } = require('../services/reportRenderService');
    const envelope = buildEnvelope({
      title: snapshot.payload?.title || `${label} Monthly Member Report`,
      period: snapshot.payload?.period || {},
      generatedAt: snapshot.generated_at,
      generatedBy: {
        id: snapshot.generated_by_id,
        fullName: snapshot.generated_by_full_name,
        role: snapshot.generated_by_role
      },
      summary: snapshot.payload?.summary,
      columns: format === 'pdf' ? PDF_COLUMNS : (snapshot.payload?.columns || COLUMNS),
      data: snapshot.payload?.data || [],
      total: snapshot.payload?.total || (snapshot.payload?.data || []).length
    });

    const { buffer, contentType, extension } = await renderExport(envelope, format);
    const filename = `umurimo_monthly_report_${year}-${String(month).padStart(2, '0')}.${extension}`;

    await logAudit(req.member.id, req.member.role, `export_monthly_${format}`, 'ReportSnapshot', snapshot.id, {
      period: { startDate, endDate, label }, format, filename
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return handlePrismaError(res, err);
  }
};