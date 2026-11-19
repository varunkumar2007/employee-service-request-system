import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmployeeDashboard from './EmployeeDashboard';
import AgentDashboard from './AgentDashboard';
import AdminDashboard from './AdminDashboard';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, requestsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/requests', { page: 1, limit: 6 })
      ]);

      if (statsRes?.data) {
        setStats(statsRes.data);
      }
      if (requestsRes?.data?.requests) {
        setRecentRequests(requestsRes.data.requests);
      }
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <LoadingSpinner message="Loading dashboard analytics & ticket stream..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        maxWidth: '500px',
        margin: '40px auto',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #fecaca',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px'
        }}>
          <AlertCircle size={24} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
          Unable to Load Dashboard
        </h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
          {error}
        </p>
        <button
          onClick={fetchDashboardData}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} />
          Retry Connection
        </button>
      </div>
    );
  }

  switch (user?.role) {
    case 'ADMIN':
      return <AdminDashboard stats={stats} recentRequests={recentRequests} />;
    case 'SUPPORT_AGENT':
      return <AgentDashboard stats={stats} recentRequests={recentRequests} />;
    default:
      return <EmployeeDashboard stats={stats} recentRequests={recentRequests} />;
  }
}
