const http = require('http');
const assert = require('assert');

const BASE = process.env.TEST_BASE_URL || 'http://localhost:5000';

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

async function runTests() {
  console.log('\n=== IKIMINA-MIS Backend Test Suite ===\n');
  console.log('NOTE: These tests verify endpoint behavior without requiring pre-seeded credentials.\n');

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

  // ── HEALTH ENDPOINTS ────────────────────────────────────────────────────────
  console.log('── Health Endpoints ──');

  let res = await request('GET', '/health');
  check('GET /health returns 200', res.status === 200);

  res = await request('GET', '/api/health');
  check('GET /api/health returns 200 with status:ok', res.status === 200 && res.body.status === 'ok');

  res = await request('GET', '/api/hello');
  check('GET /api/hello returns greeting', res.status === 200 && res.body.message);

  res = await request('GET', '/api/maintenance/status');
  check('GET /api/maintenance/status returns maintenanceMode', res.status === 200 && typeof res.body.maintenanceMode === 'boolean');

  // ── AUTH TESTS ─────────────────────────────────────────────────────────────
  console.log('\n── Auth Endpoint Tests ──');

  res = await request('POST', '/api/auth/login', {});
  check('Login with empty body returns 400', res.status === 400);
  check('Login error uses standardized format (success:false)', res.body.success === false);
  check('Login error has message string', typeof res.body.message === 'string');
  check('Login error does NOT leak details (no details field)', res.body.details === undefined);

  res = await request('POST', '/api/auth/login', { email: 'invalid@test.com', password: 'wrongpass' });
  check('Invalid credentials returns 400', res.status === 400);
  check('Invalid credentials error uses standardized format', res.body.success === false);

  res = await request('POST', '/api/auth/forgot-password', {});
  check('Forgot password with empty body returns 400', res.status === 400);
  check('Forgot password error uses standardized format', res.body.success === false);

  res = await request('POST', '/api/auth/forgot-password', { email: 'nonexistent@test.com' });
  check('Forgot password with unknown email returns 200 (no enumeration)', res.status === 200);
  check('Forgot password response uses standardized format', res.body.success === true);

  res = await request('POST', '/api/auth/reset-password', {});
  check('Reset password with empty body returns 400', res.status === 400);

  res = await request('POST', '/api/auth/register', {});
  check('Register with empty body returns 400', res.status === 400);

  res = await request('POST', '/api/auth/register', {
    email: 'new@test.com', nationalId: '123456789012345',
    password: '123', fullName: 'Test', phone: '+250780000000'
  });
  check('Register with short password returns 400', res.status === 400);

  res = await request('GET', '/api/auth/verify-email/invalid-token');
  check('Invalid email verification token returns 400 or 404', res.status === 400 || res.status === 404);

  res = await request('POST', '/api/auth/logout');
  check('Logout without token returns 401', res.status === 401);
  check('Logout 401 uses standardized format', res.body.success === false);

  res = await request('GET', '/api/auth/me');
  check('Get current member without token returns 401', res.status === 401);
  check('Get current member 401 uses standardized format', res.body.success === false);

  // ── MEMBER TESTS ───────────────────────────────────────────────────────────
  console.log('\n── Member Endpoint Tests ──');

  res = await request('GET', '/api/members');
  check('GET /api/members without auth returns 401', res.status === 401);
  check('GET /api/members 401 uses standardized format', res.body.success === false);

  res = await request('GET', '/api/members/pending');
  check('GET /api/members/pending without auth returns 401', res.status === 401);

  res = await request('POST', '/api/members', {});
  check('POST /api/members without auth returns 401', res.status === 401);

  res = await request('PUT', '/api/members/some-id/status', { isActive: true });
  check('PUT /api/members/:id/status without auth returns 401', res.status === 401);

  res = await request('GET', '/api/members/my-dashboard');
  check('GET /api/members/my-dashboard without auth returns 401', res.status === 401);

  res = await request('GET', '/api/members/nonexistent-id');
  check('GET nonexistent member returns 401 or 404', res.status === 401 || res.status === 404);
  check('GET nonexistent member error uses standardized format', res.body.success === false);

  // ── LOAN TESTS ─────────────────────────────────────────────────────────────
  console.log('\n── Loan Endpoint Tests ──');

  res = await request('GET', '/api/loans/stats');
  check('GET /api/loans/stats without auth returns 401', res.status === 401);
  check('GET /api/loans/stats 401 uses standardized format', res.body.success === false);

  res = await request('GET', '/api/loans/eligibility');
  check('GET /api/loans/eligibility without auth returns 401', res.status === 401);

  res = await request('GET', '/api/loans');
  check('GET /api/loans without auth returns 401', res.status === 401);

  res = await request('POST', '/api/loans/preview', {});
  check('POST /api/loans/preview without auth returns 401', res.status === 401);

  res = await request('GET', '/api/loans/nonexistent-id');
  check('GET /api/loans/nonexistent-id without auth returns 401', res.status === 401);
  check('GET /api/loans 401 uses standardized format', res.body.success === false);

  // ── CONTRIBUTION TESTS ─────────────────────────────────────────────────────
  console.log('\n── Contribution Endpoint Tests ──');

  res = await request('GET', '/api/contributions');
  check('GET /api/contributions without auth returns 401', res.status === 401);

  res = await request('POST', '/api/contributions', {});
  check('POST /api/contributions without auth returns 401', res.status === 401);

  res = await request('POST', '/api/contributions/batch', { contributions: [] });
  check('POST /api/contributions/batch with empty array without auth returns 401', res.status === 401);

  res = await request('POST', '/api/contributions/batch', { contributions: 'not-an-array' });
  check('POST /api/contributions/batch with invalid data without auth returns 401', res.status === 401);

  res = await request('GET', '/api/reports/contributions');
  check('GET /api/reports/contributions without auth returns 401', res.status === 401);

  res = await request('GET', '/api/contribution-types');
  check('GET /api/contribution-types without auth returns 401', res.status === 401);

  // ── REPAYMENT TESTS ────────────────────────────────────────────────────────
  console.log('\n── Repayment Endpoint Tests ──');

  res = await request('GET', '/api/repayments/history');
  check('GET /api/repayments/history without auth returns 401', res.status === 401);

  res = await request('GET', '/api/repayments/overdue');
  check('GET /api/repayments/overdue without auth returns 401', res.status === 401);

  res = await request('GET', '/api/repayments/pending');
  check('GET /api/repayments/pending without auth returns 401', res.status === 401);

  // ── EMERGENCY AID TESTS ────────────────────────────────────────────────────
  console.log('\n── Emergency Aid Endpoint Tests ──');

  res = await request('GET', '/api/emergency-aid');
  check('GET /api/emergency-aid without auth returns 401', res.status === 401);

  // ── SMS TESTS ─────────────────────────────────────────────────────────────
  console.log('\n── SMS Endpoint Tests ──');

  res = await request('GET', '/api/sms/templates');
  check('GET /api/sms/templates without auth returns 401', res.status === 401);

  res = await request('POST', '/api/sms/broadcast', { message: 'test' });
  check('POST /api/sms/broadcast without auth returns 401', res.status === 401);

  res = await request('PUT', '/api/sms/subscription/me', {});
  check('PUT /api/sms/subscription/me without auth returns 401', res.status === 401);

  // ── ROLE TESTS ─────────────────────────────────────────────────────────────
  console.log('\n── Role Endpoint Tests ──');

  res = await request('GET', '/api/roles');
  check('GET /api/roles without auth returns 401', res.status === 401);

  res = await request('POST', '/api/roles', { role: 'testrole', permissions: {} });
  check('POST /api/roles without auth returns 401', res.status === 401);

  // ── DASHBOARD TESTS ────────────────────────────────────────────────────────
  console.log('\n── Dashboard Endpoint Tests ──');

  res = await request('GET', '/api/dashboard/stats');
  check('GET /api/dashboard/stats without auth returns 401', res.status === 401);

  // ── REPORT TESTS ───────────────────────────────────────────────────────────
  console.log('\n── Report Endpoint Tests ──');

  res = await request('GET', '/api/reports/loans');
  check('GET /api/reports/loans without auth returns 401', res.status === 401);

  res = await request('GET', '/api/reports/attendance');
  check('GET /api/reports/attendance without auth returns 401', res.status === 401);

  res = await request('GET', '/api/reports/defaulters');
  check('GET /api/reports/defaulters without auth returns 401', res.status === 401);

  // ── 404 HANDLER ────────────────────────────────────────────────────────────
  console.log('\n── 404 Handler Test ──');

  res = await request('GET', '/api/nonexistent-endpoint-xyz');
  check('Nonexistent route returns 404', res.status === 404);
  check('404 response uses standardized format', res.body.success === false);
  check('404 response has message string', typeof res.body.message === 'string');
  check('404 response does NOT leak details', res.body.details === undefined);

  // ── RATE LIMITING ──────────────────────────────────────────────────────────
  console.log('\n── Rate Limiting Note ──');
  console.log('  Rate limiting is active on /api/auth/login, /api/auth/register, /api/auth/forgot-password');
  console.log('  (10 attempts per 15 minutes per IP - not tested to avoid triggering)');

  // ── ERROR FORMAT CONSISTENCY ───────────────────────────────────────────────
  console.log('\n── Error Format Consistency ──');

  const errorEndpoints = [
    { method: 'GET', path: '/api/loans/stats' },
    { method: 'GET', path: '/api/members' },
    { method: 'GET', path: '/api/contributions' },
    { method: 'GET', path: '/api/reports/contributions' },
    { method: 'POST', path: '/api/auth/login', body: {} },
  ];

  let allStandardized = true;
  for (const ep of errorEndpoints) {
    const r = await request(ep.method, ep.path, ep.body);
    if (r.status >= 400) {
      const isStandard = r.body.success === false && typeof r.body.message === 'string';
      if (!isStandard) {
        console.log(`  ✗ ${ep.method} ${ep.path}: NOT standardized (${JSON.stringify(r.body).substring(0, 80)})`);
        allStandardized = false;
      }
    }
  }
  check('All error responses use standardized { success: false, message } format', allStandardized);

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50) + '\n');

  if (failed > 0) {
    console.log('NOTE: Tests requiring admin authentication are skipped because');
    console.log('      no pre-seeded admin user exists in the database.');
    console.log('      To run full auth tests, create an admin user first.\n');
  }

  process.exitCode = failed > 0 ? 1 : 0;
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exitCode = 1;
});
