import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', size = 28 }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      color: '#64748b'
    }}>
      <Loader2 size={size} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
      {message && <p style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 500 }}>{message}</p>}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
