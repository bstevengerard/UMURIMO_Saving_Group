const { getDB } = require('../lib/prisma');
const prisma = getDB();

let cachedConfig = null;
let cachedConfigAt = 0;
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

async function getCurrentConfig(tx = prisma) {
  const now = Date.now();
  if (cachedConfig && now - cachedConfigAt < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  let config = await tx.loanConfiguration.findFirst();
  if (!config) {
    config = await tx.loanConfiguration.create({ data: {} });
  }

  cachedConfig = config;
  cachedConfigAt = now;
  return config;
}

// ── Loan Eligibility & Limits ────────────────────────────────────────────────

async function getAllowedLoanAmount(memberId, tx = prisma) {
  const config = await getCurrentConfig(tx);
  const memberShares = await tx.memberShare.findUnique({
    where: { member_id: memberId }
  });
  const totalSavingsResult = await tx.savings.aggregate({
    where: { member_id: memberId },
    _sum: { amount: true }
  });
  const savings = totalSavingsResult._sum.amount ? Number(totalSavingsResult._sum.amount) : 0;
  const sharesValue = memberShares ? Number(memberShares.number_of_shares) * Number(memberShares.share_value) : 0;

  let principalBase = 0;
  if (config.principal_base === 'totalSavings') {
    principalBase = savings;
  } else if (config.principal_base === 'totalShares') {
    principalBase = sharesValue;
  } else if (config.principal_base === 'savingsAndShares') {
    principalBase = savings + sharesValue;
  } else if (config.principal_base === 'fixedAmount') {
    principalBase = Number(config.fixed_principal_base) || 0;
  }

  const maxAllowed = principalBase * Number(config.loan_limit_multiplier);
  const effectiveMax = Math.min(maxAllowed, Number(config.max_loan_amount));

  const activeLoans = await tx.loan.count({
    where: {
      member_id: memberId,
      status: { in: ['pending', 'approved', 'disbursed', 'overdue'] }
    }
  });

  const monthlyTotalResult = await tx.loan.aggregate({
    where: {
      member_id: memberId,
      status: { in: ['pending', 'approved', 'disbursed'] },
      request_date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    },
    _sum: { amount: true }
  });
  const monthlyBorrowed = monthlyTotalResult._sum.amount ? Number(monthlyTotalResult._sum.amount) : 0;

  let eligibilityStatus = 'eligible';
  let ineligibilityReasons = [];

  if (activeLoans >= config.max_active_loans) {
    eligibilityStatus = 'not_eligible';
    ineligibilityReasons.push('Maximum active loans reached');
  }

  if (config.monthly_loan_limit > 0 && monthlyBorrowed >= Number(config.monthly_loan_limit)) {
    eligibilityStatus = 'not_eligible';
    ineligibilityReasons.push('Monthly loan limit reached');
  }

  if (effectiveMax <= 0) {
    eligibilityStatus = 'not_eligible';
    ineligibilityReasons.push('No eligible principal base');
  } else if (effectiveMax < Number(config.min_loan_amount)) {
    eligibilityStatus = 'not_eligible';
    ineligibilityReasons.push('Eligible amount below minimum loan amount');
  }

  const unpaidEmergencyAid = await tx.emergencyAidPayment.count({
    where: {
      member_id: memberId,
      payment_status: { in: ['pending', 'overdue'] }
    }
  });

  if (unpaidEmergencyAid > 0 && config.emergency_aid_restriction_rule === 'block_new_loans') {
    eligibilityStatus = 'not_eligible';
    ineligibilityReasons.push('Unpaid emergency aid obligations exist');
  }

  const ingobokaEligibility = await checkIngobokaEligibility(memberId, tx);
  if (!ingobokaEligibility.eligible) {
    eligibilityStatus = 'not_eligible';
    ineligibilityReasons.push(ingobokaEligibility.reason);
  }

  return {
    maxAllowed: effectiveMax,
    minLoanAmount: Number(config.min_loan_amount),
    principalBase,
    loanLimitMultiplier: Number(config.loan_limit_multiplier),
    eligibilityStatus,
    ineligibilityReasons,
    activeLoans,
    monthlyBorrowed,
    monthlyLoanLimit: Number(config.monthly_loan_limit),
    baseInterestRate: Number(config.base_interest_rate),
    interestIncrement: Number(config.interest_increment),
    allowInterestIncrement: config.allow_interest_increment,
    ingobokaEligibility
  };
}

async function checkIngobokaEligibility(memberId, tx = prisma) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const participationCount = await tx.emergencyAidPayment.count({
    where: {
      member_id: memberId,
      created_at: { lte: threeMonthsAgo }
    }
  });

  if (participationCount >= 1) {
    return {
      eligible: true,
      reason: null,
      participationMonths: participationCount
    };
  }

  return {
    eligible: false,
    reason: 'Not enough months of Ingoboka participation (minimum 3 months required)',
    participationMonths: participationCount
  };
}

