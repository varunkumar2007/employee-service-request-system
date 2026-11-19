const prisma = require('../config/prisma');
const { calculateSlaDueDate } = require('../utils/slaCalculator');
const { generateTicketNumber } = require('../utils/ticketCodeGenerator');
const { isValidTransition, VALID_TRANSITIONS, calculateReopenSla } = require('../utils/statusTransitions');
const { notifyStatusChange, notifyAssignment } = require('../services/notificationService');

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REJECTED'];

/**
 * Create a new service request
 * POST /api/v1/requests
 */
async function createRequest(req, res) {
  try {
    const { title, description, categoryId, priority = 'MEDIUM' } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Title is required and must be at least 3 characters long.'
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({
        status: 'error',
        message: 'Description is required and must be at least 5 characters long.'
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        status: 'error',
        message: 'categoryId is required.'
      });
    }

    const normalizedPriority = priority.toUpperCase();
    if (!VALID_PRIORITIES.includes(normalizedPriority)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid priority. Must be one of: [${VALID_PRIORITIES.join(', ')}].`
      });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        department: {
          select: { id: true, name: true, code: true, isActive: true }
        }
      }
    });

    if (!category || !category.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'The selected category does not exist or is inactive.'
      });
    }

    if (!category.department || !category.department.isActive) {
      return res.status(400).json({
        status: 'error',
        message: 'The department associated with this category is inactive.'
      });
    }

    const slaDueDate = calculateSlaDueDate(new Date(), category.defaultSlaHours, normalizedPriority);
    const ticketNumber = await generateTicketNumber(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.serviceRequest.create({
        data: {
          ticketNumber,
          title: title.trim(),
          description: description.trim(),
          priority: normalizedPriority,
          status: 'PENDING',
          categoryId: category.id,
          createdById: req.user.id,
          slaDueDate
        },
        include: {
          category: {
            select: { id: true, name: true, department: { select: { id: true, name: true, code: true } } }
          },
          createdBy: {
            select: { id: true, fullName: true, email: true }
          }
        }
      });

      await tx.ticketActivity.create({
        data: {
          requestId: newRequest.id,
          actorId: req.user.id,
          activityType: 'REQUEST_CREATED',
          newValue: JSON.stringify({
            priority: normalizedPriority,
            title: newRequest.title,
            slaDueDate: slaDueDate.toISOString()
          })
        }
      });

      return newRequest;
    });

    return res.status(201).json({
      status: 'success',
      message: 'Service request created successfully.',
      data: { request: result }
    });
  } catch (error) {
    console.error('Create Request Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create service request.'
    });
  }
}

/**
 * List service requests with pagination, filters, and role-based data scoping
 * GET /api/v1/requests
 */
async function getRequests(req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      categoryId,
      search,
      includeDeleted
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const where = {};

    if (req.user.role === 'ADMIN' && includeDeleted === 'true') {
      // Include deleted records
    } else {
      where.deletedAt = null;
    }

    if (req.user.role === 'EMPLOYEE') {
      where.createdById = req.user.id;
    } else if (req.user.role === 'SUPPORT_AGENT') {
      where.OR = [
        { assignedToId: req.user.id },
        {
          assignedToId: null,
          category: {
            departmentId: req.user.departmentId
          }
        }
      ];
    }

    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (priority && VALID_PRIORITIES.includes(priority.toUpperCase())) {
      where.priority = priority.toUpperCase();
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchTerms = search.trim();
      const searchCondition = [
        { title: { contains: searchTerms, mode: 'insensitive' } },
        { description: { contains: searchTerms, mode: 'insensitive' } },
        { ticketNumber: { contains: searchTerms, mode: 'insensitive' } }
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition }
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const [total, requests] = await Promise.all([
      prisma.serviceRequest.count({ where }),
      prisma.serviceRequest.findMany({
        where,
        skip,
        take: parsedLimit,
        include: {
          category: {
            select: { id: true, name: true, department: { select: { id: true, name: true, code: true } } }
          },
          createdBy: {
            select: { id: true, fullName: true, email: true }
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true }
          },
          _count: {
            select: { comments: true, activities: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    return res.status(200).json({
      status: 'success',
      data: {
        requests,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Get Requests Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve service requests.'
    });
  }
}

/**
 * Get single request details by ID or ticketNumber with strict authorization
 * GET /api/v1/requests/:id
 */
async function getRequestById(req, res) {
  try {
    const { id } = req.params;
    const isTicketCode = id.startsWith('REQ-');
    const whereClause = isTicketCode ? { ticketNumber: id } : { id };

    const request = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: {
        category: {
          include: {
            department: {
              select: { id: true, name: true, code: true }
            }
          }
        },
        createdBy: {
          select: { id: true, fullName: true, email: true }
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true }
        },
        activities: {
          include: {
            actor: { select: { id: true, fullName: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        comments: {
          include: {
            author: { select: { id: true, fullName: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({
        status: 'error',
        message: 'Service request not found.'
      });
    }

    if (request.deletedAt !== null && req.user.role !== 'ADMIN') {
      return res.status(404).json({
        status: 'error',
        message: 'Service request not found.'
      });
    }

    // Role-based authorization guard
    if (req.user.role === 'EMPLOYEE') {
      if (request.createdById !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You are not authorized to view this request.'
        });
      }
      // Hide internal notes from Employee
      request.comments = request.comments.filter(c => !c.isInternal);
    } else if (req.user.role === 'SUPPORT_AGENT') {
      const isAssignedToAgent = request.assignedToId === req.user.id;
      const isUnassignedInDept = request.assignedToId === null && request.category.departmentId === req.user.departmentId;

      if (!isAssignedToAgent && !isUnassignedInDept) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You can only view requests assigned to you or unassigned in your department.'
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      data: { request }
    });
  } catch (error) {
    console.error('Get Request By ID Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve service request details.'
    });
  }
}

/**
 * Update request (General or Employee permitted fields)
 * PATCH /api/v1/requests/:id
 */
async function updateRequest(req, res) {
  try {
    const { id } = req.params;
    const isTicketCode = id.startsWith('REQ-');
    const whereClause = isTicketCode ? { ticketNumber: id } : { id };

    const request = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: {
        category: true
      }
    });

    if (!request || (request.deletedAt !== null && req.user.role !== 'ADMIN')) {
      return res.status(404).json({
        status: 'error',
        message: 'Service request not found.'
      });
    }

    const {
      title,
      description,
      priority,
      status,
      assignedToId,
      slaDueDate,
      ticketNumber,
      categoryId
    } = req.body;

    // EMPLOYEE UPDATE RULES
    if (req.user.role === 'EMPLOYEE') {
      if (request.createdById !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You can only update your own requests.'
        });
      }

      const hasProtectedFields = [
        status,
        assignedToId,
        priority,
        slaDueDate,
        ticketNumber,
        categoryId
      ].some(val => val !== undefined);

      if (hasProtectedFields) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Employees cannot modify protected fields (status, priority, assigned agent, SLA due date, or category).'
        });
      }

      if (request.status !== 'PENDING') {
        return res.status(400).json({
          status: 'error',
          message: `Cannot edit request content while in '${request.status}' status.`
        });
      }

      const updateData = {};
      if (title && title.trim().length >= 3) updateData.title = title.trim();
      if (description && description.trim().length >= 5) updateData.description = description.trim();

      const updated = await prisma.serviceRequest.update({
        where: { id: request.id },
        data: updateData,
        include: {
          category: { select: { name: true } },
          createdBy: { select: { fullName: true } }
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Request updated successfully.',
        data: { request: updated }
      });
    }

    // SUPPORT AGENT & ADMIN UPDATE RULES
    if (req.user.role === 'SUPPORT_AGENT') {
      const isAssigned = request.assignedToId === req.user.id;
      const isUnassignedDept = request.assignedToId === null && request.category.departmentId === req.user.departmentId;

      if (!isAssigned && !isUnassignedDept) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You can only update requests assigned to you or unassigned in your department.'
        });
      }
    }

    const updateData = {};
    const activitiesToCreate = [];

    if (title && title.trim().length >= 3) updateData.title = title.trim();
    if (description && description.trim().length >= 5) updateData.description = description.trim();

    // Priority change
    if (priority && VALID_PRIORITIES.includes(priority.toUpperCase()) && priority.toUpperCase() !== request.priority) {
      const newPriority = priority.toUpperCase();
      const newSlaDueDate = calculateSlaDueDate(request.createdAt, request.category.defaultSlaHours, newPriority);
      updateData.priority = newPriority;
      updateData.slaDueDate = newSlaDueDate;

      activitiesToCreate.push({
        actorId: req.user.id,
        activityType: 'PRIORITY_CHANGE',
        oldValue: JSON.stringify({ priority: request.priority, slaDueDate: request.slaDueDate.toISOString() }),
        newValue: JSON.stringify({ priority: newPriority, slaDueDate: newSlaDueDate.toISOString() })
      });
    }

    // Status change with State Machine verification
    if (status && VALID_STATUSES.includes(status.toUpperCase()) && status.toUpperCase() !== request.status) {
      const newStatus = status.toUpperCase();

      // Guard against reopening bypass
      if (['RESOLVED', 'CLOSED'].includes(request.status) && newStatus === 'IN_PROGRESS') {
        return res.status(400).json({
          status: 'error',
          message: 'Cannot reopen a resolved or closed ticket via the general update endpoint. Reopening must be performed through the dedicated reopen endpoint: PATCH /api/v1/requests/:id/reopen'
        });
      }

      if (!isValidTransition(request.status, newStatus)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status transition: cannot move from '${request.status}' to '${newStatus}'. Allowed: [${VALID_TRANSITIONS[request.status]?.join(', ') || 'None'}].`
        });
      }

      updateData.status = newStatus;
      if (newStatus === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }

      activitiesToCreate.push({
        actorId: req.user.id,
        activityType: 'STATUS_CHANGE',
        oldValue: request.status,
        newValue: newStatus
      });
    }

    // Assignment change with Department validation
    let targetAgent = null;
    if (assignedToId !== undefined && assignedToId !== request.assignedToId) {
      if (assignedToId !== null) {
        targetAgent = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { id: true, fullName: true, role: true, departmentId: true, isActive: true }
        });

        if (!targetAgent || !targetAgent.isActive || !['SUPPORT_AGENT', 'ADMIN'].includes(targetAgent.role)) {
          return res.status(400).json({
            status: 'error',
            message: 'Target user must be an active Support Agent or Admin.'
          });
        }

        // Validate agent belongs to ticket's category department
        if (targetAgent.role === 'SUPPORT_AGENT' && targetAgent.departmentId !== request.category.departmentId) {
          return res.status(400).json({
            status: 'error',
            message: 'Cannot assign ticket: Agent belongs to a different department than the category requires.'
          });
        }
      }

      updateData.assignedToId = assignedToId;
      if (request.status === 'PENDING' && assignedToId !== null) {
        updateData.status = 'ASSIGNED';
      }

      activitiesToCreate.push({
        actorId: req.user.id,
        activityType: 'ASSIGNMENT',
        oldValue: request.assignedToId ? 'Assigned' : 'Unassigned',
        newValue: targetAgent ? `Assigned to ${targetAgent.fullName}` : 'Unassigned'
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.serviceRequest.update({
        where: { id: request.id },
        data: updateData,
        include: {
          category: { select: { name: true } },
          createdBy: { select: { fullName: true } },
          assignedTo: { select: { fullName: true } }
        }
      });

      for (const act of activitiesToCreate) {
        await tx.ticketActivity.create({
          data: {
            requestId: request.id,
            actorId: act.actorId,
            activityType: act.activityType,
            oldValue: act.oldValue,
            newValue: act.newValue
          }
        });
      }

      return updatedRecord;
    });

    // Fire notifications asynchronously
    if (updateData.status) {
      notifyStatusChange({ request, newStatus: updateData.status, actor: req.user });
    }
    if (targetAgent) {
      notifyAssignment({ request, targetAgent, actor: req.user });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Service request updated successfully.',
      data: { request: updated }
    });
  } catch (error) {
    console.error('Update Request Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update service request.'
    });
  }
}

