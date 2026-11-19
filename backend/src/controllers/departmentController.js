const prisma = require('../config/prisma');

/**
 * List departments
 * GET /api/v1/departments
 */
async function getDepartments(req, res) {
  try {
    const { includeInactive } = req.query;

    // Only Admins can see inactive departments
    const canSeeInactive = req.user.role === 'ADMIN' && includeInactive === 'true';

    const where = canSeeInactive ? {} : { isActive: true };

    const departments = await prisma.department.findMany({
      where,
      include: {
        _count: {
          select: { users: true, categories: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      status: 'success',
      results: departments.length,
      data: { departments }
    });
  } catch (error) {
    console.error('Get Departments Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve departments.'
    });
  }
}

/**
 * Create a new department
 * POST /api/v1/departments (Admin Only)
 */
async function createDepartment(req, res) {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        status: 'error',
        message: 'Department name and code are required.'
      });
    }

    const normalizedCode = code.toUpperCase().trim();
    const normalizedName = name.trim();

    // Check for duplicate code or name
    const existing = await prisma.department.findFirst({
      where: {
        OR: [
          { code: normalizedCode },
          { name: { equals: normalizedName, mode: 'insensitive' } }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'A department with this name or code already exists.'
      });
    }

    const newDepartment = await prisma.department.create({
      data: {
        name: normalizedName,
        code: normalizedCode,
        description: description ? description.trim() : null
      }
    });

    return res.status(201).json({
      status: 'success',
      message: 'Department created successfully.',
      data: { department: newDepartment }
    });
  } catch (error) {
    console.error('Create Department Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create department.'
    });
  }
}

/**
 * Update a department
 * PATCH /api/v1/departments/:id (Admin Only)
 */
async function updateDepartment(req, res) {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const department = await prisma.department.findUnique({
      where: { id }
    });

    if (!department) {
      return res.status(404).json({
        status: 'error',
        message: 'Department not found.'
      });
    }

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (code !== undefined) data.code = code.toUpperCase().trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data
    });

    return res.status(200).json({
      status: 'success',
      message: 'Department updated successfully.',
      data: { department: updatedDepartment }
    });
  } catch (error) {
    console.error('Update Department Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update department.'
    });
  }
}

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment
};
