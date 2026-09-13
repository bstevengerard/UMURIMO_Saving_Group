const cron = require('node-cron');
const { getDB } = require('../lib/prisma');
const prisma = getDB();
const { sendSms } = require('../controllers/smsController');

const scheduledJobs = new Map();

exports.initializeScheduler = () => {
  if (scheduledJobs.size > 0) {
    console.log('[Scheduler] Already initialized');
    return;
  }

  scheduledJobs.set('overdue-loans', cron.schedule('0 9 * * *', async () => {
    console.log('[Scheduler] Running overdue loan check...');
    try {
      const today = new Date();
      const overdueLoans = await prisma.loan.findMany({
        where: {
          due_date: { lt: today },
          status: { in: ['disbursed', 'approved'] },
          balance: { gt: 0 }
        },
        include: {
          member: {
            select: { phone: true, full_name: true }
          }
        }
      });

      for (const loan of overdueLoans) {
        await prisma.smsNotification.create({
          data: {
            recipient_phone: loan.member.phone,
            recipient_member_id: loan.member_id,
            message: `Reminder: Your loan of ${loan.amount} RWF is overdue. Balance: ${loan.balance} RWF. Please make payment.`,
            status: 'pending',
            priority: 'high',
            category: 'loan',
            created_by_id: loan.member_id
          }
        });
      }
      console.log(`[Scheduler] Created ${overdueLoans.length} overdue loan reminders`);
    } catch (error) {
      console.error('[Scheduler] Overdue loan check failed:', error.message);
    }
  }));

  scheduledJobs.set('contribution-reminders', cron.schedule('0 8 * * 1', async () => {
    console.log('[Scheduler] Running weekly contribution reminder check...');
    try {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const members = await prisma.member.findMany({
        where: { is_active: true }
      });
      const pendingContributions = await prisma.contribution.findMany({
        where: {
          week: { gte: startOfWeek },
          payment_status: 'pending'
        }
      });

      const memberPendingMap = new Map();
      pendingContributions.forEach(c => {
        const memberId = c.member_id;
        if (!memberPendingMap.has(memberId)) memberPendingMap.set(memberId, []);
        memberPendingMap.get(memberId).push(c);
      });

      for (const member of members) {
        if (memberPendingMap.has(member.id)) {
          await prisma.smsNotification.create({
            data: {
              recipient_phone: member.phone,
              recipient_member_id: member.id,
              message: `Reminder: This week's contribution is pending. Please make your payment today.`,
              status: 'pending',
              priority: 'medium',
              category: 'contribution',
              created_by_id: member.id
            }
          });
        }
      }
      console.log(`[Scheduler] Sent contribution reminders to ${memberPendingMap.size} members`);
    } catch (error) {
      console.error('[Scheduler] Contribution reminder check failed:', error.message);
    }
  }));

  scheduledJobs.set('meeting-reminders', cron.schedule('0 7 * * *', async () => {
    console.log('[Scheduler] Running meeting reminder check...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const meetings = await prisma.meeting.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          is_active: true
        }
      });

      const members = await prisma.member.findMany({
        where: { is_active: true }
      });

      for (const meeting of meetings) {
        for (const member of members) {
          await prisma.smsNotification.create({
            data: {
              recipient_phone: member.phone,
              recipient_member_id: member.id,
              message: `Reminder: Meeting "${meeting.title}" today at ${meeting.start_time}. Location: ${meeting.location || 'TBD'}`,
              status: 'pending',
              priority: 'medium',
              category: 'meeting',
              created_by_id: member.id
            }
          });
        }
      }
      console.log(`[Scheduler] Sent meeting reminders for ${meetings.length} meetings`);
    } catch (error) {
      console.error('[Scheduler] Meeting reminder check failed:', error.message);
    }
  }));

  scheduledJobs.set('mark-overdue', cron.schedule('0 0 * * *', async () => {
    console.log('[Scheduler] Running overdue contribution mark...');
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const result = await prisma.contribution.updateMany({
        where: {
          payment_status: 'pending',
          week: { lt: currentMonth }
        },
        data: {
          payment_status: 'overdue'
        }
      });
      console.log(`[Scheduler] Marked ${result.count} contributions as overdue`);
    } catch (error) {
      console.error('[Scheduler] Overdue mark failed:', error.message);
    }
  }));

  scheduledJobs.set('monthly-report-generation', cron.schedule('0 0 1 * *', async () => {
    console.log('[Scheduler] Running monthly report generation...');
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed, so this is the previous month

      const startDate = new Date(year, month, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const existing = await prisma.reportSnapshot.findFirst({
        where: {
          report_type: 'monthly-member-summary',
          period_start_date: startDate,
          period_end_date: endDate
        }
      });

      if (existing) {
        console.log(`[Scheduler] Monthly report for ${month + 1}/${year} already exists`);
        return;
      }

      const members = await prisma.member.findMany({
        select: { id: true, full_name: true, phone: true }
      });

      const contributions = await prisma.contribution.findMany({
        where: { week: { gte: startDate, lte: endDate } },
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

      const loans = await prisma.loan.findMany({
        where: { request_date: { gte: startDate, lte: endDate } },
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

      const repayments = await prisma.loanRepaymentSchedule.findMany({
        where: { paid_at: { gte: startDate, lte: endDate }, approval_status: 'approved' }
      });

      const repaymentByMember = {};
      const allRepaymentByMember = {};
      for (const r of repayments) {
        if (!repaymentByMember[r.member_id]) {
          repaymentByMember[r.member_id] = { thisPeriod: 0, toDate: 0 };
        }
        repaymentByMember[r.member_id].thisPeriod += Number(r.paid_amount) || 0;
        repaymentByMember[r.member_id].toDate += Number(r.paid_amount) || 0;
        allRepaymentByMember[r.member_id] = (allRepaymentByMember[r.member_id] || 0) + (Number(r.paid_amount) || 0);
      }

      const allRepayments = await prisma.loanRepaymentSchedule.findMany({
        where: { approval_status: 'approved' }
      });
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

      const attendances = await prisma.attendance.findMany({
        where: { timestamp: { gte: startDate, lte: endDate } }
      });

      const attendanceByMember = {};
      for (const a of attendances) {
        attendanceByMember[a.member_id] = (attendanceByMember[a.member_id] || 0) + 1;
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

      const label = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      const payload = buildEnvelope({
        title: `${label} Monthly Member Report`,
        period: { startDate: startDate.toISOString(), endDate: endDate.toISOString(), label },
        generatedBy: { id: 'system', fullName: 'Scheduled Auto-Generation', role: 'system' },
        summary,
        columns: require('../controllers/monthlyReportController').COLUMNS,
        data,
        total: data.length
      });

      const payloadHash = computeHash(payload);

      await prisma.reportSnapshot.create({
        data: {
          report_type: 'monthly-member-summary',
          period_start_date: startDate,
          period_end_date: endDate,
          period_label: label,
          generated_by_id: 'system',
          generated_by_full_name: 'Scheduled Auto-Generation',
          generated_by_role: 'system',
          payload: { ...payload, generatedBy: { id: 'system', fullName: 'Scheduled Auto-Generation', role: 'system' } },
          payload_hash: payloadHash
        }
      });

      console.log(`[Scheduler] Generated monthly report for ${label}`);
    } catch (error) {
      console.error('[Scheduler] Monthly report generation failed:', error.message);
    }
  }));

  console.log('[Scheduler] Initialized with', scheduledJobs.size, 'jobs');
};

exports.stopScheduler = () => {
  scheduledJobs.forEach((job, name) => job.stop());
  scheduledJobs.clear();
  console.log('[Scheduler] Stopped all jobs');
};

exports.getSchedulerStatus = () => {
  const status = {};
  scheduledJobs.forEach((job, name) => {
    status[name] = job.running ? 'running' : 'stopped';
  });
  return status;
};
