const http = require('http');
const app = require('./src/app');

// Helper to make HTTP requests against the test server
function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch (e) {
          parsed = rawData;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 2 API Verification Tests...\n');

  // Start server on an ephemeral port
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    let employeeToken = null;
    let adminToken = null;
    let createdDeptId = null;
    let createdCatId = null;

    // Test 1: Employee Login
    const empLoginRes = await request(server, { path: '/api/v1/auth/login', method: 'POST' }, {
      email: 'employee.john@company.local',
      password: 'EmpPass@123'
    });
    assert(empLoginRes.statusCode === 200 && empLoginRes.body.data?.token, 'Employee login succeeds and returns JWT', JSON.stringify(empLoginRes.body));
    employeeToken = empLoginRes.body.data?.token;

    // Test 2: Admin Login
    const adminLoginRes = await request(server, { path: '/api/v1/auth/login', method: 'POST' }, {
      email: 'admin@company.local',
      password: 'AdminPass@123'
    });
    assert(adminLoginRes.statusCode === 200 && adminLoginRes.body.data?.user.role === 'ADMIN', 'Admin login succeeds and role is ADMIN', JSON.stringify(adminLoginRes.body));
    adminToken = adminLoginRes.body.data?.token;

    // Test 3: Invalid Credentials
    const badLoginRes = await request(server, { path: '/api/v1/auth/login', method: 'POST' }, {
      email: 'admin@company.local',
      password: 'WrongPassword'
    });
    assert(badLoginRes.statusCode === 401, 'Invalid password rejected with HTTP 401', JSON.stringify(badLoginRes.body));

    // Test 4: Unauthenticated Request to /auth/me
    const unauthRes = await request(server, { path: '/api/v1/auth/me' });
    assert(unauthRes.statusCode === 401, 'Missing token rejected with HTTP 401', JSON.stringify(unauthRes.body));

    // Test 5: Authenticated /auth/me
    const meRes = await request(server, {
      path: '/api/v1/auth/me',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert(meRes.statusCode === 200 && meRes.body.data?.user.email === 'employee.john@company.local', 'Authenticated user gets personal profile from /auth/me', JSON.stringify(meRes.body));

    // Test 6: Registration of new employee
    const randomEmail = `new.user.${Date.now()}@company.local`;
    const regRes = await request(server, { path: '/api/v1/auth/register', method: 'POST' }, {
      email: randomEmail,
      password: 'Password123!',
      fullName: 'New Test Employee'
    });
    assert(regRes.statusCode === 201 && regRes.body.data?.user.role === 'EMPLOYEE', 'Registration succeeds and creates EMPLOYEE user', JSON.stringify(regRes.body));

    // Test 7: Duplicate Registration Rejected
    const dupRegRes = await request(server, { path: '/api/v1/auth/register', method: 'POST' }, {
      email: randomEmail,
      password: 'Password123!',
      fullName: 'Duplicate User'
    });
    assert(dupRegRes.statusCode === 409, 'Duplicate registration rejected with HTTP 409', JSON.stringify(dupRegRes.body));

    // Test 8: Get Departments as Employee
    const deptListRes = await request(server, {
      path: '/api/v1/departments',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert(deptListRes.statusCode === 200 && Array.isArray(deptListRes.body.data?.departments), 'Employee can list departments', JSON.stringify(deptListRes.body));

    // Test 9: Employee Forbidden from Creating Department (RBAC Check)
    const empCreateDeptRes = await request(server, {
      path: '/api/v1/departments',
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` }
    }, {
      name: 'Unauthorized Dept',
      code: 'DEPT-UNAUTH'
    });
    assert(empCreateDeptRes.statusCode === 403, 'Employee creating department rejected with HTTP 403 Forbidden', JSON.stringify(empCreateDeptRes.body));

    // Test 10: Admin Creates Department
    const testDeptCode = `DEPT-TEST-${Date.now().toString().slice(-4)}`;
    const adminCreateDeptRes = await request(server, {
      path: '/api/v1/departments',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: `Legal & Compliance ${Date.now()}`,
      code: testDeptCode,
      description: 'Corporate legal affairs and audit compliance'
    });
    assert(adminCreateDeptRes.statusCode === 201 && adminCreateDeptRes.body.data?.department?.id, 'Admin creates department successfully', JSON.stringify(adminCreateDeptRes.body));
    createdDeptId = adminCreateDeptRes.body.data?.department?.id;

    // Test 11: Admin Updates Department
    const updateDeptRes = await request(server, {
      path: `/api/v1/departments/${createdDeptId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      description: 'Updated description for legal compliance'
    });
    assert(updateDeptRes.statusCode === 200 && updateDeptRes.body.data?.department?.description === 'Updated description for legal compliance', 'Admin updates department description', JSON.stringify(updateDeptRes.body));

    // Test 12: List Categories as Employee
    const catListRes = await request(server, {
      path: '/api/v1/categories',
      headers: { Authorization: `Bearer ${employeeToken}` }
    });
    assert(catListRes.statusCode === 200 && catListRes.body.data?.categories?.length > 0, 'Employee can list active categories', JSON.stringify(catListRes.body));

    // Test 13: Employee Forbidden from Creating Category (RBAC Check)
    const empCreateCatRes = await request(server, {
      path: '/api/v1/categories',
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` }
    }, {
      name: 'Contract Review',
      departmentId: createdDeptId,
      defaultSlaHours: 36
    });
    assert(empCreateCatRes.statusCode === 403, 'Employee creating category rejected with HTTP 403 Forbidden', JSON.stringify(empCreateCatRes.body));

    // Test 14: Admin Creates Category with SLA
    const testCatName = `Contract Review ${Date.now()}`;
    const adminCreateCatRes = await request(server, {
      path: '/api/v1/categories',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: testCatName,
      departmentId: createdDeptId,
      defaultSlaHours: 36
    });
    assert(adminCreateCatRes.statusCode === 201 && adminCreateCatRes.body.data?.category?.defaultSlaHours === 36, 'Admin creates category with 36 hours SLA', JSON.stringify(adminCreateCatRes.body));
    createdCatId = adminCreateCatRes.body.data?.category?.id;

    // Test 15: Admin Toggles Category Status (Deactivate)
    const toggleCatRes = await request(server, {
      path: `/api/v1/categories/${createdCatId}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      isActive: false
    });
    assert(toggleCatRes.statusCode === 200 && toggleCatRes.body.data?.category?.isActive === false, 'Admin deactivates category via status endpoint', JSON.stringify(toggleCatRes.body));

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
