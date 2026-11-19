const { PrismaClient } = require('@prisma/client');

// Shared singleton instance of PrismaClient
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
