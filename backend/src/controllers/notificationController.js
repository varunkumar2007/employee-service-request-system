const prisma = require('../config/prisma');

/**
 * List notifications for the authenticated user
 * GET /api/v1/notifications
 */
async function getNotifications(req, res) {
  try {
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const where = {
      recipientId: req.user.id
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: { id: true, ticketNumber: true, title: true, status: true }
          }
        }
      })
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit)
        }
      }
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to retrieve notifications.' });
  }
}

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
async function getUnreadCount(req, res) {
  try {
    const count = await prisma.notification.count({
      where: {
        recipientId: req.user.id,
        isRead: false
      }
    });

    return res.status(200).json({
      status: 'success',
      data: { unreadCount: count }
    });
  } catch (error) {
    console.error('Get Unread Count Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to get unread count.' });
  }
}

/**
 * Mark a single notification as read
 * PATCH /api/v1/notifications/:id/read
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Notification not found.' });
    }

    // Security Guard: Users can only mark their OWN notifications as read
    if (notification.recipientId !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You cannot modify another user\'s notification.'
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.',
      data: { notification: updated }
    });
  } catch (error) {
    console.error('Mark As Read Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update notification.' });
  }
}

/**
 * Mark all notifications as read for current user
 * PATCH /api/v1/notifications/read-all
 */
async function markAllAsRead(req, res) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    return res.status(200).json({
      status: 'success',
      message: `${result.count} notification(s) marked as read.`
    });
  } catch (error) {
    console.error('Mark All As Read Error:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to update notifications.' });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
