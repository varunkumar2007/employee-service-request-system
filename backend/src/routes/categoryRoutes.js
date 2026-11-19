const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

// Authenticated users can list categories
router.get('/', authenticate, categoryController.getCategories);

// Only ADMIN can create or modify categories and their SLAs
router.post('/', authenticate, authorize('ADMIN'), categoryController.createCategory);
router.patch('/:id', authenticate, authorize('ADMIN'), categoryController.updateCategory);
router.patch('/:id/status', authenticate, authorize('ADMIN'), categoryController.toggleCategoryStatus);

module.exports = router;
