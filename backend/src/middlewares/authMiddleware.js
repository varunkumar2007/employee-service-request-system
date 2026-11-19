const { verifyToken } = require('../utils/token');
const prisma = require('../config/prisma');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired. Please log in again.'
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token signature.'
      });
    }

    // Fetch the active user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        department: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User account not found.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'User account has been deactivated.'
      });
    }

    // Attach user (excluding passwordHash) to request
    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication.'
    });
  }
}

module.exports = { authenticate };
