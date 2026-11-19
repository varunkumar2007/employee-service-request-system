const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Authenticated users can list active departments
router.get('/', authenticate, departmentController.getDepartments);

// Only ADMIN can create or modify departments
router.post('/', authenticate, authorize('ADMIN'), departmentController.createDepartment);
router.patch('/:id', authenticate, authorize('ADMIN'), departmentController.updateDepartment);

module.exports = router;