/**
 * Dedicated Assignment endpoint
 * PATCH /api/v1/requests/:id/assign (Agent & Admin)
 */
async function assignTicket(req, res) {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    const request = await prisma.serviceRequest.findUnique({
      where: id.startsWith('REQ-') ? { ticketNumber: id } : { id },
      include: { category: true }
    });

    if (!request || (request.deletedAt !== null && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ status: 'error', message: 'Service request not found.' });
    }

    // Role check: Only Agents (within dept) or Admins can assign
    if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({ status: 'error', message: 'Employees cannot assign tickets.' });
    }

    if (req.user.role === 'SUPPORT_AGENT') {
      if (request.category.departmentId !== req.user.departmentId) {
        return res.status(403).json({ status: 'error', message: 'Access denied: You can only assign tickets in your department.' });
      }
    }

    if (!assignedToId) {
      return res.status(400).json({ status: 'error', message: 'assignedToId is required.' });
    }

    const targetAgent = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, fullName: true, role: true, departmentId: true, isActive: true }
    });

    if (!targetAgent || !targetAgent.isActive || !['SUPPORT_AGENT', 'ADMIN'].includes(targetAgent.role)) {
      return res.status(400).json({ status: 'error', message: 'Target user must be an active Support Agent or Admin.' });
    }

    if (targetAgent.role === 'SUPPORT_AGENT' && targetAgent.departmentId !== request.category.departmentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot assign ticket: Agent belongs to a different department than the category requires.'
      });
    }

    const nextStatus = request.status === 'PENDING' ? 'ASSIGNED' : request.status;

    const updated = await prisma.$transaction(async (tx) => {
      const resRecord = await tx.serviceRequest.update({
        where: { id: request.id },
        data: {
          assignedToId: targetAgent.id,
          status: nextStatus
        },
        include: {
          category: { select: { name: true } },
          assignedTo: { select: { fullName: true, email: true } }
        }
      });

      await tx.ticketActivity.create({
        data: {
          requestId: request.id,
          actorId: req.user.id,
          activityType: 'ASSIGNMENT',
          oldValue: request.assignedToId ? 'Assigned' : 'Unassigned',
          newValue: `Assigned to ${targetAgent.fullName}`
        }
      });

      if (nextStatus !== request.status) {
        await tx.ticketActivity.create({
          data: {
            requestId: request.id,
            actorId: req.user.id,
            activityType: 'STATUS_CHANGE',
            oldValue: request.status,
            newValue: nextStatus
          }
        });
      }

      return resRecord;
    });

    notifyAssignment({ request, targetAgent, actor: req.user });

    return res.status(200).json({
      status: 'success',
      message: `Ticket successfully assigned to ${targetAgent.fullName}.`,
      data: { request: updated }
    });
  } catch (error) {
    console.error('Assign Ticket Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to assign ticket.' });
  }
}

