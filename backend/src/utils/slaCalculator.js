const PRIORITY_MULTIPLIERS = {
  URGENT: 0.25,
  HIGH: 0.5,
  MEDIUM: 1.0,
  LOW: 2.0
};

/**
 * Calculates effective SLA hours based on category base SLA and priority
 * @param {number} defaultSlaHours
 * @param {string} priority 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
 * @returns {number} Effective SLA hours (minimum 1 hour)
 */
function getEffectiveSlaHours(defaultSlaHours, priority = 'MEDIUM') {
  const multiplier = PRIORITY_MULTIPLIERS[priority] || 1.0;
  const hours = Math.round(defaultSlaHours * multiplier);
  return Math.max(1, hours);
}

/**
 * Calculates the SLA due date timestamp
 * @param {Date} startTime
 * @param {number} defaultSlaHours
 * @param {string} priority
 * @returns {Date} SLA due date
 */
function calculateSlaDueDate(startTime = new Date(), defaultSlaHours = 24, priority = 'MEDIUM') {
  const effectiveHours = getEffectiveSlaHours(defaultSlaHours, priority);
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  return new Date(start.getTime() + effectiveHours * 60 * 60 * 1000);
}

module.exports = {
  PRIORITY_MULTIPLIERS,
  getEffectiveSlaHours,
  calculateSlaDueDate
};
