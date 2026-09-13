const { getDB } = require('../lib/prisma');
const prisma = getDB();

async function log(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}]`, ...args);
}

async function run() {
  try {
    log('Starting monthly maintenance job…');

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const overdueResult = await prisma.contribution.updateMany({
      where: {
        payment_status: 'pending',
        week: { lt: currentMonth }
      },
      data: {
        payment_status: 'overdue'
      }
    });
    log(`Contributions: ${overdueResult.count} marked overdue`);

    const completionResult = await prisma.loan.updateMany({
      where: {
        balance: { in: [0, 0.0] },
        status: { not: 'completed' }
      },
      data: {
        status: 'completed'
      }
    });
    log(`Loans: ${completionResult.count} loans marked completed (balance=0)`);

    const today = new Date();
    const escalateResult = await prisma.loanRepaymentSchedule.updateMany({
      where: {
        due_date: { lt: today },
        status: 'pending'
      },
      data: {
        status: 'overdue'
      }
    });
    log(`Repayment schedule: ${escalateResult.count} installments marked overdue`);

    log('Monthly maintenance job complete ✅');
    process.exit(0);
  } catch (err) {
    console.error('[cron] ❌ Error:', err.message);
    process.exit(1);
  }
}

run();
