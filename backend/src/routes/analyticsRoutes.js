const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// All analytics endpoints require authentication
router.use(authenticate);

// Role-tailored dashboard metrics (accessible to all authenticated users with backend scoping)
router.get('/dashboard', analyticsController.getDashboardStats);

// Trigger SLA monitor check (Agents & Admins)
router.post('/sla-check', authorize('ADMIN', 'SUPPORT_AGENT'), analyticsController.triggerSlaCheck);

module.exports = router;
