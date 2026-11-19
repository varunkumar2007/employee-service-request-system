const prisma = require('../config/prisma');
const { checkSlaDeadlines } = require('../services/slaMonitorService');

/**
 * Get role-scoped dashboard metrics
 * GET /api/v1/analytics/dashboard
 */
async function getDashboardStats(req, res) {
  try {
    const now = new Date();
    const baseWhere = { deletedAt: null };

    // 1. Role Scoping
    if (req.user.role === 'EMPLOYEE') {
      baseWhere.createdById = req.user.id;
    } else if (req.user.role === 'SUPPORT_AGENT') {
      baseWhere.OR = [
        { assignedToId: req.user.id },
        {
          assignedToId: null,
          category: { departmentId: req.user.departmentId }
        }
      ];
    }
    // Admins have unrestricted system-wide scope

    // 2. Fetch all tickets within the user's scope
    const tickets = await prisma.serviceRequest.findMany({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        priority: true,
        slaDueDate: true,
        isSlaBreached: true,
        resolvedAt: true,
        createdAt: true,
        category: {
          select: { name: true }
        }
      }
    });

    const totalRequests = tickets.length;

    // Status counts
    let pendingCount = 0;
    let assignedCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let rejectedCount = 0;

    // Overdue count (Active tickets past due or flagged breached)
    let overdueCount = 0;

    // Priority counts
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };

    // Category breakdown
    const categoryCounts = {};

    // Resolution metrics
    let totalResolutionTimeHours = 0;
    let resolvedTicketsCount = 0;
    let compliantResolvedCount = 0;

    for (const ticket of tickets) {
      // Status aggregation
      switch (ticket.status) {
        case 'PENDING': pendingCount++; break;
        case 'ASSIGNED': assignedCount++; break;
        case 'IN_PROGRESS': inProgressCount++; break;
        case 'RESOLVED': resolvedCount++; break;
        case 'CLOSED': closedCount++; break;
        case 'REJECTED': rejectedCount++; break;
      }

      // Priority aggregation
      if (priorityCounts[ticket.priority] !== undefined) {
        priorityCounts[ticket.priority]++;
      }

      // Category breakdown
      const catName = ticket.category?.name || 'Uncategorized';
      categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

      // Overdue detection
      const isActive = ['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(ticket.status);
      if (isActive && (ticket.isSlaBreached || new Date(ticket.slaDueDate) < now)) {
        overdueCount++;
      }

      // Resolution time and compliance
      if (ticket.resolvedAt) {
        resolvedTicketsCount++;
        const durationHours = (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        totalResolutionTimeHours += Math.max(0, durationHours);

        if (new Date(ticket.resolvedAt) <= new Date(ticket.slaDueDate)) {
          compliantResolvedCount++;
        }
      }
    }

    const averageResolutionTimeHours = resolvedTicketsCount > 0
      ? parseFloat((totalResolutionTimeHours / resolvedTicketsCount).toFixed(1))
      : 0;

    const slaComplianceRate = resolvedTicketsCount > 0
      ? parseFloat(((compliantResolvedCount / resolvedTicketsCount) * 100).toFixed(1))
      : 100.0;

    return res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalRequests,
          pending: pendingCount,
          assigned: assignedCount,
          inProgress: inProgressCount,
          resolved: resolvedCount,
          closed: closedCount,
          rejected: rejectedCount,
          overdue: overdueCount
        },
        priorityCounts,
        categoryCounts,
        performance: {
          averageResolutionTimeHours,
          slaComplianceRate,
          resolvedTicketsCount
        }
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve dashboard statistics.' });
  }
}

/**
 * On-demand SLA deadline evaluation
 * POST /api/v1/analytics/sla-check (Agent & Admin)
 */
async function triggerSlaCheck(req, res) {
  try {
    const result = await checkSlaDeadlines();
    return res.status(200).json({
      status: 'success',
      message: 'SLA deadline check completed.',
      data: result
    });
  } catch (error) {
    console.error('Trigger SLA Check Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to execute SLA check.' });
  }
}

module.exports = {
  getDashboardStats,
  triggerSlaCheck
};
