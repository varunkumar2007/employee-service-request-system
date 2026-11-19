/**
 * Generates the next sequential ticket number formatted as REQ-YYYY-XXXX
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<string>} e.g. "REQ-2026-0003"
 */
async function generateTicketNumber(prisma) {
  const currentYear = new Date().getFullYear();
  const prefix = `REQ-${currentYear}-`;

  const latestTicket = await prisma.serviceRequest.findFirst({
    where: {
      ticketNumber: { startsWith: prefix }
    },
    orderBy: { ticketNumber: 'desc' },
    select: { ticketNumber: true }
  });

  let nextSequence = 1;
  if (latestTicket && latestTicket.ticketNumber) {
    const parts = latestTicket.ticketNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSequence = parsed + 1;
      }
    }
  }

  const padded = String(nextSequence).padStart(4, '0');
  return `${prefix}${padded}`;
}

module.exports = {
  generateTicketNumber
};