// ── Interest & Repayment Calculations ────────────────────────────────────────

function calculateInterest(principal, annualRatePercent, termMonths) {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(annualRatePercent) || annualRatePercent <= 0) return 0;
  if (!Number.isFinite(termMonths) || termMonths <= 0) return 0;
  const totalInterest = (principal * (annualRatePercent / 100) * termMonths) / 12;
  return Math.round(totalInterest * 100) / 100;
}

function calculateTotalRepayment(principal, annualRatePercent, termMonths) {
  const interest = calculateInterest(principal, annualRatePercent, termMonths);
  const total = principal + interest;
  return Math.round(total * 100) / 100;
}

function calculateMonthlyInstallment(totalRepayment, termMonths) {
  if (!Number.isFinite(totalRepayment) || totalRepayment <= 0) return 0;
  if (!Number.isFinite(termMonths) || termMonths <= 0) return 0;
  return Math.round((totalRepayment / termMonths) * 100) / 100;
}

async function generateRepaymentSchedule(loan) {
  const config = await getCurrentConfig();
  const totalAmount = Number(loan.balance);
  const principal = Number(loan.amount);
  const totalInterest = +(totalAmount - principal).toFixed(2);

  if (totalAmount <= 0 || principal <= 0) {
    return [];
  }

  const term = Number(loan.term_months);
  if (term <= 0) return [];

  const monthlyPrincipalRaw = principal / term;
  const monthlyInterestRaw = totalInterest / term;
  const monthlyPrincipal = Math.round(monthlyPrincipalRaw * 100) / 100;
  const monthlyInterest = Math.round(monthlyInterestRaw * 100) / 100;

  const interestRate = loan.total_interest_rate || loan.interest_rate || Number(config.base_interest_rate);

  let principalAccum = 0;
  let interestAccum = 0;
  const schedule = [];

  const startDate = loan.disbursement_date || loan.request_date || new Date();

  for (let i = 1; i <= term; i++) {
    const isLast = i === term;
    const principalThis = isLast ? +(principal - principalAccum).toFixed(2) : monthlyPrincipal;
    const interestThis = isLast ? +(totalInterest - interestAccum).toFixed(2) : monthlyInterest;

    principalAccum = +(principalAccum + principalThis).toFixed(2);
    interestAccum = +(interestAccum + interestThis).toFixed(2);

    const totalThis = +(principalThis + interestThis).toFixed(2);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      loan_id: loan.id,
      member_id: loan.member_id,
      installment_number: i,
      due_date: dueDate,
      principal_amount: principalThis,
      interest_amount: interestThis,
      total_amount: totalThis,
      status: 'pending',
      interest_rate_at_time: interestRate
    });
  }

  return schedule;
}

// ── Profit Calculation ──────────────────────────────────────────────────────

async function calculateLoanProfit(loanId) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId }
  });
  if (!loan) return null;

  const schedule = await prisma.loanRepaymentSchedule.findMany({
    where: { loan_id: loan.id }
  });
  const totalPrincipalPaid = schedule.reduce((sum, s) => sum + (Number(s.paid_amount) || 0), 0);
  const totalInterest = schedule.reduce((sum, s) => sum + (Number(s.interest_amount) || 0), 0);
  const totalPenalties = 0;

  const config = await getCurrentConfig();
  let profit = 0;

  if (config.profit_formula === 'interest_plus_penalties') {
    profit = totalInterest + totalPenalties;
  } else if (config.profit_formula === 'interest_plus_penalties_plus_principal') {
    profit = totalInterest + totalPenalties + totalPrincipalPaid;
  }

  return {
    principalRecovered: totalPrincipalPaid,
    interestEarned: totalInterest,
    penalties: totalPenalties,
    totalCollected: totalPrincipalPaid + totalInterest + totalPenalties,
    profit
  };
}

// ── Share Profit Allocation ─────────────────────────────────────────────────

