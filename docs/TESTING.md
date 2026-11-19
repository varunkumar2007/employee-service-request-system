# Verification & Testing Suite

This document outlines the testing strategy, test suites, execution commands, and verified results for the **Employee Service Request System**.

---

## 1. Test Suite Architecture

The system features an automated integration and regression testing suite covering all backend APIs, database relations, role-based scoping, SLA calculations, and distributed concurrency:

```
backend/
├── testPhase2.js           # Auth, JWT, RBAC Guards, Departments & Categories (15 tests)
├── testPhase3.js           # Service Request CRUD, Role Scoping, Audit Trail (16 tests)
├── testPhase4.js           # Ticket Assignment, Transitions, Internal Notes, Reopen (21 tests)
├── testPhase5.js           # Dashboard Analytics, SLA Engine & Deduplication (20 tests)
├── testMultiProcessLock.js # Distributed PostgreSQL Advisory Lock Concurrency (5 tests)
└── testLockWorker.js       # Child worker script for multi-process coordination
```

---

## 2. Test Execution Commands

### Execute Full Backend Regression Suite (Phases 2 – 5)
```powershell
npm --prefix backend test
```
*Runs all 72 regression tests consecutively against the live database.*

### Execute Phase-Specific Suites
```powershell
npm --prefix backend run test:phase2
npm --prefix backend run test:phase3
npm --prefix backend run test:phase4
npm --prefix backend run test:phase5
```

### Execute Multi-Process Distributed Advisory Lock Verification
```powershell
node backend/testMultiProcessLock.js
```

### Execute Frontend Production Build Check
```powershell
npm --prefix frontend run build
```

---

## 3. Verified Test Results

### Phase 2: Authentication & RBAC (15 / 15 Passed)
```
✓ PASS: Employee login succeeds and returns JWT
✓ PASS: Admin login succeeds and role is ADMIN
✓ PASS: Invalid password rejected with HTTP 401
✓ PASS: Missing token rejected with HTTP 401
✓ PASS: Authenticated user gets personal profile from /auth/me
✓ PASS: Registration succeeds and creates EMPLOYEE user
✓ PASS: Duplicate registration rejected with HTTP 409
✓ PASS: Employee can list departments
✓ PASS: Employee creating department rejected with HTTP 403 Forbidden
✓ PASS: Admin creates department successfully
✓ PASS: Admin updates department description
✓ PASS: Employee can list active categories
✓ PASS: Employee creating category rejected with HTTP 403 Forbidden
✓ PASS: Admin creates category with 36 hours SLA
✓ PASS: Admin deactivates category via status endpoint
```

### Phase 3: Service Request CRUD & Role Scoping (16 / 16 Passed)
```
✓ PASS: Employee creates a service request with calculated SLA
✓ PASS: Invalid category ID rejected with HTTP 400
✓ PASS: Employee views their own request by ID
✓ PASS: Second employee rejected with HTTP 403 on other employee ticket
✓ PASS: Employee list scoped strictly to own created tickets
✓ PASS: Employee modifying protected fields rejected with HTTP 403
✓ PASS: Employee updates title/description on pending request
✓ PASS: IT Agent can access unassigned IT ticket in their department
✓ PASS: HR Agent rejected with HTTP 403 when accessing IT ticket
✓ PASS: Admin has global access to view any request
✓ PASS: Audit activities record REQUEST_CREATED with actor and details
✓ PASS: Admin updates priority to URGENT with SLA recalculation
✓ PASS: Audit activities record PRIORITY_CHANGE in chronological order
✓ PASS: Employee soft-delete attempt rejected with HTTP 403
✓ PASS: Admin successfully soft-deletes request
✓ PASS: Soft-deleted request returns HTTP 404 to employee
```

