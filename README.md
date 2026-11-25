# 🏢 Employee Service Request System

> **A Full-Stack Enterprise Internal Service Desk & SLA Management Platform**
> Developed with React 19, Vite, Node.js, Express, PostgreSQL, and Prisma ORM.

[![Node.js](https://img.shields.io/badge/Node.js-v24.16.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-v19.2.8-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v8.2.1-purple.svg)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16.15-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-v6.19.3-2D3748.svg)](https://www.prisma.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

---

## 1. Project Overview

The **Employee Service Request System** is an enterprise-grade web application designed for managing internal workplace service requests, technical support tickets, and cross-departmental operations (Information Technology, Human Resources, Facilities).

It provides an end-to-end service desk experience with **real-time SLA tracking**, **role-based data scoping**, **discussion threads with confidential internal notes**, **in-app notifications**, **executive analytics dashboards**, and **distributed PostgreSQL advisory locking** for background automation.

---

## 2. Problem Statement & Objectives

### The Problem
Organizations often suffer from chaotic internal support management:
- Requests submitted across scattered email chains, chat channels, or spreadsheets.
- Zero visibility into SLA deadlines, resulting in neglected high-priority workplace blockers.
- Lack of data isolation between departments, leaking sensitive HR or IT operational context.
- Support staff cannot record internal triage notes without exposing them to employees.

### Core Objectives
1. **Centralize & Automate:** Streamline service ticket submission, priority weighting, and automated SLA calculation.
2. **Strict Multi-Tenant Scoping:** Guarantee employees only see their own tickets, agents only see their department's tickets, and admins maintain global governance.
3. **Confidentiality:** Implement four-layer defense-in-depth protection for internal staff notes.
4. **Proactive SLA Governance:** Deliver real-time SLA countdown timers, automated warning thresholds (at $\le 20\%$ time remaining), and breach detection with distributed lock coordination.
5. **Actionable Analytics:** Provide role-specific dashboards with SLA compliance rates, average resolution times, and category volume metrics.

---

## 3. Key Features

- **Dynamic SLA Engine:**
  - Automated deadline calculation: $\text{SLA Due Date} = \text{Created Date} + (\text{Category Default Hours} \times \text{Priority Multiplier})$.
  - Priority multipliers: `LOW` (1.5x), `MEDIUM` (1.0x), `HIGH` (0.5x), `URGENT` (0.25x).
  - Cycle-aware reopen SLA calculation: $\text{Reopen SLA} = \text{Reopened At} + \max(8\text{h}, 0.5 \times \text{Effective SLA})$.
  - Background monitor runs periodically with **PostgreSQL Transaction-Level Advisory Locks** (`pg_try_advisory_xact_lock`) ensuring zero race conditions across multi-instance clusters.
- **Three-Tier Role Scoping (RBAC):**
  - **Employee:** Creates requests, edits pending requests, adds public comments, reopens resolved tickets, and monitors personal requests.
  - **Support Agent:** Triages department queues, self-assigns tickets, posts confidential internal notes, progresses ticket statuses (`ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`), and tracks department SLA health.
  - **Administrator:** Global system visibility, company-wide analytics, department and category catalog configuration, global ticket reassignment, and soft deletion.
- **Discussion Threads & Confidential Staff Notes:**
  - Threaded conversation stream on every ticket with author badges and timestamps.
  - Support staff can toggle **Internal Staff Notes** (`isInternal: true`) marked with padlock indicators.
  - Employees are strictly prevented from viewing or posting internal notes via API guards and database filters.
- **Dedicated Notification Center:**
  - Live in-app notification bell with unread badge counter.
  - Dedicated notification page with "All" vs. "Unread Only" filters.
  - Single-click "Mark as Read" and "Mark All as Read" actions.
  - Direct ticket links jumping from notifications to ticket details.
- **Executive SaaS Dashboards:**
  - Role-specific KPI metrics, category breakdowns, status progression bars, and recent ticket audit feeds.

---

## 4. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router v7, Context API, Lucide React, Modern CSS3 |
| **Backend** | Node.js v24, Express.js 4, RESTful JSON Architecture |
| **Database & ORM** | PostgreSQL 16 (Dockerized), Prisma ORM 6 |
| **Authentication** | JWT (`jsonwebtoken`), Password Hashing (`bcryptjs` with 10 salt rounds) |
| **Concurrency & Locks** | PostgreSQL 64-bit Transaction-Level Advisory Locks (`pg_try_advisory_xact_lock`) |

---

## 5. System Architecture

The application adopts a decoupled presentation-application-persistence model:

```mermaid
flowchart LR
    Client["React 19 + Vite (Port 5173)\n• Router & Protected Routes\n• AuthContext & NotifContext\n• Role-Scoped Dashboards"]
    Server["Express.js Backend (Port 5001)\n• JWT Auth & RBAC Middleware\n• SLA Monitoring Service\n• Notification Dispatcher"]
    DB[("PostgreSQL 16 (Port 5432)\n• Relational Tables & Indexes\n• PG Advisory Locks\n• Prisma ORM Engine")]

    Client -- "REST API (JSON / Bearer JWT)" --> Server
    Server -- "Prisma Client Pool" --> DB
```

*For detailed architectural sequence diagrams and concurrency design, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 6. Roles & Permissions Matrix

| Capability / Route | Employee (`EMPLOYEE`) | Support Agent (`SUPPORT_AGENT`) | System Admin (`ADMIN`) |
| :--- | :---: | :---: | :---: |
| **Submit Requests** | ✓ Allowed | ✕ Denied | ✓ Allowed |
| **View Request Queue** | Own Created Only | Own Assigned + Dept Unassigned | Global Company-Wide |
| **Edit Pending Request** | Own Request Only | ✕ Denied | ✓ Allowed |
| **Assign Tickets** | ✕ Denied | Dept Scope (Self-Assign) | Global Assignment |
| **Status Progression** | ✕ Denied | Assigned / Dept Queue | Global |
| **Reopen Ticket** | Own Created (Resolved/Closed) | ✕ Denied | ✓ Allowed |
| **Internal Staff Notes** | ✕ Strictly Hidden | ✓ View & Create | ✓ View & Create |
| **Manage Depts & SLA** | ✕ Denied | ✕ Denied | ✓ Create / Edit |
| **Trigger SLA Check** | ✕ Denied | ✕ Denied | ✓ Allowed |

---

## 7. Project Folder Structure

```
employee-service-request-system/
├── backend/
│   ├── prisma/
│   │   ├── migrations/       # Prisma SQL schema migrations
│   │   ├── schema.prisma     # Relational database models and indexes
│   │   └── seed.js           # Idempotent development seed script
│   ├── src/
│   │   ├── config/           # Database connection & Prisma client
│   │   ├── controllers/      # REST API route controllers
│   │   ├── middlewares/      # Auth, RBAC, and error handlers
│   │   ├── routes/           # Express router endpoints
│   │   ├── services/         # SLA monitor & notification services
│   │   ├── utils/            # SLA calculations & state transition matrix
│   │   ├── app.js            # Express application configuration
│   │   └── server.js         # Server entrypoint with SLA cron interval
│   ├── testPhase2.js         # Automated test suite (Auth & RBAC)
│   ├── testPhase3.js         # Automated test suite (CRUD & Scoping)
│   ├── testPhase4.js         # Automated test suite (Workflow & Notes)
│   ├── testPhase5.js         # Automated test suite (Analytics & SLA)
│   ├── testMultiProcessLock.js # Distributed advisory lock test suite
│   ├── .env.example          # Backend environment template
│   └── package.json
│
├── frontend/
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── api/              # Centralized API fetch client
│   │   ├── components/       # Common badges, timers, and layout components
│   │   ├── context/          # AuthContext and NotificationContext
│   │   ├── pages/            # Dashboards, Requests, Auth, Notifications
│   │   ├── App.jsx           # Client router and route guards
│   │   └── index.css         # SaaS dashboard styling
│   ├── .env.example          # Frontend environment template
│   ├── package.json
│   └── vite.config.js
│
├── docs/                     # Technical documentation
│   ├── ARCHITECTURE.md       # Architecture diagrams and request flows
│   ├── DATABASE.md           # Database models, ER diagram, and indexes
│   ├── API.md                # Full REST API endpoint specification
│   ├── SECURITY.md           # Security policies and defense-in-depth model
│   ├── TESTING.md            # Test commands and reported verification logs
│   └── DEMO_GUIDE.md         # Screenshots checklist and 3-5 min demo script
│
├── .gitignore
└── README.md
```

---

## 8. Prerequisites & Installation

### Prerequisites
- **Node.js:** v18+ (tested on Node v24.16.0)
- **npm:** v9+ (tested on npm 11.13.0)
- **Docker Desktop:** Installed and running (for local PostgreSQL container)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd employee-service-request-system
   ```

2. **Install Backend Dependencies:**
   ```bash
   npm --prefix backend install
   ```

3. **Install Frontend Dependencies:**
   ```bash
   npm --prefix frontend install
   ```

---

## 9. Environment Variable Configuration

### Backend Configuration
Create `backend/.env` based on `backend/.env.example`:

```ini
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/employee_service_db?schema=public"
JWT_SECRET="replace-with-a-random-secure-64-character-secret-key"
JWT_EXPIRES_IN="1d"
```

### Frontend Configuration
Create `frontend/.env` based on `frontend/.env.example`:

```ini
VITE_API_BASE_URL=http://localhost:5001/api/v1
```

*(Note: `.env` files are excluded from Git version control via `.gitignore`.)*

---

## 10. Database Setup, Migrations & Seeding

1. **Start PostgreSQL Container:**
   ```bash
   docker run --name service-desk-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=employee_service_db -p 5432:5432 -d postgres:16
   ```

2. **Run Prisma Migrations:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   ```

3. **Seed Development Data:**
   ```bash
   node prisma/seed.js
   ```

---

## 11. Running the Application

### Start Backend Development Server (Port 5001)
```powershell
npm --prefix backend run dev
```

### Start Frontend Development Server (Port 5173)
```powershell
npm --prefix frontend run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 12. Local Demo Accounts (Development Only)

The seed script creates four default demo accounts for testing all system personas:

| Role | Email | Password | Department |
| :--- | :--- | :--- | :--- |
| **Employee** | `employee.john@company.local` | `EmpPass@123` | Information Technology |
| **IT Support Agent** | `agent.it@company.local` | `AgentPass@123` | Information Technology |
| **HR Support Agent** | `agent.hr@company.local` | `AgentPass@123` | Human Resources |
| **System Admin** | `admin@company.local` | `AdminPass@123` | Executive Administration |

*(Note: Fast-fill demo buttons are provided on the login page strictly in development builds via `import.meta.env.DEV`.)*

---

## 13. Testing Instructions & Results

The system has 77 verified automated tests passing with 0 failures across the reported test suites:
```powershell
# Run backend regression tests (Phase 2 to 5)
npm --prefix backend test

# Run multi-process distributed advisory lock test
node backend/testMultiProcessLock.js

# Run frontend production build check
npm --prefix frontend run build
```

Verified Test Summary
Phase 2 (Auth, RBAC, Depts, Categories): 15 Passed
Phase 3 (Service Requests & Scoping): 16 Passed
Phase 4 (Workflow & Notifications): 21 Passed
Phase 5 (Analytics & SLA Concurrency): 20 Passed
Multi-Process Lock Coordination: 5 Passed
Total: 77 Passed, 0 Failed

*For complete test execution logs and individual test descriptions, see [docs/TESTING.md](docs/TESTING.md)

---

## 14. Known Limitations

1. **File Attachments:** Discussion threads and ticket submissions currently support plain text only; binary document/image uploads are planned for the next release.
2. **Advisory Lock Scope:** Distributed locking coordinates across instances sharing the same PostgreSQL cluster. Multi-region deployments with asynchronous cross-region replicas require external coordination (e.g., Redis Redlock).

---

## 15. Future Improvements

- **WebSockets / Server-Sent Events (SSE):** Replace the 30-second polling interval with push-based real-time notification alerts.
- **S3 Attachment Storage:** Enable file uploads with pre-signed AWS S3 or Google Cloud Storage URLs for attaching error screenshots and hardware photos.
- **Email Gateway (SMTP):** Integrate Nodemailer or SendGrid to send out-of-band email notifications when tickets are assigned or breached.
- **Custom SLA Holiday Calendars:** Calculate SLA working hours excluding company holidays and weekends.

---

## 16. Technical Documentation Links

-- **Architecture & Request Flow:** [Architecture](docs/ARCHITECTURE.md)
- **Database Schema & ERD:** [Database](docs/DATABASE.md)
- **API Reference Specification:** [API Reference](docs/API.md)
- **Security & RBAC Policy:** [Security](docs/SECURITY.md)
- **Testing & Verification Suite:** [Testing](docs/TESTING.md)
- **Screenshots & Demonstration Guide:** [Demo Guide](docs/DEMO_GUIDE.md)