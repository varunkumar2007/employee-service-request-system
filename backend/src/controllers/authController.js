const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/token');

// Basic email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new employee account
 * POST /api/v1/auth/register
 */
async function register(req, res) {
  try {
    const { email, password, fullName, departmentId } = req.body;

    // 1. Validation checks
    if (!email || !password || !fullName) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email, password, and fullName.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.'
      });
    }

    // 2. Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'An account with this email address already exists.'
      });
    }

    // 3. Check department if provided
    if (departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      if (!dept || !dept.isActive) {
        return res.status(400).json({
          status: 'error',
          message: 'The selected department is invalid or inactive.'
        });
      }
    }

    // 4. Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. Create user in database (defaults to role: EMPLOYEE)
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
        role: 'EMPLOYEE',
        departmentId: departmentId || null
      },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // 6. Generate JWT token
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    const { passwordHash: _, ...safeUser } = newUser;

    return res.status(201).json({
      status: 'success',
      message: 'Account registered successfully.',
      data: {
        token,
        user: safeUser
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to register account.'
    });
  }
}

/**
 * Log in an existing user
 * POST /api/v1/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // 2. Check active status
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.'
      });
    }

    // 4. Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const { passwordHash: _, ...safeUser } = user;

    return res.status(200).json({
      status: 'success',
      message: 'Authentication successful.',
      data: {
        token,
        user: safeUser
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process login.'
    });
  }
}

/**
 * Get current authenticated user profile
 * GET /api/v1/auth/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    status: 'success',
    data: {
      user: req.user
    }
  });
}

module.exports = {
  register,
  login,
  getMe
};
