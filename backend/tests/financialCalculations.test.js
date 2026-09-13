const assert = require('assert');

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

async function runTests() {
  console.log('\n=== Financial Calculation Tests ===\n');
  let passed = 0;
  let failed = 0;

  function check(name, condition) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      failed++;
    }
  }

  // Test 1: Basic interest calculation
  const interest1 = calculateInterest(100000, 3, 12);
  check('Interest for 100,000 RWF at 3% annual for 12 months = 3,000.00', interest1 === 3000.00);

  // Test 2: Interest for 6 months
  const interest2 = calculateInterest(100000, 3, 6);
  check('Interest for 100,000 RWF at 3% annual for 6 months = 1,500.00', interest2 === 1500.00);

  // Test 3: Total repayment
  const total1 = calculateTotalRepayment(100000, 3, 12);
  check('Total repayment for 100,000 RWF at 3% for 12 months = 103,000.00', total1 === 103000.00);

  // Test 4: Monthly installment
  const monthly1 = calculateMonthlyInstallment(103000, 12);
  check('Monthly installment for 103,000 over 12 months = 8,583.33', monthly1 === 8583.33);

  // Test 5: Zero principal returns zero interest
  const interestZero = calculateInterest(0, 3, 12);
  check('Zero principal returns zero interest', interestZero === 0);

  // Test 6: Negative principal returns zero
  const interestNeg = calculateInterest(-1000, 3, 12);
  check('Negative principal returns zero interest', interestNeg === 0);

  // Test 7: Zero rate returns zero
  const interestZeroRate = calculateInterest(100000, 0, 12);
  check('Zero rate returns zero interest', interestZeroRate === 0);

  // Test 8: Large amount precision
  const interestLarge = calculateInterest(5000000, 12, 24);
  const expectedLarge = Math.round((5000000 * 0.12 * 24 / 12) * 100) / 100;
  check('Large amount precision maintained', interestLarge === expectedLarge);

  // Test 9: Rounding consistency
  const interestRound = calculateInterest(33333, 5, 7);
  const totalRound = calculateTotalRepayment(33333, 5, 7);
  const monthlyRound = calculateMonthlyInstallment(totalRound, 7);
  check('Rounding chain is consistent', monthlyRound >= 0 && totalRound >= 33333);

  // Test 10: Verify old buggy formula vs new formula
  const oldFormula = (100000 * 3 * 12) / 100; // = 36000 (WRONG - 12x too high)
  const newFormula = calculateInterest(100000, 3, 12); // = 3000 (CORRECT)
  check('New formula produces 1/12th of old buggy formula', newFormula === oldFormula / 12);

  // Test 11: Repayment schedule consistency check
  const principal = 100000;
  const rate = 3;
  const term = 12;
  const totalInterest = calculateInterest(principal, rate, term);
  const totalRepayment = calculateTotalRepayment(principal, rate, term);
  const monthlyPayment = calculateMonthlyInstallment(totalRepayment, term);
  const totalPaid = monthlyPayment * term;
  check(`Schedule sums close to total (${totalPaid} vs ${totalRepayment})`, Math.abs(totalPaid - totalRepayment) < 1);

  // Test 12: Short term loan
  const interestShort = calculateInterest(50000, 6, 1);
  check('1 month loan interest = 250.00', interestShort === 250.00);

  // Test 13: Long term loan
  const interestLong = calculateInterest(200000, 10, 36);
  check('3 year loan interest calculation is positive', interestLong > 0 && interestLong < 200000);

  // Test 14: Invalid inputs
  const invalid1 = calculateInterest(NaN, 3, 12);
  check('NaN principal returns 0', invalid1 === 0);

  const invalid2 = calculateInterest(100000, NaN, 12);
  check('NaN rate returns 0', invalid2 === 0);

  const invalid3 = calculateInterest(100000, 3, NaN);
  check('NaN term returns 0', invalid3 === 0);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exitCode = 1;
});
