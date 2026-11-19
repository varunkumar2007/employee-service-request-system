const prisma = require('../config/prisma');
const { createNotification } = require('./notificationService');

// Shared in-memory lock for local process concurrency
let isChecking = false;

// PostgreSQL 64-bit advisory lock key for SLA monitor coordination across instances
const PG_ADVISORY_LOCK_ID = '88442211';

/**
 * Checks all active tickets for SLA breach warnings and overdue deadlines.
 * Uses PostgreSQL transaction-level advisory locks (pg_try_advisory_xact_lock)
 * inside a Prisma interactive transaction.
 *
 * This provides 100% connection-safety:
 * - All queries execute on the exact same connection reserved by Prisma for the transaction.
 * - The lock is automatically released by PostgreSQL on transaction COMMIT or ROLLBACK.
 * - Eliminates connection-pool mismatches where session unlock runs on a different connection.
 * - Guarantees lock release on success, thrown errors, early-exit, or process crashes.
 *
 * @returns {Promise<{ checked: number, warned: number, breached: number, skipped?: boolean }>}
 */
async function checkSlaDeadlines() {
  if (isChecking) {
    return { checked: 0, warned: 0, breached: 0, skipped: true };
  }

  isChecking = true;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Acquire distributed PostgreSQL transaction-level advisory lock
      const lockResult = await tx.$queryRawUnsafe(
        `SELECT pg_try_advisory_xact_lock(${PG_ADVISORY_LOCK_ID}) AS "hasLock"`
      );
      const hasLock = Boolean(lockResult && lockResult[0] && lockResult[0].hasLock);

      if (!hasLock) {
        return { checked: 0, warned: 0, breached: 0, skipped: true };
      }

      let warnedCount = 0;
      let breachedCount = 0;
      const now = new Date();

      // 2. Fetch active tickets (strictly PENDING, ASSIGNED, IN_PROGRESS and not soft-deleted)
      const activeTickets = await tx.serviceRequest.findMany({
        where: {
          status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
          deletedAt: null
        },
        include: {
          category: {
            select: { id: true, name: true, departmentId: true }
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true, isActive: true }
          },
          createdBy: {
            select: { id: true, fullName: true, email: true }
          },
          activities: {
            where: { activityType: 'TICKET_REOPENED' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      for (const ticket of activeTickets) {
        const dueDate = new Date(ticket.slaDueDate);

        // Determine the start time of the CURRENT SLA cycle
        // If the ticket was reopened, use the timestamp of the latest reopen event
        const latestReopenActivity = ticket.activities && ticket.activities.length > 0 ? ticket.activities[0] : null;
        const cycleStartTime = latestReopenActivity ? new Date(latestReopenActivity.createdAt) : new Date(ticket.createdAt);

        const totalDurationMs = Math.max(1000, dueDate.getTime() - cycleStartTime.getTime());
        const remainingMs = dueDate.getTime() - now.getTime();

        // Determine appropriate alert recipients
        // If assigned: notify assigned agent.
        // If unassigned: notify active department agents, or admin if none exist
        let recipientIds = [];
        if (ticket.assignedToId && ticket.assignedTo?.isActive) {
          recipientIds = [ticket.assignedToId];
        } else {
          const deptAgents = await tx.user.findMany({
            where: {
              departmentId: ticket.category.departmentId,
              role: 'SUPPORT_AGENT',
              isActive: true
            },
            select: { id: true }
          });

          if (deptAgents.length > 0) {
            recipientIds = deptAgents.map(a => a.id);
          } else {
            const admins = await tx.user.findMany({
              where: { role: 'ADMIN', isActive: true },
              select: { id: true },
              take: 2
            });
            recipientIds = admins.map(a => a.id);
          }
        }

        // ==========================================
        // CASE 1: TICKET IS OVERDUE (BREACHED)
        // ==========================================
        if (remainingMs <= 0) {
          // 1. Update flag and create SLA_BREACHED audit record if not already recorded in this cycle
          const existingBreachActivity = await tx.ticketActivity.findFirst({
            where: {
              requestId: ticket.id,
              activityType: 'SLA_BREACHED',
              createdAt: { gte: cycleStartTime }
            }
          });

          if (!existingBreachActivity) {
            await tx.serviceRequest.update({
              where: { id: ticket.id },
              data: { isSlaBreached: true }
            });

            await tx.ticketActivity.create({
              data: {
                requestId: ticket.id,
                actorId: ticket.assignedToId || ticket.createdById,
                activityType: 'SLA_BREACHED',
                oldValue: JSON.stringify({ isSlaBreached: ticket.isSlaBreached, slaDueDate: dueDate.toISOString() }),
                newValue: JSON.stringify({ isSlaBreached: true, breachedAt: now.toISOString() })
              }
            });
          }

          // 2. Check if breach alert was already dispatched FOR THIS CYCLE
          const existingBreachAlert = await tx.notification.findFirst({
            where: {
              requestId: ticket.id,
              title: { startsWith: 'SLA Breach:' },
              createdAt: { gte: cycleStartTime }
            }
          });

          if (!existingBreachAlert) {
            for (const recipientId of recipientIds) {
              await createNotification({
                recipientId,
                requestId: ticket.id,
                title: `SLA Breach: ${ticket.ticketNumber}`,
                message: `Ticket '${ticket.title}' has exceeded its SLA deadline of ${dueDate.toLocaleString()}.`
              }, tx);
            }
            breachedCount++;
          }
        }

        // ==========================================
        // CASE 2: TICKET APPROACHING DEADLINE (<= 20% REMAINING)
        // ==========================================
        else if (remainingMs <= 0.20 * totalDurationMs) {
          const remainingHours = Math.max(0.1, (remainingMs / (1000 * 60 * 60))).toFixed(1);

          // Check if warning alert was already dispatched FOR THIS CYCLE
          const existingWarningAlert = await tx.notification.findFirst({
            where: {
              requestId: ticket.id,
              title: { startsWith: 'SLA Warning:' },
              createdAt: { gte: cycleStartTime }
            }
          });

          if (!existingWarningAlert) {
            for (const recipientId of recipientIds) {
              await createNotification({
                recipientId,
                requestId: ticket.id,
                title: `SLA Warning: ${ticket.ticketNumber}`,
                message: `Ticket '${ticket.title}' is approaching its deadline with ~${remainingHours} hours remaining.`
              }, tx);
            }
            warnedCount++;
          }
        }
      }

      return {
        checked: activeTickets.length,
        warned: warnedCount,
        breached: breachedCount
      };
    }, { timeout: 30000, maxWait: 5000 });
  } catch (error) {
    console.error('Error in SLA Deadline Monitor:', error);
    throw error;
  } finally {
    isChecking = false;
  }
}

module.exports = {
  checkSlaDeadlines,
  PG_ADVISORY_LOCK_ID
};
