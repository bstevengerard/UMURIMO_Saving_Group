const { getDB } = require('../lib/prisma');
const prisma = getDB();

async function getActiveShareConfiguration(tx = prisma) {
  const now = new Date();
  return tx.shareConfiguration.findFirst({
    where: {
      is_active: true,
      effective_from: { lte: now },
      OR: [
        { effective_to: null },
        { effective_to: { gte: now } }
      ]
    },
    orderBy: { effective_from: 'desc' }
  });
}

async function createShareConfiguration(data, createdById, tx = prisma) {
  return tx.shareConfiguration.create({
    data: {
      min_shares: data.minShares ?? 1,
      max_shares: data.maxShares ?? 5,
      share_value: data.shareValue ?? 1000,
      interest_rate: data.interestRate ?? 3,
      effective_from: new Date(data.effectiveFrom),
      effective_to: data.effectiveTo ? new Date(data.effectiveTo) : null,
      is_active: data.isActive ?? true,
      created_by_id: createdById
    }
  });
}

async function getShareTransactionHistory(memberId, tx = prisma) {
  return tx.memberShareTransaction.findMany({
    where: { member_id: memberId },
    orderBy: { created_at: 'desc' }
  });
}

async function recordShareTransaction(memberId, sharesPurchased, shareValue, periodMonth, periodYear, tx = prisma) {
  const totalAmount = Number(sharesPurchased) * Number(shareValue);
  return tx.memberShareTransaction.create({
    data: {
      member_id: memberId,
      shares_purchased: sharesPurchased,
      share_value: shareValue,
      total_amount: totalAmount,
      period_month: periodMonth,
      period_year: periodYear
    }
  });
}

async function getCurrentShareValue(tx = prisma) {
  const config = await getActiveShareConfiguration(tx);
  return config ? Number(config.share_value) : 1000;
}

async function getShareInterestRate(tx = prisma) {
  const config = await getActiveShareConfiguration(tx);
  return config ? Number(config.interest_rate) : 3;
}

module.exports = {
  getActiveShareConfiguration,
  createShareConfiguration,
  getShareTransactionHistory,
  recordShareTransaction,
  getCurrentShareValue,
  getShareInterestRate
};