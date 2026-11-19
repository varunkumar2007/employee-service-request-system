const { getEffectiveSlaHours } = require('./slaCalculator');

// Forward status transition matrix for standard status progression
const VALID_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'PENDING', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED'],
  RESOLVED: ['CLOSED'], // Forward progression can only close a resolved ticket
  REJECTED: ['PENDING', 'IN_PROGRESS'], // Admin reconsideration
  CLOSED: []           // Terminal status in standard progression
};

/**
 * Validates whether transitioning from currentStatus to nextStatus is permitted in standard flow
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
function isValidTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  const allowed = VALID_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(nextStatus);
}

/**
 * Calculates new SLA due date when a ticket is reopened
 * Formula from approved design: reopenedAt + max(8, 0.5 * effectiveSlaHours)
 * @param {Date} reopenedAt
 * @param {number} defaultSlaHours
 * @param {string} priority
 * @returns {Date}
 */
function calculateReopenSla(reopenedAt = new Date(), defaultSlaHours = 24, priority = 'MEDIUM') {
  const baseEffectiveHours = getEffectiveSlaHours(defaultSlaHours, priority);
  const reopenHours = Math.max(8, Math.round(0.5 * baseEffectiveHours));
  const start = reopenedAt instanceof Date ? reopenedAt : new Date(reopenedAt);
  return new Date(start.getTime() + reopenHours * 60 * 60 * 1000);
}

module.exports = {
  VALID_TRANSITIONS,
  isValidTransition,
  calculateReopenSla
};
