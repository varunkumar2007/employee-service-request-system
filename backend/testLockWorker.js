const prisma = require('./src/config/prisma');
const { PG_ADVISORY_LOCK_ID } = require('./src/services/slaMonitorService');

// Parse CLI args
const holdMs = parseInt(process.argv[2], 10) || 0;

async function runWorker() {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const [res] = await tx.$queryRawUnsafe(
        `SELECT pg_try_advisory_xact_lock(${PG_ADVISORY_LOCK_ID}) AS "hasLock"`
      );
      const hasLock = Boolean(res && res.hasLock);

      if (!hasLock) {
        return { hasLock: false, skipped: true, processed: 0 };
      }

      if (holdMs > 0) {
        await new Promise(resolve => setTimeout(resolve, holdMs));
      }

      return { hasLock: true, skipped: false, processed: 1 };
    }, { timeout: 30000 });

    console.log(JSON.stringify({ success: true, ...result }));
  } catch (err) {
    console.error(JSON.stringify({ success: false, error: err.message }));
  } finally {
    await prisma.$disconnect();
  }
}

runWorker();
