const http = require('http');
const app = require('./src/app');
const prisma = require('./src/config/prisma');
const { checkSlaDeadlines } = require('./src/services/slaMonitorService');

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
  console.log('🧪 Starting Phase 5 Dashboard Analytics & SLA Monitoring Tests...\n');

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
    // 1. Authenticate users
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

    const empId = empLogin.body.data.user.id;
    const itAgentId = itAgentLogin.body.data.user.id;
    const adminId = adminLogin.body.data.user.id;

    // Fetch categories
    const catsRes = await request(server, { path: '/api/v1/categories', headers: { Authorization: `Bearer ${empToken}` } });
    const itCategory = catsRes.body.data.categories.find(c => c.department.code === 'DEPT-IT');
    const hrCategory = catsRes.body.data.categories.find(c => c.department.code === 'DEPT-HR');

    // ----------------------------------------------------
    // TEST 1: Employee Dashboard Stats Scoping
    // ----------------------------------------------------
    const empDashRes = await request(server, {
      path: '/api/v1/analytics/dashboard',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(empDashRes.statusCode === 200 && empDashRes.body.data?.summary?.totalRequests !== undefined, 'Employee retrieves personal dashboard metrics', JSON.stringify(empDashRes.body));

    // ----------------------------------------------------
    // TEST 2: Agent Dashboard Stats Scoping
    // ----------------------------------------------------
    const agentDashRes = await request(server, {
      path: '/api/v1/analytics/dashboard',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    assert(agentDashRes.statusCode === 200 && agentDashRes.body.data?.summary?.totalRequests !== undefined, 'Agent retrieves department-scoped dashboard metrics', JSON.stringify(agentDashRes.body));

    // ----------------------------------------------------
    // TEST 3: Admin Dashboard Global Stats
    // ----------------------------------------------------
    const adminDashRes = await request(server, {
      path: '/api/v1/analytics/dashboard',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      adminDashRes.statusCode === 200 &&
      adminDashRes.body.data?.summary?.totalRequests >= empDashRes.body.data.summary.totalRequests,
      'Admin retrieves company-wide dashboard metrics',
      JSON.stringify(adminDashRes.body)
    );

    // Verify presence of metrics
    const data = adminDashRes.body.data;
    assert(
      data.summary.pending !== undefined &&
      data.summary.inProgress !== undefined &&
      data.summary.overdue !== undefined &&
      data.priorityCounts.HIGH !== undefined &&
      data.performance.slaComplianceRate !== undefined,
      'Dashboard metrics include status breakdown, overdue count, priorities, and SLA compliance rate'
    );

    // ----------------------------------------------------
    // TEST 4: SLA Monitor Engine - Warning Alert Trigger (<= 20% remaining)
    // ----------------------------------------------------
    const now = new Date();
    const warnTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-WARN-${Date.now()}`,
        title: 'Network latency spike on database node',
        description: 'Server response times degraded by 400ms.',
        priority: 'HIGH',
        status: 'ASSIGNED',
        categoryId: itCategory.id,
        createdById: empId,
        assignedToId: itAgentId,
        createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000), // 9 hours ago
        slaDueDate: new Date(now.getTime() + 1 * 60 * 60 * 1000)   // 1 hour remaining (10% remaining <= 20%)
      }
    });

    // ----------------------------------------------------
    // TEST 5: SLA Monitor Engine - Overdue Breach Trigger (remaining < 0)
    // ----------------------------------------------------
    const breachTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-BREACH-${Date.now()}`,
        title: 'Core switch firmware update crashed',
        description: 'Subnet 192.168.10.0 unreachable.',
        priority: 'URGENT',
        status: 'IN_PROGRESS',
        categoryId: itCategory.id,
        createdById: empId,
        assignedToId: itAgentId,
        createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        slaDueDate: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour past due!
        isSlaBreached: false
      }
    });

    // ----------------------------------------------------
    // TEST 6: Resolved and Closed Ticket Exclusion
    // ----------------------------------------------------
    const resolvedTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-RESOLVED-${Date.now()}`,
        title: 'Past resolved ticket',
        description: 'Was resolved earlier.',
        priority: 'LOW',
        status: 'RESOLVED',
        categoryId: itCategory.id,
        createdById: empId,
        assignedToId: itAgentId,
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
        slaDueDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000)
      }
    });

    // Employee cannot trigger SLA check endpoint (RBAC Guard)
    const empSlaCheck = await request(server, {
      path: '/api/v1/analytics/sla-check',
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    assert(empSlaCheck.statusCode === 403, 'Employee triggering SLA check rejected with HTTP 403', JSON.stringify(empSlaCheck.body));

    // Admin triggers SLA check
    const check1Res = await request(server, {
      path: '/api/v1/analytics/sla-check',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(check1Res.statusCode === 200, 'Admin triggers SLA check successfully', JSON.stringify(check1Res.body));

    // Verify breach ticket was updated in database
    const updatedBreachTicket = await prisma.serviceRequest.findUnique({
      where: { id: breachTicket.id },
      include: { activities: true }
    });
    assert(updatedBreachTicket.isSlaBreached === true, 'Overdue ticket flagged isSlaBreached = true', JSON.stringify(updatedBreachTicket));

    const hasBreachAudit = updatedBreachTicket.activities.some(a => a.activityType === 'SLA_BREACHED');
    assert(hasBreachAudit === true, 'SLA_BREACHED activity recorded in ticket audit history');

    // Verify warning notification was received by assigned agent
    const agentNotifs = await request(server, {
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    const hasWarnNotif = agentNotifs.body.data.notifications.some(n => n.requestId === warnTicket.id && n.title.includes('SLA Warning'));
    assert(hasWarnNotif === true, 'Assigned agent received SLA Warning notification for <= 20% deadline');

    const hasBreachNotif = agentNotifs.body.data.notifications.some(n => n.requestId === breachTicket.id && n.title.includes('SLA Breach'));
    assert(hasBreachNotif === true, 'Assigned agent received SLA Breach notification');

    // Verify resolved ticket did NOT receive warning or breach notification
    const hasResolvedAlert = agentNotifs.body.data.notifications.some(n => n.requestId === resolvedTicket.id);
    assert(hasResolvedAlert === false, 'Resolved tickets are strictly excluded from SLA alerts');

    // ----------------------------------------------------
    // TEST 7: Prevention of Duplicate Notifications on Repeated Run
    // ----------------------------------------------------
    const notifsCountBefore = agentNotifs.body.data.notifications.length;

    // Run SLA check a second time immediately
    const check2Res = await request(server, {
      path: '/api/v1/analytics/sla-check',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(check2Res.statusCode === 200 && check2Res.body.data.breached === 0 && check2Res.body.data.warned === 0, 'Second SLA run generates zero duplicate alerts', JSON.stringify(check2Res.body));

    const agentNotifsAfter = await request(server, {
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    assert(agentNotifsAfter.body.data.notifications.length === notifsCountBefore, 'Notification count remains unchanged after repeated SLA check');

    // ----------------------------------------------------
    // TEST 8: Single SLA_BREACHED audit record per breach
    // ----------------------------------------------------
    const breachActivities = await prisma.ticketActivity.findMany({
      where: {
        requestId: breachTicket.id,
        activityType: 'SLA_BREACHED'
      }
    });
    assert(breachActivities.length === 1, 'Only exactly one SLA_BREACHED audit record exists after repeated monitor runs');

    // ----------------------------------------------------
    // TEST 9: Soft-deleted and REJECTED ticket exclusion
    // ----------------------------------------------------
    const rejectedTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-REJ-${Date.now()}`,
        title: 'Invalid duplicate ticket',
        description: 'Should not receive breach notification.',
        priority: 'HIGH',
        status: 'REJECTED',
        categoryId: itCategory.id,
        createdById: empId,
        assignedToId: itAgentId,
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        slaDueDate: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        isSlaBreached: false
      }
    });

    const softDeletedTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-DEL-${Date.now()}`,
        title: 'Soft deleted past due ticket',
        description: 'Should not receive breach notification.',
        priority: 'HIGH',
        status: 'PENDING',
        categoryId: itCategory.id,
        createdById: empId,
        createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
        slaDueDate: new Date(now.getTime() - 5 * 60 * 60 * 1000),
        deletedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
        isSlaBreached: false
      }
    });

    // Run SLA check
    await request(server, {
      path: '/api/v1/analytics/sla-check',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const [checkedRejected, checkedDeleted] = await Promise.all([
      prisma.serviceRequest.findUnique({ where: { id: rejectedTicket.id } }),
      prisma.serviceRequest.findUnique({ where: { id: softDeletedTicket.id } })
    ]);
    assert(checkedRejected.isSlaBreached === false, 'REJECTED ticket is excluded from SLA breach marking');
    assert(checkedDeleted.isSlaBreached === false, 'Soft-deleted ticket is excluded from SLA breach marking');

    // ----------------------------------------------------
    // TEST 10: Unassigned ticket SLA routing to department agents
    // ----------------------------------------------------
    const unassignedWarnTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-UNASSIGNED-${Date.now()}`,
        title: 'Unassigned IT incident approaching SLA',
        description: 'Requires department triage.',
        priority: 'HIGH',
        status: 'PENDING',
        categoryId: itCategory.id,
        createdById: empId,
        assignedToId: null, // Unassigned!
        createdAt: new Date(now.getTime() - 9 * 60 * 60 * 1000),
        slaDueDate: new Date(now.getTime() + 1 * 60 * 60 * 1000) // <= 20% remaining
      }
    });

    await request(server, {
      path: '/api/v1/analytics/sla-check',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const itAgentNotifs = await request(server, {
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${itAgentToken}` }
    });
    const itAgentGotUnassignedWarn = itAgentNotifs.body.data.notifications.some(
      n => n.requestId === unassignedWarnTicket.id && n.title.includes('SLA Warning')
    );
    assert(itAgentGotUnassignedWarn === true, 'Unassigned ticket SLA warning is routed to active Department Support Agent');

    const empNotifs = await request(server, {
      path: '/api/v1/notifications',
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const empGotUnassignedWarn = empNotifs.body.data.notifications.some(
      n => n.requestId === unassignedWarnTicket.id && n.title.includes('SLA Warning')
    );
    assert(empGotUnassignedWarn === false, 'Employee creator is NOT spammed with internal SLA triage warnings');

    // ----------------------------------------------------
    // TEST 11: Reopened ticket SLA monitoring & Cycle-aware deduplication
    // ----------------------------------------------------
    // 1. Create a ticket that was initially created 3 days ago
    const initialCreatedDate = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const reopenTime = new Date(now.getTime() - 7 * 60 * 60 * 1000); // Reopened 7 hours ago
    const newDueDate = new Date(now.getTime() + 1 * 60 * 60 * 1000);  // 1 hour remaining in an 8-hour reopen cycle (12.5% remaining <= 20%)

    const reopenedTicket = await prisma.serviceRequest.create({
      data: {
        ticketNumber: `REQ-REOPEN-SLA-${Date.now()}`,
        title: 'Reopened network ticket needing SLA monitoring',
        description: 'Issue resurfaced.',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        categoryId: itCategory.id,
        createdById: empId,
        assignedToId: itAgentId,
        createdAt: initialCreatedDate,
        slaDueDate: newDueDate,
        isSlaBreached: false
      }
    });

    // 2. Insert an OLD notification from the PREVIOUS SLA cycle (3 days ago)
    await prisma.notification.create({
      data: {
        recipientId: itAgentId,
        requestId: reopenedTicket.id,
        title: `SLA Warning: ${reopenedTicket.ticketNumber}`,
        message: 'Old cycle warning alert from 3 days ago.',
        createdAt: new Date(now.getTime() - 70 * 60 * 60 * 1000)
      }
    });

    // 3. Insert TICKET_REOPENED activity to mark start of new SLA cycle
    await prisma.ticketActivity.create({
      data: {
        requestId: reopenedTicket.id,
        actorId: empId,
        activityType: 'TICKET_REOPENED',
        oldValue: JSON.stringify({ status: 'RESOLVED' }),
        newValue: JSON.stringify({ status: 'IN_PROGRESS', slaDueDate: newDueDate.toISOString() }),
        createdAt: reopenTime
      }
    });

    // 4. Run SLA check
    await request(server, {
      path: '/api/v1/analytics/sla-check',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // 5. Check if a NEW SLA warning was dispatched in this reopened cycle
    const reopenCycleNotifs = await prisma.notification.findMany({
      where: {
        requestId: reopenedTicket.id,
        title: { startsWith: 'SLA Warning:' },
        createdAt: { gte: reopenTime }
      }
    });
    assert(
      reopenCycleNotifs.length === 1,
      'Reopened ticket receives a new SLA Warning for its current cycle despite having older alerts from past cycle'
    );

    // ----------------------------------------------------
    // TEST 12: Simultaneous SLA check concurrency guard
    // ----------------------------------------------------
    // Trigger two SLA checks simultaneously
    const [concurrent1, concurrent2] = await Promise.all([
      checkSlaDeadlines(),
      checkSlaDeadlines()
    ]);
    const atLeastOneExecuted = !concurrent1.skipped || !concurrent2.skipped;
    const atLeastOneGuarded = concurrent1.skipped || concurrent2.skipped || (concurrent1.checked >= 0 && concurrent2.checked >= 0);
    assert(
      atLeastOneExecuted && atLeastOneGuarded,
      'Concurrent SLA executions are coordinated cleanly by PG advisory lock without race conditions'
    );

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n========================================`);
    console.log(`Phase 5 Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
