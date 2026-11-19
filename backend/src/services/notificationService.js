const prisma = require('../config/prisma');

/**
 * Creates an in-app notification for a user
 */
async function createNotification({ recipientId, requestId, title, message }, dbClient = prisma) {
  try {
    if (!recipientId || !title || !message) return null;
    const client = dbClient || prisma;
    return await client.notification.create({
      data: {
        recipientId,
        requestId: requestId || null,
        title: title.trim(),
        message: message.trim()
      }
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
}

/**
 * Dispatches notification when a ticket's status changes
 */
async function notifyStatusChange({ request, newStatus, actor }) {
  // 1. If the actor is not the ticket creator, notify the creator
  if (actor.id !== request.createdById) {
    await createNotification({
      recipientId: request.createdById,
      requestId: request.id,
      title: `Status Updated: ${request.ticketNumber}`,
      message: `Your request '${request.title}' status was updated to '${newStatus}' by ${actor.fullName}.`
    });
  }

  // 2. If ticket is assigned and actor is not the assigned agent (e.g. employee reopened or admin updated status), notify the assigned agent
  if (request.assignedToId && actor.id !== request.assignedToId) {
    await createNotification({
      recipientId: request.assignedToId,
      requestId: request.id,
      title: `Ticket Status Updated: ${request.ticketNumber}`,
      message: `Ticket '${request.title}' assigned to you was updated to '${newStatus}' by ${actor.fullName}.`
    });
  }
}

/**
 * Dispatches notification when a ticket is assigned to an agent
 */
async function notifyAssignment({ request, targetAgent, actor }) {
  if (targetAgent && actor.id !== targetAgent.id) {
    await createNotification({
      recipientId: targetAgent.id,
      requestId: request.id,
      title: `Ticket Assigned: ${request.ticketNumber}`,
      message: `Ticket '${request.title}' (${request.priority} priority) has been assigned to you by ${actor.fullName}.`
    });
  }
}

/**
 * Dispatches notification when a new comment is posted
 */
async function notifyComment({ request, comment, author }) {
  // Public comment: notify the opposite party
  if (!comment.isInternal) {
    // If author is employee, notify assigned agent if one exists
    if (author.id === request.createdById && request.assignedToId) {
      await createNotification({
        recipientId: request.assignedToId,
        requestId: request.id,
        title: `New Comment: ${request.ticketNumber}`,
        message: `${author.fullName} commented on ticket '${request.title}'.`
      });
    } else if (author.id !== request.createdById) {
      // If author is agent/admin, notify employee
      await createNotification({
        recipientId: request.createdById,
        requestId: request.id,
        title: `New Update: ${request.ticketNumber}`,
        message: `${author.fullName} replied on your ticket '${request.title}'.`
      });
    }
  }
}

module.exports = {
  createNotification,
  notifyStatusChange,
  notifyAssignment,
  notifyComment
};
