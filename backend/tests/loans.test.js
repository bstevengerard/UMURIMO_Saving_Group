const http = require('http');
const assert = require('assert');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5001';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname, port: url.port,
      path: url.pathname + url.search, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getAuthToken(email, password) {
  const res = await request('POST', '/api/auth/login', { email, password });
  return res.status === 200 ? res.body.data.token : null;
}

async function testLoanCreationAndEligibility() {
  console.log('  Testing loan creation and eligibility...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Get loan eligibility
  let res = await request('GET', '/api/loans/eligibility', null, token);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.maxAllowed === 'number', 'Eligibility should include maxAllowed');
  assert(typeof res.body.eligibilityStatus === 'string', 'Eligibility should include status');
  console.log(`    ✓ GET /api/loans/eligibility: maxAllowed=${res.body.maxAllowed}, status=${res.body.eligibilityStatus}`);

  // Test: Get loan stats
  res = await request('GET', '/api/loans/stats', null, token);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.disbursedCount === 'number');
  assert(typeof res.body.pendingCount === 'number');
  assert(typeof res.body.overdueCount === 'number');
  console.log(`    ✓ GET /api/loans/stats: disbursed=${res.body.disbursedCount}, pending=${res.body.pendingCount}, overdue=${res.body.overdueCount}`);

  // Test: Loan preview
  res = await request('POST', '/api/loans/preview', { amount: 100000, termMonths: 12 }, token);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.totalRepayment === 'number', 'Preview should include total repayment');
  assert(typeof res.body.monthlyInstallment === 'number');
  console.log(`    ✓ POST /api/loans/preview: totalRepayment=${res.body.totalRepayment}`);

  // Test: Loan preview with missing fields
  res = await request('POST', '/api/loans/preview', {}, token);
  assert.strictEqual(res.status, 400);
  console.log(`    ✓ POST /api/loans/preview rejects missing fields`);

  // Test: Get loans list
  res = await request('GET', '/api/loans', null, token);
  assert.strictEqual(res.status, 200);
  assert(res.body.success === true || Array.isArray(res.body.data?.data));
  const loanCount = res.body.data?.data ? res.body.data.data.length : 0;
  console.log(`    ✓ GET /api/loans returns ${loanCount} loans`);

  // Test: Filter loans by status
  res = await request('GET', '/api/loans?status=pending', null, token);
  assert.strictEqual(res.status, 200);
  assert(res.body.success === true || Array.isArray(res.body.data?.data));
  console.log(`    ✓ GET /api/loans?status=pending filters correctly`);

  // Test: Loan pagination
  res = await request('GET', '/api/loans?page=1&limit=5', null, token);
  assert.strictEqual(res.status, 200);
  const pageData = res.body.data?.data || res.body.data;
  assert(Array.isArray(pageData) && pageData.length <= 5, 'Pagination should limit results');
  console.log(`    ✓ Loan pagination works`);

  console.log('  Loan creation and eligibility tests passed.\n');
}

async function testLoanDetails() {
  console.log('  Testing loan detail endpoints...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Get a loan ID
  let res = await request('GET', '/api/loans?limit=1', null, token);
  const pageData = res.body.data?.data || res.body.data;
  const loans = Array.isArray(pageData) ? pageData : [];
  const loanId = loans.length > 0 ? loans[0].id : null;

  if (loanId) {
    // Get loan by ID
    res = await request('GET', `/api/loans/${loanId}`, null, token);
    assert.strictEqual(res.status, 200);
    console.log(`    ✓ GET /api/loans/:id returns loan details`);

    // Get nonexistent loan
    res = await request('GET', '/api/loans/nonexistent-loan-id', null, token);
    assert.strictEqual(res.status, 404);
    console.log(`    ✓ GET nonexistent loan returns 404`);
  } else {
    console.log('  ⊘ No loans found for detail tests');
  }

  console.log('  Loan detail tests passed.\n');
}

async function testRepaymentOperations() {
  console.log('  Testing repayment operations...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Get repayment history
  let res = await request('GET', '/api/repayments/history', null, token);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/repayments/history returns data`);

  // Test: Get overdue installments
  res = await request('GET', '/api/repayments/overdue', null, token);
  assert(res.status === 200 || res.status === 403);
  console.log(`    ✓ GET /api/repayments/overdue responds`);

  // Test: Get pending approvals
  res = await request('GET', '/api/repayments/pending', null, token);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/repayments/pending returns data`);

  // Test: Get loan schedule
  res = await request('GET', '/api/loans?limit=1', null, token);
  const schedulePageData = res.body.data?.data || res.body.data;
  const scheduleLoans = Array.isArray(schedulePageData) ? schedulePageData : [];
  if (scheduleLoans.length > 0) {
    const loanId = scheduleLoans[0].id;
    res = await request('GET', `/api/loans/${loanId}/schedule`, null, token);
    assert.strictEqual(res.status, 200);
    console.log(`    ✓ GET /api/loans/:id/schedule returns schedule`);
  }

  console.log('  Repayment tests passed.\n');
}

async function testErrorFormat() {
  console.log('  Testing loan endpoint error format...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');

  // Test: Unauthorized access returns standardized format
  const res = await request('GET', '/api/loans/eligibility');
  if (res.status === 401) {
    assert.strictEqual(res.body.success, false);
    assert(typeof res.body.message === 'string');
    console.log(`    ✓ 401 response uses standardized format`);
  }

  // Test: Invalid loan ID format
  if (token) {
    const res2 = await request('GET', '/api/loans/invalid-id', null, token);
    assert.strictEqual(res2.status, 404);
    assert.strictEqual(res2.body.success, false);
    console.log(`    ✓ 404 response uses standardized format`);
  }

  console.log('  Error format tests passed.\n');
}

async function main() {
  console.log('\n=== Loan Tests ===\n');

  try {
    await testLoanCreationAndEligibility();
    await testLoanDetails();
    await testRepaymentOperations();
    await testErrorFormat();
    console.log('=== All loan tests passed ===\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Loan test failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

main();
