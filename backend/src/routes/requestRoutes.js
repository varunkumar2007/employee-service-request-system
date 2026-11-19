const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// All request endpoints require authentication
router.use(authenticate);

// List requests (Role-scoped)
router.get('/', requestController.getRequests);

// Create request (Employees & Admins)
router.post('/', requestController.createRequest);

// Get single request details
router.get('/:id', requestController.getRequestById);

// General update request
router.patch('/:id', requestController.updateRequest);

// Dedicated Assignment endpoint (Agents & Admins)
router.patch('/:id/assign', requestController.assignTicket);

// Dedicated Status update endpoint (Agents & Admins)
router.patch('/:id/status', requestController.updateStatus);

// Reopen endpoint (Employee creator & Admins)
router.patch('/:id/reopen', requestController.reopenTicket);

// Soft-delete request (Admin only)
router.delete('/:id', authorize('ADMIN'), requestController.deleteRequest);

// Discussion comments and internal notes
router.get('/:requestId/comments', commentController.getComments);
router.post('/:requestId/comments', commentController.createComment);

module.exports = router;