/**
 * Dedicated Status update endpoint
 * PATCH /api/v1/requests/:id/status (Agent & Admin)
 */
async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Must be one of: [${VALID_STATUSES.join(', ')}].`
      });
    }

    const nextStatus = status.toUpperCase();
    const request = await prisma.serviceRequest.findUnique({
      where: id.startsWith('REQ-') ? { ticketNumber: id } : { id },
      include: { category: true }
    });

    if (!request || (request.deletedAt !== null && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ status: 'error', message: 'Service request not found.' });
    }

    if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({ status: 'error', message: 'Employees cannot change ticket status directly.' });
    }

    if (req.user.role === 'SUPPORT_AGENT') {
      const isAssigned = request.assignedToId === req.user.id;
      const isUnassignedDept = request.assignedToId === null && request.category.departmentId === req.user.departmentId;
      if (!isAssigned && !isUnassignedDept) {
        return res.status(403).json({ status: 'error', message: 'Access denied: You can only update status for requests in your department.' });
      }
    }

    // Guard against reopening bypass
    if (['RESOLVED', 'CLOSED'].includes(request.status) && nextStatus === 'IN_PROGRESS') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot reopen a resolved or closed ticket via the status endpoint. Reopening must be performed through the dedicated reopen endpoint: PATCH /api/v1/requests/:id/reopen'
      });
    }

    if (!isValidTransition(request.status, nextStatus)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status transition: cannot move from '${request.status}' to '${nextStatus}'. Allowed: [${VALID_TRANSITIONS[request.status]?.join(', ') || 'None'}].`
      });
    }

    const updateData = { status: nextStatus };
    if (nextStatus === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.serviceRequest.update({
        where: { id: request.id },
        data: updateData,
        include: {
          category: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        }
      });

      await tx.ticketActivity.create({
        data: {
          requestId: request.id,
          actorId: req.user.id,
          activityType: 'STATUS_CHANGE',
          oldValue: request.status,
          newValue: nextStatus
        }
      });

      return record;
    });

    notifyStatusChange({ request, newStatus: nextStatus, actor: req.user });

    return res.status(200).json({
      status: 'success',
      message: `Status updated to '${nextStatus}'.`,
      data: { request: updated }
    });
  } catch (error) {
    console.error('Update Status Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update status.' });
  }
}

