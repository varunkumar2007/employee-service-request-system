const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env regardless of where the process is started
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { checkSlaDeadlines } = require('./services/slaMonitorService');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Service Request API running on http://localhost:${PORT}`);
  console.log(`🩺 Health check available at http://localhost:${PORT}/api/health`);

  // Periodic SLA monitoring check (every 5 minutes)
  const SLA_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    checkSlaDeadlines().catch(err => console.error('Background SLA check error:', err));
  }, SLA_INTERVAL_MS);
});

module.exports = server;
