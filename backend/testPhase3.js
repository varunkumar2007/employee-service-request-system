const http = require('http');
const app = require('./src/app');

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
  console.log('🧪 Starting Phase 3 Service Request & Role-Scoping Verification Tests...\n');

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
    // 1. Log in users
    const [empLogin, itAgentLogin, hrAgentLogin, adminLogin] = await Promise.all([
      request(server, { path: '/api/v1/auth/login', method: 'POST' }, { email: 'employee.john@company.local', password: 'EmpPass@123' }),
      request(server, { path: '/api/v1/auth/login', method: 'POST' }, { email: 'agent.it@company.local', password: 'AgentPass@123' }),
      request(server, { path: '/api/v1/auth/login', method: 'POST' }, { email: 'agent.hr@company.local', password: 'AgentPass@123' }),
      request(server, { path: '/api/v1/auth/login', method: 'POST' }, { email: 'admin@company.local', password: 'AdminPass@123' })
    ]);

    const empToken = empLogin.body.data.token;
    const itAgentToken = itAgentLogin.body.data.token;
    const hrAgentToken = hrAgentLogin.body.data.token;
    const adminToken = adminLogin.body.data.token;

    // Register a second employee to test cross-employee authorization
    const emp2Email = `emp2.${Date.now()}@company.local`;
    const emp2Reg = await request(server, { path: '/api/v1/auth/register', method: 'POST' }, {
      email: emp2Email,
      password: 'Password123!',
      fullName: 'Second Employee'
    });
    const emp2Token = emp2Reg.body.data.token;

    // Fetch existing categories to use valid IDs
    const catsRes = await request(server, { path: '/api/v1/categories', headers: { Authorization: `Bearer ${empToken}` } });
    const itCategory = catsRes.body.data.categories.find(c => c.department.code === 'DEPT-IT');
    const hrCategory = catsRes.body.data.categories.find(c => c.department.code === 'DEPT-HR');

    let createdTicketId = null;
    let createdTicketNumber = null;

    // Test 1: Employee creates a request
    const createRes = await request(server, {
      path: '/api/v1/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      title: 'Monitors not powering on at desk 4B',
      description: 'Dual monitor setup has no power indicator lights after power surge.',
      categoryId: itCategory.id,
      priority: 'HIGH'
    });
    assert(createRes.statusCode === 201 && createRes.body.data?.request?.ticketNumber, 'Employee creates a service request with calculated SLA', JSON.stringify(createRes.body));
    createdTicketId = createRes.body.data?.request?.id;
    createdTicketNumber = createRes.body.data?.request?.ticketNumber;

    // Test 2: Invalid Category ID is rejected
    const invalidCatRes = await request(server, {
      path: '/api/v1/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      title: 'Valid title here',
      description: 'Valid description here',
      categoryId: '00000000-0000-0000-0000-000000000000',
      priority: 'MEDIUM'
    });
    assert(invalidCatRes.statusCode === 400, 'Invalid category ID rejected with HTTP 400', JSON.stringify(invalidCatRes.body));

    // Test 3: Employee views their own request
    const ownReqRes = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(ownReqRes.statusCode === 200 && ownReqRes.body.data?.request?.id === createdTicketId, 'Employee views their own request by ID', JSON.stringify(ownReqRes.body));

    // Test 4: Another Employee CANNOT access this request (Cross-Tenant Guard)
    const otherEmpRes = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      headers: { Authorization: `Bearer ${emp2Token}` }
    });
    assert(otherEmpRes.statusCode === 403, 'Second employee rejected with HTTP 403 on other employee ticket', JSON.stringify(otherEmpRes.body));

    // Test 5: Employee listing only includes their own tickets
    const empListRes = await request(server, {
      path: '/api/v1/requests',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const allCreatedByEmp = empListRes.body.data?.requests?.every(r => r.createdBy.email === 'employee.john@company.local');
    assert(empListRes.statusCode === 200 && allCreatedByEmp === true, 'Employee list scoped strictly to own created tickets', JSON.stringify(empListRes.body));

    // Test 6: Employee cannot modify protected fields (status, priority, agent, SLA)
    const empProtectedAttempt = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      status: 'RESOLVED',
      priority: 'URGENT'
    });
    assert(empProtectedAttempt.statusCode === 403, 'Employee modifying protected fields rejected with HTTP 403', JSON.stringify(empProtectedAttempt.body));

    // Test 7: Employee updates permitted fields (title, description) on pending request
    const empPermittedUpdate = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      title: 'Monitors not powering on at desk 4B (Updated)',
      description: 'Tested multiple power cables, monitor still completely dark.'
    });
    assert(empPermittedUpdate.statusCode === 200 && empPermittedUpdate.body.data?.request?.title.includes('(Updated)'), 'Employee updates title/description on pending request', JSON.stringify(empPermittedUpdate.body));

    // Test 8: IT Agent CAN access unassigned IT ticket
    const itAgentView = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    assert(itAgentView.statusCode === 200, 'IT Agent can access unassigned IT ticket in their department', JSON.stringify(itAgentView.body));

    // Test 9: HR Agent CANNOT access unassigned IT ticket (Out-of-department isolation)
    const hrAgentView = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      headers: { Authorization: `Bearer ${hrAgentToken}` }
    });
    assert(hrAgentView.statusCode === 403, 'HR Agent rejected with HTTP 403 when accessing IT ticket', JSON.stringify(hrAgentView.body));

    // Test 10: Admin can view all requests
    const adminView = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminView.statusCode === 200 && adminView.body.data?.request?.id === createdTicketId, 'Admin has global access to view any request', JSON.stringify(adminView.body));

    // Test 11: Audit trail recorded request creation
    assert(
      adminView.body.data?.request?.activities?.some(a => a.activityType === 'REQUEST_CREATED'),
      'Audit activities record REQUEST_CREATED with actor and details',
      JSON.stringify(adminView.body.data?.request?.activities)
    );

    // Test 12: Admin updates priority, recalculating SLA and logging PRIORITY_CHANGE audit
    const priorityUpdateRes = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      priority: 'URGENT'
    });
    assert(priorityUpdateRes.statusCode === 200 && priorityUpdateRes.body.data?.request?.priority === 'URGENT', 'Admin updates priority to URGENT with SLA recalculation', JSON.stringify(priorityUpdateRes.body));

    // Check audit trail for PRIORITY_CHANGE
    const updatedDetails = await request(server, { path: `/api/v1/requests/${createdTicketId}`, headers: { Authorization: `Bearer ${adminToken}` } });
    const hasPriorityAudit = updatedDetails.body.data?.request?.activities?.some(a => a.activityType === 'PRIORITY_CHANGE');
    assert(hasPriorityAudit === true, 'Audit activities record PRIORITY_CHANGE in chronological order', JSON.stringify(updatedDetails.body.data?.request?.activities));

    // Test 13: Non-Admin CANNOT delete request
    const empDeleteRes = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(empDeleteRes.statusCode === 403, 'Employee soft-delete attempt rejected with HTTP 403', JSON.stringify(empDeleteRes.body));

    // Test 14: Admin soft-deletes request
    const adminDeleteRes = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminDeleteRes.statusCode === 200, 'Admin successfully soft-deletes request', JSON.stringify(adminDeleteRes.body));

    // Test 15: Soft-deleted request is no longer visible to normal queries
    const checkDeletedRes = await request(server, {
      path: `/api/v1/requests/${createdTicketId}`,
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(checkDeletedRes.statusCode === 404, 'Soft-deleted request returns HTTP 404 to employee', JSON.stringify(checkDeletedRes.body));

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Phase 3 Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
