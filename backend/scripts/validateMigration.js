const { getDB } = require('../lib/prisma');

async function validate() {
  const prisma = getDB();
  const results = {
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL via Prisma',
    tables: {},
    issues: []
  };

  const tables = [
    'members',
    'permissions',
    'contribution_types',
    'contributions',
    'loan_configurations',
    'loans',
    'loan_repayment_schedules',
    'savings',
    'member_shares',
    'share_profit_distributions',
    'meetings',
    'meeting_fines',
    'attendance',
    'emergency_aids',
    'emergency_aid_payments',
    'announcements',
    'audit_logs',
    'sms_templates',
    'sms_notifications',
    'sms_subscriptions',
    'report_snapshots',
    'password_reset_tokens'
  ];

  const modelMap = {
    members: 'member',
    permissions: 'permission',
    contribution_types: 'contributionType',
    contributions: 'contribution',
    loan_configurations: 'loanConfiguration',
    loans: 'loan',
    loan_repayment_schedules: 'loanRepaymentSchedule',
    savings: 'savings',
    member_shares: 'memberShare',
    share_profit_distributions: 'shareProfitDistribution',
    meetings: 'meeting',
    meeting_fines: 'meetingFine',
    attendance: 'attendance',
    emergency_aids: 'emergencyAid',
    emergency_aid_payments: 'emergencyAidPayment',
    announcements: 'announcement',
    audit_logs: 'auditLog',
    sms_templates: 'smsTemplate',
    sms_notifications: 'smsNotification',
    sms_subscriptions: 'smsSubscription',
    report_snapshots: 'reportSnapshot',
    password_reset_tokens: 'passwordResetToken'
  };

  for (const table of tables) {
    const modelKey = modelMap[table];
    if (!modelKey) {
      results.tables[table] = { count: null, error: 'Unknown model mapping' };
      results.issues.push(`No model mapping for ${table}`);
      continue;
    }

    try {
      const count = await prisma[modelKey].count();
      results.tables[table] = { count };
    } catch (err) {
      results.tables[table] = { count: null, error: err.message };
      results.issues.push(`Failed to count ${table}: ${err.message}`);
    }
  }

  try {
    const orphanContributions = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM contributions c
      LEFT JOIN members m ON c.member_id = m.id
      WHERE m.id IS NULL
    `;
    results.orphanChecks = orphanContributions;
  } catch (err) {
    results.issues.push(`Orphan check failed: ${err.message}`);
  }

  try {
    const duplicateEmails = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count FROM members
      GROUP BY email HAVING COUNT(*) > 1
    `;
    results.duplicateChecks = { emails: duplicateEmails };
  } catch (err) {
    results.issues.push(`Duplicate email check failed: ${err.message}`);
  }

  try {
    const loanBalanceCheck = await prisma.loan.findMany({
      where: { status: { in: ['disbursed', 'overdue', 'completed'] } },
      include: { repayment_schedules: true }
    });

    const mismatches = [];
    for (const loan of loanBalanceCheck) {
      const sumPaid = loan.repayment_schedules.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
      const expectedBalance = Math.max(0, Number(loan.amount) + Number(loan.total_interest_rate || 0) * Number(loan.term_months) / 100 - sumPaid);
      if (Math.abs(Number(loan.balance) - expectedBalance) > 0.01) {
        mismatches.push({
          loanId: loan.id,
          recordedBalance: Number(loan.balance),
          expectedBalance
        });
      }
    }
    results.financialChecks = { loanBalanceMismatches: mismatches };
  } catch (err) {
    results.issues.push(`Loan balance check failed: ${err.message}`);
  }

  console.log(JSON.stringify(results, (key, value) => typeof value === 'bigint' ? Number(value) : value, 2));
}

validate().catch(err => {
  console.error('Validation failed:', err);
  process.exit(1);
});