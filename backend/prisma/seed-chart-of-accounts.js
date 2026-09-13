const { getDB } = require('../lib/prisma');

async function seedChartOfAccounts() {
  const prisma = getDB();

  console.log('Seeding chart of accounts...');

  const existing = await prisma.chartOfAccount.count();
  if (existing > 0) {
    console.log(`Chart of accounts already has ${existing} entries. Skipping seed.`);
    return;
  }

  const accounts = [
    { code: '1000', name: 'Cash/Bank', account_type: 'asset', category: 'cash_bank' },
    { code: '1100', name: 'Member Savings', account_type: 'asset', category: 'member_savings' },
    { code: '1200', name: 'Loan Receivables', account_type: 'asset', category: 'loan_receivables' },
    { code: '1300', name: 'Emergency Aid Receivable', account_type: 'asset', category: 'emergency_aid_fund' },
    { code: '2000', name: 'Member Deposits', account_type: 'liability', category: 'member_deposits' },
    { code: '2100', name: 'Member Contributions', account_type: 'liability', category: 'member_contributions' },
    { code: '3000', name: 'Share Capital', account_type: 'equity', category: 'share_capital' },
    { code: '4000', name: 'Interest Income', account_type: 'revenue', category: 'interest_income' },
    { code: '4100', name: 'Fine/Penalty Income', account_type: 'revenue', category: 'fine_income' },
    { code: '4200', name: 'Share Profit Distribution', account_type: 'revenue', category: 'share_profit_distribution' },
    { code: '5000', name: 'Operating Expenses', account_type: 'expense', category: 'operating_expenses' },
  ];

  await prisma.chartOfAccount.createMany({
    data: accounts.map(a => ({
      ...a,
      is_active: true,
      description: '',
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${accounts.length} chart of accounts.`);
}

seedChartOfAccounts()
  .catch((err) => {
    console.error('Chart of accounts seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await getDB().$disconnect();
  });

module.exports = seedChartOfAccounts;