### Phase 4: Workflow, Notes & Notifications (21 / 21 Passed)
```
✓ PASS: Cross-department ticket assignment rejected with HTTP 400
✓ PASS: Ticket assigned to IT Agent and status moved to ASSIGNED
✓ PASS: Invalid status transition ASSIGNED -> CLOSED rejected with HTTP 400
✓ PASS: Status moved to IN_PROGRESS
✓ PASS: Status moved to RESOLVED with resolvedAt timestamp
✓ PASS: Reopen bypass via /status endpoint blocked with HTTP 400
✓ PASS: Reopen bypass via general update endpoint blocked with HTTP 400
✓ PASS: Non-creator Support Agent reopen attempt rejected with HTTP 403
✓ PASS: Resolved ticket reopened by employee and returned to IN_PROGRESS
✓ PASS: Assigned agent receives notification when ticket is reopened
✓ PASS: TICKET_REOPENED recorded in audit history with prior status and new SLA deadline
✓ PASS: Employee posts public comment successfully
✓ PASS: Employee attempting to post internal note rejected with HTTP 403
✓ PASS: Agent creates internal note successfully
✓ PASS: Internal notes strictly hidden from employee in comments list
✓ PASS: Agent can view internal notes in discussion thread
✓ PASS: Employee receives list of in-app notifications
✓ PASS: Unread count endpoint returns badge count
✓ PASS: Cross-user notification modification rejected with HTTP 403
✓ PASS: Owner marks single notification as read
✓ PASS: Owner marks all notifications as read
```

### Phase 5: Analytics & SLA Engine (20 / 20 Passed)
```
✓ PASS: Employee retrieves personal dashboard metrics
✓ PASS: Agent retrieves department-scoped dashboard metrics
✓ PASS: Admin retrieves company-wide dashboard metrics
✓ PASS: Dashboard metrics include status breakdown, overdue count, priorities, and SLA compliance rate
✓ PASS: Employee triggering SLA check rejected with HTTP 403
✓ PASS: Admin triggers SLA check successfully
✓ PASS: Overdue ticket flagged isSlaBreached = true
✓ PASS: SLA_BREACHED activity recorded in ticket audit history
✓ PASS: Assigned agent received SLA Warning notification for <= 20% deadline
✓ PASS: Assigned agent received SLA Breach notification
✓ PASS: Resolved tickets are strictly excluded from SLA alerts
✓ PASS: Second SLA run generates zero duplicate alerts
✓ PASS: Notification count remains unchanged after repeated SLA check
✓ PASS: Only exactly one SLA_BREACHED audit record exists after repeated monitor runs
✓ PASS: REJECTED ticket is excluded from SLA breach marking
✓ PASS: Soft-deleted ticket is excluded from SLA breach marking
✓ PASS: Unassigned ticket SLA warning is routed to active Department Support Agent
✓ PASS: Employee creator is NOT spammed with internal SLA triage warnings
✓ PASS: Reopened ticket receives a new SLA Warning for its current cycle despite having older alerts from past cycle
✓ PASS: Concurrent SLA executions are coordinated cleanly by PG advisory lock without race conditions
```

### Multi-Process Distributed Lock Tests (5 / 5 Passed)
```
✓ PASS: Process 1 successfully acquires the distributed PostgreSQL advisory lock
✓ PASS: Process 2 detects active distributed lock, skips processing tickets, and exits safely
✓ PASS: Distributed lock is immediately available again after previous process finishes
✓ PASS: Transaction-level advisory lock is cleanly released on error/rollback without leaking
✓ PASS: checkSlaDeadlines() in service executes cleanly with connection-safe transaction lock
```

---

## 4. Test Verification Limitations

- **Browser End-to-End Automation:** The automated test suites test the HTTP layer, API payloads, database mutations, and Vite compilation directly. End-to-end browser clicking was verified manually via component contracts rather than automated Cypress/Playwright scripts.
- **Single Host Concurrency:** Multi-process lock tests verify separate Node.js OS processes accessing the same Docker PostgreSQL database on loopback. Cross-datacenter network latency or clustering replication lags were not simulated.
