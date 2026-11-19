# Demonstration & Screenshots Guide

This guide provides a structured 3–5 minute demonstration script and an exact checklist for capturing application screenshots for the **Employee Service Request System**.

---

## 1. Screenshots Checklist & Capture Instructions

To capture authentic screenshots of the actual running application:

1. **Start Backend & Frontend Servers:**
Terminal 1: cd backend && npm run dev (Runs on http://localhost:5001)
   - Terminal 2: `cd frontend && npm run dev` (Runs on `http://localhost:5173`)
2. Use standard browser zoom (100%) in Google Chrome or Microsoft Edge.
3. Recommended capture tool: Windows Snipping Tool (`Win + Shift + S`) or full-window screenshot (`Alt + PrintScreen`).

| # | Screen to Capture | URL | Logged-in User Account | Visual Highlights to Capture |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Login Page** | `http://localhost:5173/login` | None (Logged out) | Clean SaaS card, email/password inputs, and development fast-fill buttons. |
| **2** | **Employee Dashboard** | `http://localhost:5173/dashboard` | `employee.john@company.local` | 4 KPI metric cards (Total, In Progress, Resolved, Overdue), and personal Recent Requests table. |
| **3** | **Create Request Form** | `http://localhost:5173/requests/new` | `employee.john@company.local` | Department dropdown, dynamic category selector, priority selection cards, and real-time Estimated SLA badge. |
| **4** | **Request Listing** | `http://localhost:5173/requests` | `employee.john@company.local` or Agent | Search input, Status filter, Priority filter, Category filter, Status badges, and pagination controls. |
| **5** | **Request Details & Discussion** | `http://localhost:5173/requests/:id` | `employee.john@company.local` | Ticket header, SLA countdown timer, ticket details card, and public comment discussion thread. |
| **6** | **Agent Ticket Details & Internal Notes** | `http://localhost:5173/requests/:id` | `agent.it@company.local` | Yellow-bordered `🔒 INTERNAL NOTE` card in discussion thread and the internal staff note checkbox toggle. |
| **7** | **Admin Dashboard** | `http://localhost:5173/dashboard` | `admin@company.local` | Company-wide KPI metrics, SLA compliance rate (%), Average resolution time, Status distribution progress bars, and Category volume. |
| **8** | **Notification Center** | `http://localhost:5173/notifications` | Any user with alerts | Filter tabs ("All Notifications" vs "Unread Only"), ticket number badges, and "Mark All as Read" button. |
| **9** | **Resolution SLA Tracking section** | `http://localhost:5173/requests/:id` | Any role viewing a resolved ticket | SLA Target Status (Resolved within SLA), Target Deadline, and Resolved At timestamp. |
---

## 2. 3–5 Minute Project Demonstration Script

This walkthrough demonstrates the end-to-end lifecycle of an internal service request across all three system personas.

### Act 1: Employee Submission & Lifecycle (1.5 Minutes)
1. **Navigate to `http://localhost:5173/login`:**
   - Click the **👤 Employee (John)** demo button and click **Sign In**.
   - Point out the clean Employee Dashboard displaying personal request volume and recent tickets.
2. **Submit a New Request:**
   - Click **New Service Request** in the top-right corner.
   - Select **Target Department:** `Information Technology`.
   - Select **Category:** `Hardware & Network`.
   - Click priority **MEDIUM**. Notice the dynamic resolution target recalculates in real-time to **~12 hours SLA** (50% of the 24h default).
   - Enter **Title:** `Laptop Wi-Fi Connectivity Issue`.
   - Enter **Description:** `I am unable to connect my laptop to the office Wi-Fi. Please check and resolve this issue.`
   - Click **Submit Request**.
   - Show the success card displaying the unique ticket code (e.g. `REQ-2026-0031`).
3. **Public Discussion:**
   - Click **View Ticket Details**.
   - Add a public comment: `"Please let me know when this issue is being reviewed."`
   - Notice the public discussion displays the comment chronologically with the author name and role.
4. **Log Out:**
   - Click the red **Logout** button in the header.

---

### Act 2: Support Agent Triage & Confidential Internal Notes (1.5 Minutes)
1. **Log in as IT Agent:**
   - Click **🎧 IT Agent** and sign in (`agent.it@company.local`).
2. **Review Department Queue:**
   - Point out the **Support Queue** dashboard scoped strictly to the IT department (`DEPT-IT`).
   - Click the **Unassigned Queue** tab to locate John's newly submitted Wi-Fi ticket.
3. **Assign & Progress Ticket:**
   - Click the ticket to open details.
   - Click **Assign to Myself** in the top action bar. Notice the status advances to `ASSIGNED` and the audit log records the assignment.
   - Click **Move to IN PROGRESS**.
4. **Add Confidential Internal Note:**
   - In the discussion box, check the **Internal Staff Note (Hide from employee)** checkbox.
   - Notice the input box turns soft yellow with a lock indicator.
   - Type: `"Internal Diagnostic: Dell WD19TB docks have a known MST firmware bug. Flashing firmware v1.44 fixes this."`
   - Click **Post Internal Note**. Show the yellow-accented card marked `🔒 INTERNAL NOTE`.
5. **Resolve the Ticket:**
   - Click **Move to RESOLVED**.
   - Provide resolution summary comment: `"Flashed dock to firmware v1.44. Display link verified stable."`
   - Show that `resolvedAt` timestamp and SLA completion status are recorded.
6. **Log Out:**
   - Click **Logout**.

---

### Act 3: Confidentiality Verification & Reopening Workflow (1 Minute)
1. **Log in as Employee:**
   - Sign in as `employee.john@company.local`.
   - Click the **Notification Bell** in the top header. Notice the unread count badge and the notification: `"Status Updated: REQ-XXXX"`.
   - Click the notification to jump directly into the ticket details.
2. **Verify Confidentiality:**
   - Emphasize to the audience that the IT Agent's internal note is **completely invisible** to the employee. Only the public resolution comment is visible.
3. **Reopen Ticket:**
   - Because the ticket is `RESOLVED`, the **Reopen Request** button is active.
   - Click **Reopen Request**, provide reason: `"Signal dropped once again after waking from sleep."`
   - Confirm reopen. Point out that the ticket returns to `IN_PROGRESS` and a new reopen SLA target is generated while preserving the prior cycle in the audit history.
4. **Log Out.**

---

### Act 4: Executive Admin Oversight & SLA Engine (1 Minute)

1. **Log in as Admin:**
   - Sign in as `admin@company.local`.
   - Point out the **Company-Wide Executive Overview** dashboard:
     - Total Company Requests, SLA Compliance Rate (%), and Average Resolution Time.
     - Status Lifecycle Distribution progress bars.
     - Department and Category Volume breakdowns.

2. **Review Department & SLA Catalog:**
   - Click **Departments & SLA** in the sidebar.
   - Show active departments (`DEPT-IT`, `DEPT-HR`, `DEPT-FAC`) and categories with their default SLA hours.
   - Demonstrate how admins can create new categories and manage existing categories.

3. **Conclude Demo:**
   - Highlight the distributed advisory lock used by the background SLA monitoring system, automated in-app notifications, and role-based access controls.
