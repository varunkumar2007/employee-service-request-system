const prisma = require('../config/prisma');

/**
 * List service categories
 * GET /api/v1/categories
 */
async function getCategories(req, res) {
  try {
    const { departmentId, includeInactive } = req.query;

    const canSeeInactive = req.user.role === 'ADMIN' && includeInactive === 'true';

    const where = {};
    if (!canSeeInactive) {
      where.isActive = true;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: { requests: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      results: categories.length,
      data: { categories }
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve categories.'
    });
  }
}

/**
 * Create a new category
 * POST /api/v1/categories (Admin Only)
 */
async function createCategory(req, res) {
  try {
    const { name, departmentId, defaultSlaHours } = req.body;

    if (!name || !departmentId) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name and departmentId are required.'
      });
    }

    const slaHours = defaultSlaHours ? parseInt(defaultSlaHours, 10) : 24;
    if (isNaN(slaHours) || slaHours < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'defaultSlaHours must be a positive number greater than 0.'
      });
    }

    // Verify department exists
    const dept = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!dept) {
      return res.status(404).json({
        status: 'error',
        message: 'Specified department does not exist.'
      });
    }

    // Verify name uniqueness
    const normalizedName = name.trim();
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: normalizedName, mode: 'insensitive' }
      }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'A category with this name already exists.'
      });
    }

    const newCategory = await prisma.category.create({
      data: {
        name: normalizedName,
        departmentId,
        defaultSlaHours: slaHours
      },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return res.status(201).json({
      status: 'success',
      message: 'Category created successfully.',
      data: { category: newCategory }
    });
  } catch (error) {
    console.error('Create Category Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create category.'
    });
  }
}

/**
 * Update an existing category
 * PATCH /api/v1/categories/:id (Admin Only)
 */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, departmentId, defaultSlaHours } = req.body;

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.'
      });
    }

    const data = {};
    if (name) data.name = name.trim();
    if (defaultSlaHours !== undefined) {
      const sla = parseInt(defaultSlaHours, 10);
      if (isNaN(sla) || sla < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'defaultSlaHours must be a positive integer.'
        });
      }
      data.defaultSlaHours = sla;
    }

    if (departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        return res.status(404).json({
          status: 'error',
          message: 'Specified department does not exist.'
        });
      }
      data.departmentId = departmentId;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data,
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Category updated successfully.',
      data: { category: updatedCategory }
    });
  } catch (error) {
    console.error('Update Category Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update category.'
    });
  }
}

/**
 * Toggle active status of a category
 * PATCH /api/v1/categories/:id/status (Admin Only)
 */
async function toggleCategoryStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide isActive boolean field.'
      });
    }

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found.'
      });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    });

    return res.status(200).json({
      status: 'success',
      message: `Category ${updated.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { category: updated }
    });
  } catch (error) {
    console.error('Toggle Category Status Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update category status.'
    });
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus
};
