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

async function testMemberCRUD() {
  console.log('  Testing member CRUD operations...');

  const adminToken = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!adminToken) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Test: Get all members
  let res = await request('GET', '/api/members', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(res.body.success === true || Array.isArray(res.body.data?.data));
  const initialCount = res.body.data?.data ? res.body.data.data.length : (res.body.total || 0);
  console.log(`    ✓ GET /api/members returns ${initialCount} members`);

  // Test: Create member
  const timestamp = Date.now();
  res = await request('POST', '/api/members', {
    email: `testmember${timestamp}@test.com`,
    nationalId: `NAT${timestamp}`,
    password: 'testpass123',
    fullName: `Test Member ${timestamp}`,
    phone: '+250780000000',
    role: 'member'
  }, adminToken);
  assert.strictEqual(res.status, 201);
  assert(res.body.success === true || res.body.data?.email === `testmember${timestamp}@test.com`);
  const newMemberId = res.body.data?.id;
  console.log(`    ✓ POST /api/members creates member (status: ${res.status})`);

  // Test: Get pending approvals
  res = await request('GET', '/api/members/pending', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/members/pending returns ${res.body.data ? res.body.data.length : 0} pending`);

  // Test: Get member by ID
  if (newMemberId) {
    res = await request('GET', `/api/members/${newMemberId}`, null, adminToken);
    assert.strictEqual(res.status, 200);
    console.log(`    ✓ GET /api/members/:id returns member details`);

    // Test: Update member
    res = await request('PUT', `/api/members/${newMemberId}`, {
      fullName: `Updated Test Member ${timestamp}`
    }, adminToken);
    assert.strictEqual(res.status, 200);
    console.log(`    ✓ PUT /api/members/:id updates member`);

    // Test: Update own profile (as the new member - need their token)
    // Since we can't login as the new member without approval, skip
  }

  // Test: Search members
  res = await request('GET', '/api/members?search=Test', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/members?search= works`);

  // Test: Filter by role
  res = await request('GET', '/api/members?role=member', null, adminToken);
  assert.strictEqual(res.status, 200);
  console.log(`    ✓ GET /api/members?role=member works`);

  // Test: Pagination
  res = await request('GET', '/api/members?page=1&limit=5', null, adminToken);
  assert.strictEqual(res.status, 200);
  assert(res.body.limit === 5 || (res.body.data && res.body.data.length <= 5));
  console.log(`    ✓ Pagination works (limit: ${res.body.limit || 'N/A'})`);

  // Test: Member stats endpoint
  res = await request('GET', '/api/members/my-dashboard', null, adminToken);
  if (res.status === 200) {
    console.log(`    ✓ GET /api/members/my-dashboard returns data`);
  }

  // Test: Upload document (requires member ID)
  if (newMemberId) {
    res = await request('POST', `/api/members/${newMemberId}/documents`, { documentType: 'id' }, adminToken);
    assert.strictEqual(res.status, 400, 'Document upload should require multipart or proper setup');
    console.log(`    ✓ Document upload validates input`);
  }

  // Test: Error format consistency
  res = await request('GET', '/api/members/invalid-id', null, adminToken);
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.success, false);
  assert(typeof res.body.message === 'string');
  console.log(`    ✓ Error response format is consistent (404)`);

  console.log('  Member CRUD tests passed.\n');
}

async function testMemberStatusManagement() {
  console.log('  Testing member status management...');

  const adminToken = await getAuthToken('admin@ikimina.rw', 'admin123');
  if (!adminToken) {
    console.log('  ⊘ Skipped - could not authenticate as admin\n');
    return;
  }

  // Get first member for testing
  const res = await request('GET', '/api/members?limit=1', null, adminToken);
  const memberId = res.body.data && res.body.data[0] ? res.body.data[0].id : null;

  if (memberId) {
    // Test: Update member status
    const statusRes = await request('PUT', `/api/members/${memberId}/status`, { isActive: true }, adminToken);
    assert.strictEqual(statusRes.status, 200);
    console.log(`    ✓ PUT /api/members/:id/status works`);

    // Test: Reset password
    const passRes = await request('PUT', `/api/members/${memberId}/reset-password`, { newPassword: 'newpass123' }, adminToken);
    assert.strictEqual(passRes.status, 200);
    console.log(`    ✓ PUT /api/members/:id/reset-password works`);

    // Test: Reset password with short password
    const shortPassRes = await request('PUT', `/api/members/${memberId}/reset-password`, { newPassword: '123' }, adminToken);
    assert.strictEqual(shortPassRes.status, 400);
    console.log(`    ✓ Reset password validates minimum length`);
  } else {
    console.log('  ⊘ No members found for status tests');
  }

  console.log('  Member status tests passed.\n');
}

async function main() {
  console.log('\n=== Member Tests ===\n');

  try {
    await testMemberCRUD();
    await testMemberStatusManagement();
    console.log('=== All member tests passed ===\n');
    process.exitCode = 0;
  } catch (err) {
    console.error('\n✗ Member test failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

main();
