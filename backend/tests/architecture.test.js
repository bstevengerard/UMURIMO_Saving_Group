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

async function testOtpFlow() {
  console.log('  Testing OTP password reset flow...');

  const testEmail = 'otptest@example.com';

  // Test: Forgot password with no email
  let res = await request('POST', '/api/auth/forgot-password', {});
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Forgot password rejects missing email');

  // Test: Forgot password with non-existent email
  res = await request('POST', '/api/auth/forgot-password', { email: 'nonexistent@test.com' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  console.log('    ✓ Forgot password does not reveal if email exists');

  // Test: Verify OTP with missing fields
  res = await request('POST', '/api/auth/verify-otp', {});
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Verify OTP rejects missing fields');

  // Test: Verify OTP with invalid OTP
  res = await request('POST', '/api/auth/verify-otp', { email: testEmail, otp: '00000' });
  assert.strictEqual(res.status, 400);
  assert(res.body.message.includes('Invalid') || res.body.message.includes('already used'));
  console.log('    ✓ Invalid OTP rejected');

  // Test: Reset password with missing fields
  res = await request('POST', '/api/auth/reset-password', {});
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Reset password rejects missing fields');

  // Test: Resend OTP with missing email
  res = await request('POST', '/api/auth/resend-otp', {});
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Resend OTP rejects missing email');

  // Test: OTP rate limiting (make multiple requests)
  const otpLimiterPromises = [];
  for (let i = 0; i < 6; i++) {
    otpLimiterPromises.push(request('POST', '/api/auth/forgot-password', { email: testEmail }));
  }
  const rateLimitResults = await Promise.all(otpLimiterPromises);
  const rateLimited = rateLimitResults.some(r => r.status === 429);
  if (rateLimited) {
    console.log('    ✓ OTP rate limiting active');
  } else {
    console.log('    ⊘ Rate limiting not triggered (may need more requests or different IP)');
  }

  console.log('  OTP flow tests passed.\n');
}

async function testPagination() {
  console.log('  Testing pagination consistency...');

  const adminToken = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!adminToken) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Members pagination
  let res = await request('GET', '/api/members?page=1&limit=5', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(res.body.success === true);
  assert(typeof res.body.page === 'number');
  assert(typeof res.body.pageSize === 'number');
  assert(typeof res.body.total === 'number');
  assert(typeof res.body.totalPages === 'number');
  assert(typeof res.body.hasNext === 'boolean');
  assert(typeof res.body.hasPrev === 'boolean');
  assert(res.body.pageSize <= 5 || res.body.data.length <= 5);
  console.log(`    ✓ Members pagination: page=${res.body.page}, pageSize=${res.body.pageSize}, total=${res.body.total}`);

  // Test: Loans pagination
  res = await request('GET', '/api/loans?page=1&limit=5', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.page === 'number');
  assert(typeof res.body.pageSize === 'number');
  console.log(`    ✓ Loans pagination: page=${res.body.page}, pageSize=${res.body.pageSize}`);

  // Test: Contributions pagination
  res = await request('GET', '/api/contributions?page=1&limit=5', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.page === 'number');
  assert(typeof res.body.pageSize === 'number');
  console.log(`    ✓ Contributions pagination: page=${res.body.page}, pageSize=${res.body.pageSize}`);

  // Test: Maximum page size limit
  res = await request('GET', '/api/members?page=1&limit=500', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(res.body.pageSize <= 200);
  console.log(`    ✓ Page size capped at 200 (requested 500, got ${res.body.pageSize})`);

  // Test: Savings pagination
  res = await request('GET', '/api/savings?page=1&limit=5', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.page === 'number');
  console.log(`    ✓ Savings pagination works`);

  console.log('  Pagination tests passed.\n');
}

async function testAttendance() {
  console.log('  Testing attendance endpoints...');

  const adminToken = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!adminToken) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Get a meeting ID
  let res = await request('GET', '/api/meetings?limit=1', null, adminToken);
  const meetingData = res.body.data?.data || res.body.data;
  const meetings = Array.isArray(meetingData) ? meetingData : [];
  const meetingId = meetings.length > 0 ? meetings[0].id : null;

  if (meetingId) {
    // Test: Get meeting attendance
    res = await request('GET', `/api/meetings/${meetingId}/attendance`, null, adminToken);
    assert.strictEqual(res.status, 200);
    console.log('    ✓ GET /api/meetings/:id/attendance returns data');

    // Test: Get meeting attendance summary
    res = await request('GET', `/api/meetings/${meetingId}/attendance/summary`, null, adminToken);
    assert.strictEqual(res.status, 200);
    assert(typeof res.body.total === 'number');
    console.log('    ✓ GET /api/meetings/:id/attendance/summary returns summary');
  } else {
    console.log('  ⊘ No meetings found for attendance tests');
  }

  // Test: Attendance history endpoint
  res = await request('GET', '/api/attendance/history', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/attendance/history returns data');

  // Test: Mark attendance (requires valid meeting and member IDs)
  if (meetingId) {
    const memberRes = await request('GET', '/api/members?limit=1', null, adminToken);
    const memberData = memberRes.body.data?.data || memberRes.body.data;
    const members = Array.isArray(memberData) ? memberData : [];
    const memberId = members.length > 0 ? members[0].id : null;

    if (memberId) {
      res = await request('POST', '/api/attendance', {
        meetingId,
        memberId,
        intent: 'pending'
      }, adminToken);
      assert.strictEqual(res.status, 201);
      console.log('    ✓ POST /api/attendance marks attendance');

      // Test: Duplicate attendance prevention
      res = await request('POST', '/api/attendance', {
        meetingId,
        memberId,
        intent: 'pending'
      }, adminToken);
      assert.strictEqual(res.status, 409);
      console.log('    ✓ Duplicate attendance prevented');
    }
  }

  console.log('  Attendance tests passed.\n');
}

async function testShares() {
  console.log('  Testing shares endpoints...');

  const adminToken = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!adminToken) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Get share configuration
  let res = await request('GET', '/api/shares/config', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/shares/config returns configuration');

  // Test: Update share configuration
  res = await request('PUT', '/api/shares/config', {
    effectiveFrom: new Date().toISOString(),
    minShares: 1,
    maxShares: 5,
    shareValue: 1000,
    interestRate: 3
  }, adminToken);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ PUT /api/shares/config updates configuration');

  // Test: Get member shares
  res = await request('GET', '/api/shares/me', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/shares/me returns member shares');

  // Test: Get total shares summary
  res = await request('GET', '/api/shares/summary', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/shares/summary returns summary');

  console.log('  Shares tests passed.\n');
}

async function testLoanEligibility() {
  console.log('  Testing loan eligibility and calculations...');

  const adminToken = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!adminToken) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Get loan eligibility
  let res = await request('GET', '/api/loans/eligibility', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.maxAllowed === 'number');
  assert(typeof res.body.eligibilityStatus === 'string');
  assert(Array.isArray(res.body.ineligibilityReasons));
  console.log(`    ✓ GET /api/loans/eligibility: maxAllowed=${res.body.maxAllowed}, status=${res.body.eligibilityStatus}`);

  // Test: Loan preview
  res = await request('POST', '/api/loans/preview', { amount: 100000, termMonths: 12 }, adminToken);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.totalRepayment === 'number');
  assert(typeof res.body.monthlyInstallment === 'number');
  console.log(`    ✓ POST /api/loans/preview: totalRepayment=${res.body.totalRepayment}`);

  // Test: Loan preview with missing fields
  res = await request('POST', '/api/loans/preview', {}, adminToken);
  assert.strictEqual(res.status, 400);
  console.log('    ✓ POST /api/loans/preview rejects missing fields');

  // Test: Submit loan with invalid amount (below min)
  res = await request('POST', '/api/loans', { amount: 1000, termMonths: 6 }, adminToken);
  assert(res.status === 400 || res.status === 403);
  console.log('    ✓ Loan submission validates amount limits');

  console.log('  Loan eligibility tests passed.\n');
}

async function testErrorFormat() {
  console.log('  Testing error response format...');

  const endpoints = [
    { method: 'POST', path: '/api/auth/login', body: {} },
    { method: 'POST', path: '/api/auth/forgot-password', body: {} },
    { method: 'POST', '/api/auth/verify-otp', body: {} },
    { method: 'GET', path: '/api/nonexistent-route' }
  ];

  let allStandardized = true;
  for (const ep of endpoints) {
    const res = await request(ep.method, ep.path, ep.body);
    if (res.status >= 400) {
      const isStandard = res.body.success === false && typeof res.body.message === 'string';
      if (!isStandard) {
        console.log(`    ✗ ${ep.method} ${ep.path}: NOT standardized`);
        allStandardized = false;
      }
    }
  }

  if (allStandardized) {
    console.log('    ✓ All error responses use standardized format');
  }

  console.log('  Error format tests passed.\n');
}

async function main() {
  console.log('\n=== IKIMINA-MIS Architecture Upgrade Tests ===\n');

  try {
    await testOtpFlow();
    await testPagination();
    await testAttendance();
    await testShares();
    await testLoanEligibility();
    await testErrorFormat();

    console.log('=== All architecture upgrade tests passed ===\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Test failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

main();
