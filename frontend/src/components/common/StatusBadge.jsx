const STATUS_CONFIG = {
  PENDING: { label: 'Pending', bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  ASSIGNED: { label: 'Assigned', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  IN_PROGRESS: { label: 'In Progress', bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
  RESOLVED: { label: 'Resolved', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  CLOSED: { label: 'Closed', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
  REJECTED: { label: 'Rejected', bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' }
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    bg: '#f1f5f9',
    text: '#475569',
    border: '#e2e8f0'
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 9px',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: config.bg,
      color: config.text,
      border: `1px solid ${config.border}`,
      textTransform: 'uppercase',
      letterSpacing: '0.03em'
    }}>
      {config.label}
    </span>
  );
}
