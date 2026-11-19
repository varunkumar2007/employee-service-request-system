const PRIORITY_CONFIG = {
  LOW: { label: 'Low', bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  MEDIUM: { label: 'Medium', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  HIGH: { label: 'High', bg: '#fffbeb', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  URGENT: { label: 'Urgent', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', dot: '#ef4444' }
};

export default function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || {
    label: priority || 'Medium',
    bg: '#f8fafc',
    text: '#475569',
    border: '#e2e8f0',
    dot: '#94a3b8'
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 600,
      backgroundColor: config.bg,
      color: config.text,
      border: `1px solid ${config.border}`
    }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: config.dot
      }} />
      {config.label}
    </span>
  );
}
