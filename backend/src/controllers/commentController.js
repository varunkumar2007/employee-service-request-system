const prisma = require('../config/prisma');
const { notifyComment } = require('../services/notificationService');

/**
 * Get comments for a service request
 * GET /api/v1/requests/:requestId/comments
 */
async function getComments(req, res) {
  try {
    const { requestId } = req.params;
    const isTicketCode = requestId.startsWith('REQ-');
    const whereClause = isTicketCode ? { ticketNumber: requestId } : { id: requestId };

    const request = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: { category: true }
    });

    if (!request || (request.deletedAt !== null && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ status: 'error', message: 'Service request not found.' });
    }

    // Role-based access validation
    if (req.user.role === 'EMPLOYEE') {
      if (request.createdById !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Access denied: You cannot view comments on this request.' });
      }
    } else if (req.user.role === 'SUPPORT_AGENT') {
      const isAssigned = request.assignedToId === req.user.id;
      const isUnassignedDept = request.assignedToId === null && request.category.departmentId === req.user.departmentId;
      if (!isAssigned && !isUnassignedDept) {
        return res.status(403).json({ status: 'error', message: 'Access denied: Out of department request.' });
      }
    }

    // Filter internal notes out for Employees
    const commentWhere = { requestId: request.id };
    if (req.user.role === 'EMPLOYEE') {
      commentWhere.isInternal = false;
    }

    const comments = await prisma.ticketComment.findMany({
      where: commentWhere,
      include: {
        author: {
          select: { id: true, fullName: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      results: comments.length,
      data: { comments }
    });
  } catch (error) {
    console.error('Get Comments Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve comments.' });
  }
}

/**
 * Add a comment or internal note to a service request
 * POST /api/v1/requests/:requestId/comments
 */
async function createComment(req, res) {
  try {
    const { requestId } = req.params;
    const rawMessage = req.body.message || req.body.content;
    const isInternal = req.body.isInternal || false;

    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return res.status(400).json({ status: 'error', message: 'Comment message is required.' });
    }
    const message = rawMessage.trim();

    const isTicketCode = requestId.startsWith('REQ-');
    const whereClause = isTicketCode ? { ticketNumber: requestId } : { id: requestId };

    const request = await prisma.serviceRequest.findUnique({
      where: whereClause,
      include: { category: true }
    });

    if (!request || (request.deletedAt !== null && req.user.role !== 'ADMIN')) {
      return res.status(404).json({ status: 'error', message: 'Service request not found.' });
    }

    // Role-based ticket access verification
    if (req.user.role === 'EMPLOYEE') {
      if (request.createdById !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Access denied: You cannot comment on this request.' });
      }

      // STRICT SECURITY RULE: Employees cannot post internal notes
      if (isInternal === true) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Only Support Agents and Admins can create internal notes.'
        });
      }
    } else if (req.user.role === 'SUPPORT_AGENT') {
      const isAssigned = request.assignedToId === req.user.id;
      const isUnassignedDept = request.assignedToId === null && request.category.departmentId === req.user.departmentId;
      if (!isAssigned && !isUnassignedDept) {
        return res.status(403).json({ status: 'error', message: 'Access denied: Out of department request.' });
      }
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const comment = await tx.ticketComment.create({
        data: {
          requestId: request.id,
          authorId: req.user.id,
          message: message.trim(),
          isInternal: Boolean(isInternal)
        },
        include: {
          author: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });

      await tx.ticketActivity.create({
        data: {
          requestId: request.id,
          actorId: req.user.id,
          activityType: 'COMMENT_ADDED',
          newValue: isInternal ? 'Added an internal note' : 'Added a public comment'
        }
      });

      return comment;
    });

    notifyComment({ request, comment: newComment, author: req.user });

    return res.status(201).json({
      status: 'success',
      message: newComment.isInternal ? 'Internal note added.' : 'Comment posted successfully.',
      data: { comment: newComment }
    });
  } catch (error) {
    console.error('Create Comment Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to post comment.' });
  }
}

module.exports = {
  getComments,
  createComment
};