async function calculateShareProfitAllocation(distributionPeriod, periodStart, periodEnd, createdById, tx = prisma) {
  const config = await tx.loanConfiguration.findFirst();
  const profitResult = await calculateTotalPortfolioProfit(periodStart, periodEnd, tx);
  const totalProfit = profitResult.profit;

  const totalSharesResult = await tx.memberShare.aggregate({
    _sum: { number_of_shares: true }
  });
  const totalShares = totalSharesResult._sum.number_of_shares || 0;

  if (totalShares <= 0) {
    throw new Error('No member shares found. Please set up member shares before distributing profit.');
  }

  const allocatedAmount = (totalProfit * Number(config.share_profit_allocation_percent)) / 100;
  const memberShares = await tx.memberShare.findMany({});

  const distributions = memberShares.map(ms => {
    const sharePercent = ms.number_of_shares / totalShares;
    const individualProfit = Math.round(allocatedAmount * sharePercent * 100) / 100;
    return {
      member_id: ms.member_id,
      number_of_shares: ms.number_of_shares,
      share_value: Number(ms.share_value),
      total_shares: totalShares,
      share_percent: sharePercent,
      individual_profit: individualProfit,
      distribution_period: distributionPeriod
    };
  });

  const distribution = await tx.shareProfitDistribution.create({
    data: {
      distribution_period: distributionPeriod,
      period_start: new Date(periodStart),
      period_end: new Date(periodEnd),
      total_profit: totalProfit,
      allocated_percent: Number(config.share_profit_allocation_percent),
      created_by_id: createdById
    }
  });

  for (const d of distributions) {
    await tx.memberShare.update({
      where: { member_id: d.member_id },
      data: {
        total_profit: { increment: d.individual_profit },
        last_distribution_at: new Date(periodEnd)
      }
    });
  }

  return {
    totalProfit,
    allocatedPercent: Number(config.share_profit_allocation_percent),
    distributions,
    distributionId: distribution.id
  };
}

async function calculateTotalPortfolioProfit(startDate, endDate, tx = prisma) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      totalPrincipalPaid: 0,
      totalInterest: 0,
      totalPenalties: 0,
      profit: 0
    };
  }

  const loans = await tx.loan.findMany({
    where: {
      status: { in: ['disbursed', 'completed', 'overdue'] },
      created_at: { gte: start, lte: end }
    }
  }).catch(() => []);

  let totalInterest = 0;
  let totalPenalties = 0;
  let totalPrincipalPaid = 0;

  for (const loan of loans) {
    const schedule = await tx.loanRepaymentSchedule.findMany({
      where: { loan_id: loan.id }
    });
    totalPrincipalPaid += schedule.reduce((sum, s) => sum + (Number(s.paid_amount) || 0), 0);
    totalInterest += schedule.reduce((sum, s) => sum + (Number(s.interest_amount) || 0), 0);
  }

  const config = await getCurrentConfig();
  let profit = 0;
  if (config.profit_formula === 'interest_plus_penalties') {
    profit = totalInterest + totalPenalties;
  } else if (config.profit_formula === 'interest_plus_penalties_plus_principal') {
    profit = totalInterest + totalPenalties + totalPrincipalPaid;
  }

  return {
    totalPrincipalPaid,
    totalInterest,
    totalPenalties,
    profit
  };
}

// ── Emergency Aid Fine Calculation ──────────────────────────────────────────

async function calculateEmergencyAidFine(emergencyAidId, memberId) {
  const config = await getCurrentConfig();
  const emergencyAid = await prisma.emergencyAid.findUnique({
    where: { id: emergencyAidId }
  });
  if (!emergencyAid) return null;

  const payment = await prisma.emergencyAidPayment.findFirst({
    where: {
      emergency_aid_id: emergencyAidId,
      member_id: memberId
    }
  });

  if (!payment || payment.payment_status === 'paid') {
    return { fineAmount: 0, outstandingAmount: 0, totalDue: 0 };
  }

  const outstanding = Number(emergencyAid.amount) - (Number(payment.amount) || 0);
  const fineAmount = (outstanding * Number(config.emergency_aid_fine_rate)) / 100;
  const totalDue = outstanding + fineAmount;

  return {
    fineAmount: Math.round(fineAmount * 100) / 100,
    outstandingAmount: Math.round(outstanding * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100,
    fineRate: Number(config.emergency_aid_fine_rate),
    restrictionRule: config.emergency_aid_restriction_rule
  };
}

// ── Attendance Stats ────────────────────────────────────────────────────────

async function getMemberAttendanceStats(memberId, meetingId = null) {
  const where = { member_id: memberId };
  if (meetingId) {
    where.meeting_id = meetingId;
  }

  const total = await prisma.attendance.count({ where });
  const verified = await prisma.attendance.count({ where: { ...where, verified: true } });

  return {
    totalMeetings: total,
    attended: verified,
    missed: total - verified,
    attendancePercentage: total > 0 ? Math.round((verified / total) * 100) : 0
  };
}

module.exports = {
  getAllowedLoanAmount,
  checkIngobokaEligibility,
  calculateInterest,
  calculateTotalRepayment,
  calculateMonthlyInstallment,
  generateRepaymentSchedule,
  calculateLoanProfit,
  calculateShareProfitAllocation,
  calculateTotalPortfolioProfit,
  calculateEmergencyAidFine,
  getMemberAttendanceStats,
  getCurrentConfig
};