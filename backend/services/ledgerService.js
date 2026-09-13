const { getDB } = require('../lib/prisma');
const { sendSuccess, sendError, handlePrismaError } = require('../utils/errorHandler');

async function postTransaction(entries, description, sourceModule, sourceRecordId, sourceRecordType, actorId, actorRole, tx = prisma) {
  const prisma = getDB();

  if (!Array.isArray(entries) || entries.length < 2) {
    throw new Error('A transaction must have at least two entries');
  }

  const totalDebit = entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
  const totalCredit = entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Transaction is not balanced: debits=${totalDebit}, credits=${totalCredit}`);
  }

  const run = async () => {
    const existingCount = await tx.ledgerEntry.count({
      where: {
        source_module: sourceModule,
        source_record_id: sourceRecordId,
        source_record_type: sourceRecordType,
        status: { not: 'reversed' }
      }
    });

    if (existingCount > 0) {
      return {
        success: true,
        entriesCreated: 0,
        totalDebit,
        totalCredit,
        skipped: true
      };
    }

    const created = await tx.ledgerEntry.createMany({
      data: entries.map(e => ({
        account_id: e.accountId,
        member_id: e.memberId || null,
        loan_id: e.loanId || null,
        installment_id: e.installmentId || null,
        debit: Number(e.debit || 0),
        credit: Number(e.credit || 0),
        description: e.description || description,
        source_module: sourceModule,
        source_record_id: sourceRecordId,
        source_record_type: sourceRecordType,
        status: 'posted',
        posted_by_id: actorId,
      })),
    });

    return {
      success: true,
      entriesCreated: created.count,
      totalDebit,
      totalCredit,
    };
  };

  if (tx !== prisma) {
    return run();
  }

  return prisma.$transaction(run);
}

async function reverseTransaction(ledgerEntryId, actorId, actorRole, reason) {
  const prisma = getDB();

  const original = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerEntryId },
    include: { account: true },
  });

  if (!original) {
    throw new Error('Ledger entry not found');
  }

  if (original.status === 'reversed') {
    throw new Error('Entry is already reversed');
  }

  const reversalEntries = [{
    accountId: original.account_id,
    memberId: original.member_id,
    loanId: original.loan_id,
    installmentId: original.installment_id,
    debit: original.credit,
    credit: original.debit,
    description: `Reversal: ${reason || original.description}`,
  }];

  return prisma.$transaction(async (tx) => {
    const reversal = await tx.ledgerEntry.create({
      data: {
        account_id: original.account_id,
        member_id: original.member_id,
        loan_id: original.loan_id,
        installment_id: original.installment_id,
        debit: Number(original.credit),
        credit: Number(original.debit),
        description: `Reversal: ${reason || original.description}`,
        source_module: original.source_module,
        source_record_id: original.source_record_id,
        source_record_type: original.source_record_type,
        status: 'posted',
        posted_by_id: actorId,
        reversal_of_id: original.id,
      },
    });

    await tx.ledgerEntry.update({
      where: { id: original.id },
      data: { status: 'reversed' },
    });

    await tx.auditLog.create({
      data: {
        actor_id: actorId,
        actor_role: actorRole,
        action: 'reverse_ledger_entry',
        entity_type: 'LedgerEntry',
        entity_id: original.id,
        previous_values: { status: original.status },
        new_values: { status: 'reversed' },
      },
    });

    return reversal;
  });
}

async function getTrialBalance(startDate, endDate) {
  const prisma = getDB();

  const where = {
    status: 'posted',
    ...(startDate && endDate ? { transaction_date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
  };

  const entries = await prisma.ledgerEntry.findMany({
    where,
    include: { account: true },
    orderBy: { account_id: 'asc' },
  });

  const accountMap = new Map();

  for (const entry of entries) {
    if (!accountMap.has(entry.account_id)) {
      accountMap.set(entry.account_id, {
        accountId: entry.account_id,
        accountCode: entry.account.code,
        accountName: entry.account.name,
        accountType: entry.account.account_type,
        category: entry.account.category,
        debitTotal: 0,
        creditTotal: 0,
      });
    }
    const acc = accountMap.get(entry.account_id);
    acc.debitTotal += Number(entry.debit);
    acc.creditTotal += Number(entry.credit);
  }

  const accounts = Array.from(accountMap.values()).map(a => ({
    ...a,
    balance: a.debitTotal - a.creditTotal,
  }));

  const totalDebits = accounts.reduce((s, a) => s + a.debitTotal, 0);
  const totalCredits = accounts.reduce((s, a) => s + a.creditTotal, 0);

  return {
    accounts,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}

async function getAccountTransactions(accountId, startDate, endDate, memberId, loanId) {
  const prisma = getDB();

  const where = {
    account_id: accountId,
    status: { not: 'reversed' },
    ...(startDate && endDate ? { transaction_date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
    ...(memberId ? { member_id: memberId } : {}),
    ...(loanId ? { loan_id: loanId } : {}),
  };

  return prisma.ledgerEntry.findMany({
    where,
    orderBy: { transaction_date: 'desc' },
    include: {
      account: { select: { id: true, code: true, name: true, account_type: true, category: true } },
    },
  });
}

async function getMemberStatement(memberId, startDate, endDate) {
  const prisma = getDB();

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      member_id: memberId,
      status: { not: 'reversed' },
      ...(startDate && endDate ? { transaction_date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
    },
    orderBy: { transaction_date: 'asc' },
    include: {
      account: { select: { id: true, code: true, name: true, account_type: true, category: true } },
    },
  });

  let runningBalance = 0;
  const statement = entries.map(e => {
    const amount = Number(e.debit) - Number(e.credit);
    runningBalance += amount;
    return {
      ...e,
      amount,
      runningBalance,
    };
  });

  return {
    memberId,
    entries: statement,
    closingBalance: runningBalance,
  };
}

async function getLoanLedgerEntries(loanId) {
  const prisma = getDB();

  return prisma.ledgerEntry.findMany({
    where: {
      loan_id: loanId,
      status: { not: 'reversed' },
    },
    orderBy: { transaction_date: 'desc' },
    include: {
      account: { select: { id: true, code: true, name: true, account_type: true, category: true } },
    },
  });
}

async function reconcileLoanBalance(loanId) {
  const prisma = getDB();

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { repayment_schedules: true },
  });

  if (!loan) {
    throw new Error('Loan not found');
  }

  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: {
      loan_id: loanId,
      status: 'posted',
    },
    include: { account: true },
  });

  const ledgerDebit = ledgerEntries.reduce((s, e) => s + Number(e.debit), 0);
  const ledgerCredit = ledgerEntries.reduce((s, e) => s + Number(e.credit), 0);
  const ledgerBalance = ledgerDebit - ledgerCredit;

  const scheduleRemaining = loan.repayment_schedules.reduce((s, sch) => {
    return s + (Number(sch.total_amount) - Number(sch.paid_amount));
  }, 0);

  const ledgerLoanEntries = ledgerEntries.filter(e => {
    const cat = e.account?.category;
    return cat === 'loan_receivables';
  });
  const ledgerLoanDebit = ledgerLoanEntries.reduce((s, e) => s + Number(e.debit), 0);
  const ledgerLoanCredit = ledgerLoanEntries.reduce((s, e) => s + Number(e.credit), 0);
  const ledgerLoanBalance = ledgerLoanDebit - ledgerLoanCredit;

  return {
    loanId,
    loanBalance: Number(loan.balance),
    ledgerLoanBalance,
    scheduleRemaining,
    ledgerDebit,
    ledgerCredit,
    difference: Math.abs(Number(loan.balance) - ledgerLoanBalance),
    isReconciled: Math.abs(Number(loan.balance) - ledgerLoanBalance) < 0.01,
  };
}

async function reconcileContributions(startDate, endDate) {
  const prisma = getDB();

  const contributions = await prisma.contribution.findMany({
    where: {
      payment_status: 'paid',
      ...(startDate && endDate ? { week: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
    },
    select: { amount: true, member_id: true },
  });

  const contributionsTotal = contributions.reduce((s, c) => s + Number(c.amount), 0);

  const contributionsAccount = await prisma.chartOfAccount.findFirst({
    where: { category: 'member_contributions' },
  });

  let ledgerTotal = 0;
  if (contributionsAccount) {
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        account_id: contributionsAccount.id,
        status: 'posted',
        source_module: 'contributions',
        ...(startDate && endDate ? { transaction_date: { gte: new Date(startDate), lte: new Date(endDate) } } : {}),
      },
    });
    ledgerTotal = ledgerEntries.reduce((s, e) => s + Number(e.credit), 0);
  }

  return {
    contributionsTotal,
    ledgerTotal,
    difference: Math.abs(contributionsTotal - ledgerTotal),
    isReconciled: Math.abs(contributionsTotal - ledgerTotal) < 0.01,
    contributionsCount: contributions.length,
  };
}

async function reconcileShareDistributions() {
  const prisma = getDB();

  const distributions = await prisma.shareProfitDistribution.findMany({
    include: { created_by: true },
    orderBy: { distributed_at: 'desc' },
  });

  const totalDistributed = distributions.reduce((s, d) => s + Number(d.total_profit), 0);

  const distributionAccount = await prisma.chartOfAccount.findFirst({
    where: { category: 'share_profit_distribution' },
  });

  let ledgerTotal = 0;
  if (distributionAccount) {
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: {
        account_id: distributionAccount.id,
        status: 'posted',
        source_module: 'share_profit_distribution',
      },
    });
    ledgerTotal = ledgerEntries.reduce((s, e) => s + Number(e.credit), 0);
  }

  return {
    totalDistributed,
    ledgerTotal,
    difference: Math.abs(totalDistributed - ledgerTotal),
    isReconciled: Math.abs(totalDistributed - ledgerTotal) < 0.01,
    distributionsCount: distributions.length,
  };
}

async function findAccountByCategory(category, tx = prisma) {
  return tx.chartOfAccount.findFirst({
    where: { category, is_active: true }
  });
}

async function postContributionLedger(contributionId, memberId, amount, sourceModule, actorId, actorRole, tx = prisma) {
  const cashAccount = await findAccountByCategory('cash_bank', tx);
  const contribAccount = await findAccountByCategory('member_contributions', tx);
  if (!cashAccount || !contribAccount) return null;

  return postTransaction([
    { accountId: cashAccount.id, memberId, debit: Number(amount), description: `Contribution received` },
    { accountId: contribAccount.id, memberId, credit: Number(amount), description: `Member contribution` }
  ], `Contribution ${contributionId}`, sourceModule, contributionId, 'Contribution', actorId, actorRole);
}

async function postSavingsLedger(savingsId, memberId, amount, sourceModule, actorId, actorRole, tx = prisma) {
  const cashAccount = await findAccountByCategory('cash_bank', tx);
  const savingsAccount = await findAccountByCategory('member_savings', tx);
  if (!cashAccount || !savingsAccount) return null;

  return postTransaction([
    { accountId: cashAccount.id, memberId, debit: Number(amount), description: `Savings deposited` },
    { accountId: savingsAccount.id, memberId, credit: Number(amount), description: `Member savings` }
  ], `Savings ${savingsId}`, sourceModule, savingsId, 'Savings', actorId, actorRole);
}

async function postLoanDisbursementLedger(loanId, memberId, amount, sourceModule, actorId, actorRole, tx = prisma) {
  const cashAccount = await findAccountByCategory('cash_bank', tx);
  const receivableAccount = await findAccountByCategory('loan_receivables', tx);
  if (!cashAccount || !receivableAccount) return null;

  return postTransaction([
    { accountId: receivableAccount.id, memberId, loanId, debit: Number(amount), description: `Loan disbursed` },
    { accountId: cashAccount.id, memberId, credit: Number(amount), description: `Loan disbursement cash outflow` }
  ], `Loan disbursement ${loanId}`, sourceModule, loanId, 'Loan', actorId, actorRole);
}

async function postLoanRepaymentLedger(installmentId, memberId, loanId, principalPortion, interestPortion, sourceModule, actorId, actorRole, tx = prisma) {
  const cashAccount = await findAccountByCategory('cash_bank', tx);
  const receivableAccount = await findAccountByCategory('loan_receivables', tx);
  const interestAccount = await findAccountByCategory('interest_income', tx);
  if (!cashAccount || !receivableAccount || !interestAccount) return null;

  const entries = [
    { accountId: cashAccount.id, memberId, loanId, installmentId, debit: Number(principalPortion) + Number(interestPortion), description: `Repayment received` },
    { accountId: receivableAccount.id, memberId, loanId, installmentId, credit: Number(principalPortion), description: `Principal repayment` }
  ];
  if (Number(interestPortion) > 0) {
    entries.push({ accountId: interestAccount.id, memberId, loanId, installmentId, credit: Number(interestPortion), description: `Interest income` });
  }

  return postTransaction(entries, `Repayment ${installmentId}`, sourceModule, installmentId, 'LoanRepaymentSchedule', actorId, actorRole);
}

async function postShareCapitalLedger(memberShareId, memberId, shareValue, numberOfShares, sourceModule, actorId, actorRole, tx = prisma) {
  const cashAccount = await findAccountByCategory('cash_bank', tx);
  const shareCapitalAccount = await findAccountByCategory('share_capital', tx);
  if (!cashAccount || !shareCapitalAccount) return null;

  const totalAmount = Number(shareValue) * Number(numberOfShares);
  return postTransaction([
    { accountId: cashAccount.id, memberId, debit: totalAmount, description: `Share capital deposit` },
    { accountId: shareCapitalAccount.id, memberId, credit: totalAmount, description: `Share capital` }
  ], `Share capital ${memberShareId}`, sourceModule, memberShareId, 'MemberShare', actorId, actorRole);
}

async function postEmergencyAidPaymentLedger(paymentId, memberId, amount, sourceModule, actorId, actorRole, tx = prisma) {
  const cashAccount = await findAccountByCategory('cash_bank', tx);
  const receivableAccount = await findAccountByCategory('emergency_aid_fund', tx);
  if (!cashAccount || !receivableAccount) return null;

  return postTransaction([
    { accountId: cashAccount.id, memberId, debit: Number(amount), description: `Emergency aid payment received` },
    { accountId: receivableAccount.id, memberId, credit: Number(amount), description: `Emergency aid receivable` }
  ], `Emergency aid payment ${paymentId}`, sourceModule, paymentId, 'EmergencyAidPayment', actorId, actorRole);
}

async function postEmergencyAidFineLedger(paymentId, memberId, fineAmount, sourceModule, actorId, actorRole, tx = prisma) {
  const receivableAccount = await findAccountByCategory('emergency_aid_fund', tx);
  const fineIncomeAccount = await findAccountByCategory('fine_income', tx);
  if (!receivableAccount || !fineIncomeAccount) return null;

  return postTransaction([
    { accountId: receivableAccount.id, memberId, debit: Number(fineAmount), description: `Emergency aid fine` },
    { accountId: fineIncomeAccount.id, memberId, credit: Number(fineAmount), description: `Emergency aid fine income` }
  ], `Emergency aid fine ${paymentId}`, sourceModule, paymentId, 'EmergencyAidPayment', actorId, actorRole);
}

module.exports = {
  postTransaction,
  reverseTransaction,
  getTrialBalance,
  getAccountTransactions,
  getMemberStatement,
  getLoanLedgerEntries,
  reconcileLoanBalance,
  reconcileContributions,
  reconcileShareDistributions,
  findAccountByCategory,
  postContributionLedger,
  postSavingsLedger,
  postLoanDisbursementLedger,
  postLoanRepaymentLedger,
  postShareCapitalLedger,
  postEmergencyAidPaymentLedger,
  postEmergencyAidFineLedger,
};
