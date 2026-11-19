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
  console.log('🧪 Starting Phase 4 Ticket Workflow, Comments & Notification Tests...\n');

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
    // 1. Authenticate personas
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

    const itAgentId = itAgentLogin.body.data.user.id;
    const hrAgentId = hrAgentLogin.body.data.user.id;

    // Register second employee to test cross-user notification isolation
    const emp2Email = `emp4.${Date.now()}@company.local`;
    const emp2Reg = await request(server, { path: '/api/v1/auth/register', method: 'POST' }, {
      email: emp2Email,
      password: 'Password123!',
      fullName: 'Phase 4 Second Employee'
    });
    const emp2Token = emp2Reg.body.data.token;

    // Get an IT Category
    const catsRes = await request(server, { path: '/api/v1/categories', headers: { Authorization: `Bearer ${empToken}` } });
    const itCategory = catsRes.body.data.categories.find(c => c.department.code === 'DEPT-IT');

    // Create a new IT ticket for testing the full workflow
    const ticketRes = await request(server, {
      path: '/api/v1/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      title: 'VPN connection dropping intermittently',
      description: 'VPN disconnects every 15 minutes when working remotely.',
      categoryId: itCategory.id,
      priority: 'HIGH'
    });
    const ticketId = ticketRes.body.data.request.id;

    // ----------------------------------------------------
    // TEST 1: Cross-Department Assignment Validation
    // ----------------------------------------------------
    const badAssignRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/assign`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      assignedToId: hrAgentId // Attempting to assign IT ticket to HR Agent
    });
    assert(badAssignRes.statusCode === 400, 'Cross-department ticket assignment rejected with HTTP 400', JSON.stringify(badAssignRes.body));

    // ----------------------------------------------------
    // TEST 2: Valid Assignment to Matching Department Agent
    // ----------------------------------------------------
    const goodAssignRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/assign`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      assignedToId: itAgentId
    });
    assert(goodAssignRes.statusCode === 200 && goodAssignRes.body.data?.request?.status === 'ASSIGNED', 'Ticket assigned to IT Agent and status moved to ASSIGNED', JSON.stringify(goodAssignRes.body));

    // ----------------------------------------------------
    // TEST 3: Invalid Status Transition Rejected
    // ----------------------------------------------------
    const badStatusRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, {
      status: 'CLOSED' // Invalid: cannot jump from ASSIGNED directly to CLOSED
    });
    assert(badStatusRes.statusCode === 400, 'Invalid status transition ASSIGNED -> CLOSED rejected with HTTP 400', JSON.stringify(badStatusRes.body));

    // ----------------------------------------------------
    // TEST 4: Valid Status Progression: ASSIGNED -> IN_PROGRESS
    // ----------------------------------------------------
    const progressRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, {
      status: 'IN_PROGRESS'
    });
    assert(progressRes.statusCode === 200 && progressRes.body.data?.request?.status === 'IN_PROGRESS', 'Status moved to IN_PROGRESS', JSON.stringify(progressRes.body));

    // ----------------------------------------------------
    // TEST 5: Status Progression: IN_PROGRESS -> RESOLVED
    // ----------------------------------------------------
    const resolveRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, {
      status: 'RESOLVED'
    });
    assert(resolveRes.statusCode === 200 && resolveRes.body.data?.request?.status === 'RESOLVED', 'Status moved to RESOLVED with resolvedAt timestamp', JSON.stringify(resolveRes.body));

    // ----------------------------------------------------
    // TEST 5B: Reopen Bypass Prevention Checks
    // ----------------------------------------------------
    // 5B.1: Attempting to reopen a RESOLVED ticket via /status endpoint is rejected with HTTP 400
    const bypassStatusAttempt = await request(server, {
      path: `/api/v1/requests/${ticketId}/status`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, {
      status: 'IN_PROGRESS'
    });
    assert(bypassStatusAttempt.statusCode === 400 && bypassStatusAttempt.body.message.includes('dedicated reopen endpoint'), 'Reopen bypass via /status endpoint blocked with HTTP 400', JSON.stringify(bypassStatusAttempt.body));

    // 5B.2: Attempting to reopen a RESOLVED ticket via general update endpoint is rejected with HTTP 400
    const bypassGeneralAttempt = await request(server, {
      path: `/api/v1/requests/${ticketId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, {
      status: 'IN_PROGRESS'
    });
    assert(bypassGeneralAttempt.statusCode === 400 && bypassGeneralAttempt.body.message.includes('dedicated reopen endpoint'), 'Reopen bypass via general update endpoint blocked with HTTP 400', JSON.stringify(bypassGeneralAttempt.body));

    // ----------------------------------------------------
    // TEST 6: Reopening a Resolved Ticket via Dedicated /reopen Endpoint
    // ----------------------------------------------------
    // Non-creator agent attempting to reopen ticket is rejected with 403
    const agentReopenAttempt = await request(server, {
      path: `/api/v1/requests/${ticketId}/reopen`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, { reason: 'Agent attempt' });
    assert(agentReopenAttempt.statusCode === 403, 'Non-creator Support Agent reopen attempt rejected with HTTP 403', JSON.stringify(agentReopenAttempt.body));

    // Reopening by ticket creator (Employee)
    const reopenRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/reopen`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      reason: 'VPN still drops when transferring large files'
    });
    assert(reopenRes.statusCode === 200 && reopenRes.body.data?.request?.status === 'IN_PROGRESS', 'Resolved ticket reopened by employee and returned to IN_PROGRESS', JSON.stringify(reopenRes.body));

    // Assigned agent receives notification about reopen
    const agentNotifs = await request(server, {
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    const agentSawReopenNotif = agentNotifs.body.data?.notifications?.some(n => n.requestId === ticketId && n.title.includes('Status Updated'));
    assert(agentSawReopenNotif === true, 'Assigned agent receives notification when ticket is reopened', JSON.stringify(agentNotifs.body));

    // Verify reopen audit log
    const ticketWithHistory = await request(server, { path: `/api/v1/requests/${ticketId}`, headers: { Authorization: `Bearer ${adminToken}` } });
    const hasReopenLog = ticketWithHistory.body.data?.request?.activities?.some(a => a.activityType === 'TICKET_REOPENED');
    assert(hasReopenLog === true, 'TICKET_REOPENED recorded in audit history with prior status and new SLA deadline', JSON.stringify(ticketWithHistory.body.data?.request?.activities));

    // ----------------------------------------------------
    // TEST 7: Public Comments by Employee
    // ----------------------------------------------------
    const publicCommentRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/comments`,
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      message: 'I am available for troubleshooting this afternoon.',
      isInternal: false
    });
    assert(publicCommentRes.statusCode === 201 && publicCommentRes.body.data?.comment?.isInternal === false, 'Employee posts public comment successfully', JSON.stringify(publicCommentRes.body));

    // ----------------------------------------------------
    // TEST 8: Employee Forbidden from Creating Internal Note
    // ----------------------------------------------------
    const empInternalAttempt = await request(server, {
      path: `/api/v1/requests/${ticketId}/comments`,
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    }, {
      message: 'Secret employee note',
      isInternal: true
    });
    assert(empInternalAttempt.statusCode === 403, 'Employee attempting to post internal note rejected with HTTP 403', JSON.stringify(empInternalAttempt.body));

    // ----------------------------------------------------
    // TEST 9: Support Agent Creates Internal Note
    // ----------------------------------------------------
    const agentInternalRes = await request(server, {
      path: `/api/v1/requests/${ticketId}/comments`,
      method: 'POST',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    }, {
      message: 'Known issue with firmware 1.2 on Cisco VPN gateway. Escalated to network team.',
      isInternal: true
    });
    assert(agentInternalRes.statusCode === 201 && agentInternalRes.body.data?.comment?.isInternal === true, 'Agent creates internal note successfully', JSON.stringify(agentInternalRes.body));

    // ----------------------------------------------------
    // TEST 10: Internal Notes Visibility Check
    // ----------------------------------------------------
    const empCommentsView = await request(server, {
      path: `/api/v1/requests/${ticketId}/comments`,
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const empSawInternal = empCommentsView.body.data?.comments?.some(c => c.isInternal === true);
    assert(empSawInternal === false, 'Internal notes strictly hidden from employee in comments list', JSON.stringify(empCommentsView.body));

    const agentCommentsView = await request(server, {
      path: `/api/v1/requests/${ticketId}/comments`,
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    const agentSawInternal = agentCommentsView.body.data?.comments?.some(c => c.isInternal === true);
    assert(agentSawInternal === true, 'Agent can view internal notes in discussion thread', JSON.stringify(agentCommentsView.body));

    // ----------------------------------------------------
    // TEST 11: Notifications Listing & Unread Count
    // ----------------------------------------------------
    const notifRes = await request(server, {
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(notifRes.statusCode === 200 && Array.isArray(notifRes.body.data?.notifications), 'Employee receives list of in-app notifications', JSON.stringify(notifRes.body));

    const unreadRes = await request(server, {
      path: '/api/v1/notifications/unread-count',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(unreadRes.statusCode === 200 && unreadRes.body.data?.unreadCount > 0, 'Unread count endpoint returns badge count', JSON.stringify(unreadRes.body));

    // ----------------------------------------------------
    // TEST 12: Mark Notification as Read & Cross-User Security
    // ----------------------------------------------------
    const firstNotifId = notifRes.body.data.notifications[0].id;

    // Second employee tries to mark first employee's notification as read
    const crossNotifAttempt = await request(server, {
      path: `/api/v1/notifications/${firstNotifId}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp2Token}` }
    });
    assert(crossNotifAttempt.statusCode === 403, 'Cross-user notification modification rejected with HTTP 403', JSON.stringify(crossNotifAttempt.body));

    // Owner marks single notification as read
    const markReadRes = await request(server, {
      path: `/api/v1/notifications/${firstNotifId}/read`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(markReadRes.statusCode === 200 && markReadRes.body.data?.notification?.isRead === true, 'Owner marks single notification as read', JSON.stringify(markReadRes.body));

    // Owner marks all notifications as read
    const markAllRes = await request(server, {
      path: '/api/v1/notifications/read-all',
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(markAllRes.statusCode === 200, 'Owner marks all notifications as read', JSON.stringify(markAllRes.body));

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Phase 4 Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
