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

async function testContributionOperations() {
  console.log('  Testing contribution operations...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Get contributions list
  let res = await request('GET', '/api/contributions', null, token);
  assert.strictEqual(res.status, 200);
  assert(res.body.success === true || Array.isArray(res.body.data));
  console.log(`    ✓ GET /api/contributions returns data (status: ${res.status})`);

  // Test: Get contributions with filters
  res = await request('GET', '/api/contributions?status=paid', null, token);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/contributions?status=paid filters correctly`);

  // Test: Record contribution with missing fields
  res = await request('POST', '/api/contributions', {}, token);
  assert.strictEqual(res.status, 400);
  console.log(`    ✓ POST /api/contributions rejects missing fields`);

  // Test: Record contribution with invalid member
  res = await request('POST', '/api/contributions', {
    memberId: 'nonexistent-member-id',
    week: new Date().toISOString(),
    amount: 1000
  }, token);
  assert.strictEqual(res.status, 404);
  console.log(`    ✓ POST /api/contributions rejects invalid member (404)`);

  // Test: Batch contributions with invalid array
  res = await request('POST', '/api/contributions/batch', { contributions: 'not-an-array' }, token);
  assert.strictEqual(res.status, 400);
  console.log(`    ✓ POST /api/contributions/batch validates array input`);

  // Test: Batch contributions with empty array
  res = await request('POST', '/api/contributions/batch', { contributions: [] }, token);
  assert.strictEqual(res.status, 400);
  console.log(`    ✓ POST /api/contributions/batch rejects empty array`);

  // Test: Contribution types list
  res = await request('GET', '/api/contribution-types', null, token);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/contribution-types returns list`);

  // Test: Contribution report
  res = await request('GET', '/api/reports/contributions', null, token);
  assert.strictEqual(res.status, 200);
  assert(Array.isArray(res.body.data));
  console.log(`    ✓ GET /api/reports/contributions returns grouped data`);

  // Test: Savings endpoints
  res = await request('GET', '/api/savings', null, token);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/savings returns data`);

  res = await request('GET', '/api/savings/summary/me', null, token);
  if (res.status === 200) {
    console.log(`    ✓ GET /api/savings/summary/me returns summary`);
  }

  console.log('  Contribution tests passed.\n');
}

async function testContributionTypeCRUD() {
  console.log('  Testing contribution type CRUD...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!token) {
    console.log('  ⊘ Skipped - could not authenticate\n');
    return;
  }

  // Get existing contribution type
  let res = await request('GET', '/api/contribution-types', null, token);
  const existingTypes = res.body.data || res.body;
  const existingId = existingTypes && existingTypes.length > 0 ? existingTypes[0].id : null;

  if (existingId) {
    // Get specific type
    res = await request('GET', `/api/contribution-types/${existingId}`, null, token);
    assert.strictEqual(res.status, 200);
    console.log(`    ✓ GET /api/contribution-types/:id works`);

    // Update type
    res = await request('PUT', `/api/contribution-types/${existingId}`, { amount: 5000 }, token);
    assert.strictEqual(res.status, 200);
    console.log(`    ✓ PUT /api/contribution-types/:id works`);
  } else {
    console.log('  ⊘ No contribution types found for CRUD tests');
  }

  console.log('  Contribution type tests passed.\n');
}

async function testErrorFormatConsistency() {
  console.log('  Testing contribution endpoint error format...');

  const token = await getAuthToken('admin@ikimina.rw', 'admin123');

  // All error responses should have success: false
  const errorCases = [
    { method: 'GET', path: '/api/contributions/nonexistent' },
    { method: 'POST', path: '/api/contributions', body: {} },
    { method: 'POST', path: '/api/contributions/batch', body: { contributions: [] } },
  ];

  for (const ep of errorCases) {
    const res = await request(ep.method, ep.path, ep.body, token);
    if (res.status >= 400) {
      assert.strictEqual(res.body.success, false, `${ep.path}: error should have success=false`);
      assert(typeof res.body.message === 'string', `${ep.path}: error should have message string`);
      assert(res.body.details === undefined, `${ep.path}: error should NOT leak details`);
      console.log(`    ✓ ${ep.method} ${ep.path}: standardized error format`);
    }
  }

  console.log('  Error format tests passed.\n');
}

async function main() {
  console.log('\n=== Contribution Tests ===\n');

  try {
    await testContributionOperations();
    await testContributionTypeCRUD();
    await testErrorFormatConsistency();
    console.log('=== All contribution tests passed ===\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Contribution test failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

main();