/**
 * Reopen an unsatisfactory resolved ticket
 * PATCH /api/v1/requests/:id/reopen (Employee Creator & Admin)
 */
async function reopenTicket(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await prisma.serviceRequest.findUnique({
      where: id.startsWith('REQ-') ? { ticketNumber: id } : { id },
      include: { category: true }
    });

    if (!request || (request.deletedAt !== null && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ status: 'error', message: 'Service request not found.' });
    }

    // Only ticket creator or admin can reopen
    const isCreator = request.createdById === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Only the ticket creator or an administrator can reopen a request.'
      });
    }

    // Only RESOLVED or CLOSED requests can be reopened
    if (!['RESOLVED', 'CLOSED'].includes(request.status)) {
      return res.status(400).json({
        status: 'error',
        message: `Only tickets with status 'RESOLVED' or 'CLOSED' can be reopened. Current status: '${request.status}'.`
      });
    }

    // Calculate extended reopen SLA
    const newSlaDueDate = calculateReopenSla(new Date(), request.category.defaultSlaHours, request.priority);

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.serviceRequest.update({
        where: { id: request.id },
        data: {
          status: 'IN_PROGRESS',
          resolvedAt: null,
          slaDueDate: newSlaDueDate,
          isSlaBreached: false
        },
        include: {
          category: { select: { name: true } },
          assignedTo: { select: { fullName: true } }
        }
      });

      await tx.ticketActivity.create({
        data: {
          requestId: request.id,
          actorId: req.user.id,
          activityType: 'TICKET_REOPENED',
          oldValue: JSON.stringify({
            status: request.status,
            previousSlaDueDate: request.slaDueDate.toISOString(),
            previousResolvedAt: request.resolvedAt ? request.resolvedAt.toISOString() : null
          }),
          newValue: JSON.stringify({
            status: 'IN_PROGRESS',
            newSlaDueDate: newSlaDueDate.toISOString(),
            reason: reason ? reason.trim() : 'Reopened by user'
          })
        }
      });

      return record;
    });

    // Notify assigned agent or department
    if (request.assignedToId) {
      notifyStatusChange({ request, newStatus: 'IN_PROGRESS (Reopened)', actor: req.user });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Ticket successfully reopened and returned to IN_PROGRESS.',
      data: { request: updated }
    });
  } catch (error) {
    console.error('Reopen Ticket Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to reopen ticket.' });
  }
}

/**
 * Soft delete a service request (Admin Only)
 * DELETE /api/v1/requests/:id
 */
async function deleteRequest(req, res) {
  try {
    const { id } = req.params;
    const isTicketCode = id.startsWith('REQ-');
    const whereClause = isTicketCode ? { ticketNumber: id } : { id };

    const request = await prisma.serviceRequest.findUnique({
      where: whereClause
    });

    if (!request || request.deletedAt !== null) {
      return res.status(404).json({
        status: 'error',
        message: 'Service request not found.'
      });
    }

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { deletedAt: new Date() }
    });

    return res.status(200).json({
      status: 'success',
      message: `Service request ${request.ticketNumber} soft-deleted successfully.`
    });
  } catch (error) {
    console.error('Delete Request Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete service request.'
    });
  }
}

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  assignTicket,
  updateStatus,
  reopenTicket,
  deleteRequest
};
