# REST API Specification

This document provides complete documentation for the **Employee Service Request API** (Base URL: `http://localhost:5000/api/v1`).

---

## Standard Response Format

All responses follow a consistent JSON envelope structure:

```json
{
  "status": "success" | "error",
  "message": "Optional human-readable description",
  "data": { ... }
}
```

---

## 1. Authentication Endpoints

### 1.1 Register Account
- **Route:** `POST /api/v1/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane.doe@company.local",
    "password": "Password@123",
    "departmentId": "uuid-optional",
    "phone": "+1 555-0199"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "User registered successfully.",
    "data": {
      "user": {
        "id": "uuid",
        "email": "jane.doe@company.local",
        "fullName": "Jane Doe",
        "role": "EMPLOYEE"
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### 1.2 Sign In
- **Route:** `POST /api/v1/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "employee.john@company.local",
    "password": "EmpPass@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "uuid",
        "email": "employee.john@company.local",
        "fullName": "John Doe",
        "role": "EMPLOYEE",
        "department": { "id": "uuid", "name": "IT", "code": "DEPT-IT" }
      },
      "token": "eyJhbGciOi..."
    }
  }
  ```

### 1.3 Get Current User Profile
- **Route:** `GET /api/v1/auth/me`
- **Access:** Authenticated (`Bearer <token>`)
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "uuid",
        "email": "employee.john@company.local",
        "fullName": "John Doe",
        "role": "EMPLOYEE"
      }
    }
  }
  ```

---

## 2. Department & Category Endpoints

### 2.1 List Departments
- **Route:** `GET /api/v1/departments`
- **Access:** Authenticated
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "departments": [
        { "id": "uuid", "name": "Information Technology", "code": "DEPT-IT", "isActive": true }
      ]
    }
  }
  ```

### 2.2 Create Department
- **Route:** `POST /api/v1/departments`
- **Access:** Admin only (`ADMIN`)
- **Request Body:**
  ```json
  {
    "name": "Facilities Management",
    "code": "DEPT-FAC",
    "description": "Building access and physical maintenance"
  }
  ```

### 2.3 List Categories
- **Route:** `GET /api/v1/categories`
- **Access:** Authenticated
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "categories": [
        {
          "id": "uuid",
          "name": "Hardware Issues",
          "defaultSlaHours": 24,
          "isActive": true,
          "department": { "id": "uuid", "name": "Information Technology", "code": "DEPT-IT" }
        }
      ]
    }
  }
  ```

### 2.4 Toggle Category Active Status
- **Route:** `PATCH /api/v1/categories/:id/status`
- **Access:** Admin only (`ADMIN`)
- **Request Body:** `{ "isActive": false }`

---

## 3. Service Request Endpoints

### 3.1 List Service Requests
- **Route:** `GET /api/v1/requests`
- **Access:** Authenticated (Role-scoped data access)
- **Query Parameters:** `page`, `limit`, `status`, `priority`, `categoryId`, `search`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "data": {
      "requests": [
        {
          "id": "uuid",
          "ticketNumber": "REQ-20261112-0001",
          "title": "Dual monitor display flicker",
          "priority": "HIGH",
          "status": "IN_PROGRESS",
          "slaDueDate": "2026-11-13T12:00:00.000Z",
          "isSlaBreached": false,
          "category": { "name": "Hardware Issues", "department": { "name": "IT", "code": "DEPT-IT" } },
          "createdBy": { "fullName": "John Doe", "email": "employee.john@company.local" },
          "assignedTo": { "fullName": "Jane Agent", "email": "agent.it@company.local" }
        }
      ],
      "pagination": { "total": 12, "page": 1, "limit": 10, "totalPages": 2 }
    }
  }
  ```

### 3.2 Create Service Request
- **Route:** `POST /api/v1/requests`
- **Access:** `EMPLOYEE` or `ADMIN`
- **Request Body:**
  ```json
  {
    "title": "Dual monitor display flicker",
    "description": "HDMI port connection unstable",
    "categoryId": "uuid",
    "priority": "HIGH"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Service request created successfully.",
    "data": {
      "request": {
        "id": "uuid",
        "ticketNumber": "REQ-20261112-0002",
        "title": "Dual monitor display flicker",
        "status": "PENDING",
        "slaDueDate": "2026-11-13T04:00:00.000Z"
      }
    }
  }
  ```

### 3.3 Get Request Details
- **Route:** `GET /api/v1/requests/:id`
- **Access:** Authenticated (Enforces ownership / department isolation)
- **Response (200 OK):**
  Includes ticket metadata, requester, assigned agent, SLA timeline, audit activities array, and comments array (internal notes stripped for employees).

### 3.4 Update Request Title / Description
- **Route:** `PATCH /api/v1/requests/:id`
- **Access:** Creator while `PENDING` or Admin
- **Request Body:** `{ "title": "Updated Title", "description": "Updated details" }`

### 3.5 Assign Ticket
- **Route:** `PATCH /api/v1/requests/:id/assign`
- **Access:** Support Agents (within department) or Admin
- **Request Body:** `{ "assignedToId": "uuid-agent-id" }`

### 3.6 Update Ticket Status
- **Route:** `PATCH /api/v1/requests/:id/status`
- **Access:** Authorized Support Agents or Admin
- **Request Body:** `{ "status": "IN_PROGRESS", "comment": "Diagnostic begun" }`

### 3.7 Reopen Ticket
- **Route:** `PATCH /api/v1/requests/:id/reopen`
- **Access:** Ticket Creator or Admin (when status is `RESOLVED` or `CLOSED`)
- **Request Body:** `{ "reason": "Issue resurfaced after restarting" }`

### 3.8 Soft Delete Request
- **Route:** `DELETE /api/v1/requests/:id`
- **Access:** Admin only (`ADMIN`)

---

## 4. Discussion Comments & Internal Notes

### 4.1 Get Ticket Comments
- **Route:** `GET /api/v1/requests/:requestId/comments`
- **Access:** Authenticated (Internal notes strictly stripped for employees)

### 4.2 Post Comment or Internal Note
- **Route:** `POST /api/v1/requests/:requestId/comments`
- **Access:** Authenticated (`isInternal: true` strictly restricted to `SUPPORT_AGENT` and `ADMIN`)
- **Request Body:**
  ```json
  {
    "message": "Realtek dock firmware v1.44 requires flashing.",
    "isInternal": true
  }
  ```

---

## 5. Notification Endpoints

### 5.1 List Notifications
- **Route:** `GET /api/v1/notifications`
- **Access:** Authenticated (Scoped strictly to `req.user.id`)
- **Query Parameters:** `page`, `limit`, `unreadOnly=true`

### 5.2 Get Unread Count
- **Route:** `GET /api/v1/notifications/unread-count`
- **Access:** Authenticated

### 5.3 Mark Single Notification as Read
- **Route:** `PATCH /api/v1/notifications/:id/read`
- **Access:** Authenticated (Recipient ownership enforced)

### 5.4 Mark All Notifications as Read
- **Route:** `PATCH /api/v1/notifications/read-all` *(or alias `/mark-all-read`)*
- **Access:** Authenticated

---

## 6. Analytics & SLA Engine Endpoints

### 6.1 Get Dashboard Statistics
- **Route:** `GET /api/v1/analytics/dashboard`
- **Access:** Authenticated (Role-scoped metrics)

### 6.2 Trigger SLA Deadline Monitoring
- **Route:** `POST /api/v1/analytics/sla-check`
- **Access:** Admin only (`ADMIN`)
