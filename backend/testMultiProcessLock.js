const { spawn } = require('child_process');
const path = require('path');
const prisma = require('./src/config/prisma');
const { PG_ADVISORY_LOCK_ID, checkSlaDeadlines } = require('./src/services/slaMonitorService');

function runChildWorker(holdMs) {
  return new Promise((resolve, reject) => {
    const workerScript = path.join(__dirname, 'testLockWorker.js');
    const child = spawn(process.execPath, [workerScript, String(holdMs)]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => stdout += data.toString());
    child.stderr.on('data', data => stderr += data.toString());

    child.on('close', (code) => {
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve({ code, parsed });
      } catch (e) {
        reject(new Error(`Failed to parse worker output. Code: ${code}. Raw: ${stdout}. Err: ${stderr}`));
      }
    });

    child.on('error', reject);
  });
}

async function runMultiProcessVerification() {
  console.log('🧪 Starting Multi-Process PostgreSQL Distributed Lock Verification...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // STEP 1: Launch Process 1 (holding lock for 1500ms) and Process 2 concurrently
    // ------------------------------------------------------------------------
    console.log('Launching Process 1 (hold = 1500ms)...');
    const proc1Promise = runChildWorker(1500);

    // Wait 300ms to ensure Process 1 is actively inside its transaction holding the lock
    await new Promise(r => setTimeout(r, 300));

    console.log('Launching Process 2 (simultaneous run while Process 1 is holding lock)...');
    const proc2Promise = runChildWorker(0);

    const [res1, res2] = await Promise.all([proc1Promise, proc2Promise]);

    assert(
      res1.parsed.hasLock === true && res1.parsed.skipped === false,
      'Process 1 successfully acquires the distributed PostgreSQL advisory lock',
      JSON.stringify(res1.parsed)
    );

    assert(
      res2.parsed.hasLock === false && res2.parsed.skipped === true && res2.parsed.processed === 0,
      'Process 2 detects active distributed lock, skips processing tickets, and exits safely',
      JSON.stringify(res2.parsed)
    );

    // ------------------------------------------------------------------------
    // STEP 2: Verify lock availability after Process 1 terminates
    // ------------------------------------------------------------------------
    console.log('Launching Process 3 after Process 1 has completed...');
    const res3 = await runChildWorker(0);

    assert(
      res3.parsed.hasLock === true && res3.parsed.skipped === false,
      'Distributed lock is immediately available again after previous process finishes',
      JSON.stringify(res3.parsed)
    );

    // ------------------------------------------------------------------------
    // STEP 3: Verify lock release on error / rollback path
    // ------------------------------------------------------------------------
    console.log('Verifying lock release on thrown exception / rollback path...');
    try {
      await prisma.$transaction(async (tx) => {
        const [lockRes] = await tx.$queryRawUnsafe(
          `SELECT pg_try_advisory_xact_lock(${PG_ADVISORY_LOCK_ID}) AS "hasLock"`
        );
        if (lockRes.hasLock) {
          throw new Error('SIMULATED_TRANSACTION_FAILURE');
        }
      });
    } catch (e) {
      // Expected rollback
    }

    // Now test that lock was not leaked by the error
    const resPostError = await runChildWorker(0);
    assert(
      resPostError.parsed.hasLock === true && resPostError.parsed.skipped === false,
      'Transaction-level advisory lock is cleanly released on error/rollback without leaking',
      JSON.stringify(resPostError.parsed)
    );

    // ------------------------------------------------------------------------
    // STEP 4: Live checkSlaDeadlines execution from service
    // ------------------------------------------------------------------------
    const monitorResult = await checkSlaDeadlines();
    assert(
      monitorResult.skipped !== true && monitorResult.checked >= 0,
      'checkSlaDeadlines() in service executes cleanly with connection-safe transaction lock',
      JSON.stringify(monitorResult)
    );

  } catch (err) {
    console.error('Multi-Process Test Error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log(`\n========================================`);
    console.log(`Multi-Process Lock Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runMultiProcessVerification();
