import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no items matching your criteria at this time.',
  action = null
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px dashed #cbd5e1',
      margin: '20px 0'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        marginBottom: '16px'
      }}>
        <Inbox size={24} />
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 16px 0', maxWidth: '360px' }}>
        {description}
      </p>
      {action}
    </div>
  );
}
