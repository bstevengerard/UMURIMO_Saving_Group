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

async function testAuthFlows() {
  console.log('  Testing auth endpoints...');

  // Test: Login with missing fields
  let res = await request('POST', '/api/auth/login', { email: '' });
  assert.strictEqual(res.status, 400, 'Missing email should return 400');
  assert.strictEqual(res.body.success, false, 'Response should indicate failure');
  console.log('    ✓ Login rejects missing email');

  // Test: Login with invalid credentials
  res = await request('POST', '/api/auth/login', { email: 'invalid@test.com', password: 'wrongpass' });
  assert.strictEqual(res.status, 400, 'Invalid credentials should return 400');
  assert.strictEqual(res.body.success, false);
  console.log('    ✓ Login rejects invalid credentials');

  // Test: Forgot password with no email
  res = await request('POST', '/api/auth/forgot-password', {});
  assert.strictEqual(res.status, 400, 'Missing email should return 400');
  console.log('    ✓ Forgot-password rejects missing email');

  // Test: Forgot password with non-existent email (should not leak info)
  res = await request('POST', '/api/auth/forgot-password', { email: 'nonexistent@test.com' });
  assert(res.status === 200, 'Should return 200 to prevent email enumeration');
  assert.strictEqual(res.body.success, true);
  console.log('    ✓ Forgot-password does not reveal if email exists');

  // Test: Reset password with missing fields
  res = await request('POST', '/api/auth/reset-password', {});
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Reset-password rejects missing fields');

  // Test: Register with missing fields
  res = await request('POST', '/api/auth/register', {});
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Register rejects missing fields');

  // Test: Register with short password
  res = await request('POST', '/api/auth/register', {
    email: 'newuser@test.com', nationalId: '123456789', password: '123',
    fullName: 'Test User', phone: '+250780000000'
  });
  assert.strictEqual(res.status, 400);
  console.log('    ✓ Register rejects short password');

  // Test: Token verification with invalid token
  res = await request('GET', '/api/auth/verify-email/invalid-token-here');
  assert(res.status === 400 || res.status === 404, 'Invalid token should return 400 or 404');
  console.log('    ✓ Invalid email verification token rejected');

  // Test: Logout without token
  res = await request('POST', '/api/auth/logout');
  assert.strictEqual(res.status, 401, 'Logout without token should return 401');
  console.log('    ✓ Logout requires authentication');

  // Test: Get current member without token
  res = await request('GET', '/api/auth/me');
  assert.strictEqual(res.status, 401);
  console.log('    ✓ Get current member requires authentication');

  // Test: Health endpoints
  res = await request('GET', '/health');
  assert.strictEqual(res.status, 200);
  console.log('    ✓ Health endpoint accessible');

  res = await request('GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'ok');
  console.log('    ✓ API health endpoint returns ok');

  console.log('  Auth tests passed.\n');
}

async function testMembers() {
  console.log('  Testing member endpoints...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: List all members
  let res = await request('GET', '/api/members', null, token);
  assert.strictEqual(res.status, 200);
  assert(res.body.success === true || Array.isArray(res.body.data), 'Should return members list');
  console.log('    ✓ GET /api/members returns list');

  // Test: Get pending approvals
  res = await request('GET', '/api/members/pending', null, token);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/members/pending returns list');

  // Test: Create member with missing fields
  res = await request('POST', '/api/members', {}, token);
  assert.strictEqual(res.status, 400);
  console.log('    ✓ POST /api/members rejects missing fields');

  // Test: Get nonexistent member
  res = await request('GET', '/api/members/nonexistent-id', null, token);
  assert.strictEqual(res.status, 404);
  console.log('    ✓ GET nonexistent member returns 404');

  // Test: Unauthorized access (member role)
  const memberToken = await getAuthToken('member@test.com', 'member123');
  if (memberToken) {
    res = await request('GET', '/api/members', null, memberToken);
    assert.strictEqual(res.status, 403, 'Non-admin should not list all members');
    console.log('    ✓ Non-admin cannot list all members');
  } else {
    console.log('    ⊘ Skipped member role test (no member token)');
  }

  console.log('  Member tests passed.\n');
}

async function testContributions() {
  console.log('  Testing contribution endpoints...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate\n');
    return;
  }

  // Test: Get contributions list
  let res = await request('GET', '/api/contributions', null, token);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/contributions returns list');

  // Test: Get contributions report
  res = await request('GET', '/api/reports/contributions', null, token);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/reports/contributions returns data');

  // Test: Record contribution with missing fields
  res = await request('POST', '/api/contributions', {}, token);
  assert.strictEqual(res.status, 400);
  console.log('    ✓ POST /api/contributions rejects missing fields');

  // Test: Batch contributions with invalid data
  res = await request('POST', '/api/contributions/batch', { contributions: 'not-an-array' }, token);
  assert.strictEqual(res.status, 400);
  console.log('    ✓ POST /api/contributions/batch rejects invalid data');

  console.log('  Contribution tests passed.\n');
}

async function testLoans() {
  console.log('  Testing loan endpoints...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate\n');
    return;
  }

  // Test: Loan eligibility
  let res = await request('GET', '/api/loans/eligibility', null, token);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/loans/eligibility returns data');

  // Test: Loan stats
  res = await request('GET', '/api/loans/stats', null, token);
  assert.strictEqual(res.status, 200);
  assert(typeof res.body.disbursedCount === 'number', 'Should include loan counts');
  console.log('    ✓ GET /api/loans/stats returns stats');

  // Test: Get loans list
  res = await request('GET', '/api/loans', null, token);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/loans returns list');

  // Test: Loan preview with missing fields
  res = await request('POST', '/api/loans/preview', {}, token);
  assert.strictEqual(res.status, 400);
  console.log('    ✓ POST /api/loans/preview rejects missing fields');

  // Test: Repayment schedule
  res = await request('GET', '/api/repayments/history', null, token);
  assert.strictEqual(res.status, 200);
  console.log('    ✓ GET /api/repayments/history returns data');

  // Test: Overdue installments
  res = await request('GET', '/api/repayments/overdue', null, token);
  assert(res.status === 200 || res.status === 403, 'Should respond to overdue request');
  console.log(`    ✓ GET /api/repayments/overdue responds (status: ${res.status})`);

  console.log('  Loan tests passed.\n');
}

async function testErrorFormat() {
  console.log('  Testing error response format...');

  // All error responses should use { success: false, message: '...' }
  const endpoints = [
    { method: 'GET', path: '/api/nonexistent-route' },
    { method: 'GET', path: '/api/loans/stats' },
    { method: 'POST', path: '/api/auth/login', body: {} },
    { method: 'POST', path: '/api/auth/forgot-password', body: {} },
  ];

  for (const ep of endpoints) {
    const res = await request(ep.method, ep.path, ep.body);
    if (res.status >= 400) {
      assert.strictEqual(res.body.success, false, `${ep.path} error should have success: false`);
      assert(typeof res.body.message === 'string', `${ep.path} error should have message string`);
      assert(res.body.details === undefined, `${ep.path} error should NOT leak details`);
      console.log(`    ✓ ${ep.method} ${ep.path}: success=false, no details leaked`);
    }
  }

  console.log('  Error format tests passed.\n');
}

async function main() {
  console.log('\n=== IKIMINA-MIS Backend Test Suite ===\n');
  console.log('NOTE: These tests assume the server is running at', BASE);
  console.log('      Start the server separately with: npm start\n');

  try {
    await testAuthFlows();
    await testMembers();
    await testContributions();
    await testLoans();
    await testErrorFormat();

    console.log('=== All tests passed ===\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Test failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

main();
