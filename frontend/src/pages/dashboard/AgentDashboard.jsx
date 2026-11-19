import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import SlaTimer from '../../components/common/SlaTimer';
import EmptyState from '../../components/common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  Headphones,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserCheck,
  Inbox,
  ArrowRight,
  Flame
} from 'lucide-react';

export default function AgentDashboard({ stats, recentRequests }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'assigned_me', 'unassigned'

  const summary = stats?.summary || {};
  const priorityCounts = stats?.priorityCounts || {};

  // Filter recent requests according to active tab
  const filteredRequests = (recentRequests || []).filter(req => {
    if (activeTab === 'assigned_me') return req.assignedToId === user?.id;
    if (activeTab === 'unassigned') return !req.assignedToId;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Department Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Headphones size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Support Queue
              </h1>
              {user?.department?.name && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {user.department.name} ({user.department.code})
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Triage and resolve service requests scoped strictly to your department.
            </p>
          </div>
        </div>

        <Link to="/requests" className="btn btn-secondary">
          <span>View Full Ticket Queue</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* SLA Alert Banner if tickets are overdue */}
      {summary.overdue > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          color: '#991b1b'
        }}>
          <Flame size={20} style={{ color: '#ef4444' }} />
          <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
            <strong>Action Required:</strong> {summary.overdue} active department ticket{summary.overdue > 1 ? 's have' : ' has'} breached or exceeded the SLA resolution deadline.
          </div>
          <Link
            to="/requests?status=IN_PROGRESS"
            style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b91c1c', textDecoration: 'underline' }}
          >
            Review Overdue
          </Link>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Department Total</span>
            <Inbox size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div className="stat-value">{summary.totalRequests || 0}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Pending / Unassigned</span>
            <UserCheck size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-value" style={{ color: '#b45309' }}>
            {summary.pending || 0}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">In Progress</span>
            <Clock size={20} style={{ color: '#6366f1' }} />
          </div>
          <div className="stat-value">{summary.inProgress || 0}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Resolved</span>
            <CheckCircle size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: '#15803d' }}>
            {summary.resolved || 0}
          </div>
        </div>
      </div>

      {/* Priority Summary Pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        padding: '14px 18px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px'
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
          Active Priorities in Department:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600 }}>
            URGENT: {priorityCounts.URGENT || 0}
          </span>
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 600 }}>
            HIGH: {priorityCounts.HIGH || 0}
          </span>
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
            MEDIUM: {priorityCounts.MEDIUM || 0}
          </span>
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 600, border: '1px solid #e2e8f0' }}>
            LOW: {priorityCounts.LOW || 0}
          </span>
        </div>
      </div>

      {/* Ticket Queue List */}
      <div className="card">
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Department Ticket Stream
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Select a ticket to assign, update progress, or add discussion notes
            </p>
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '3px'
          }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: activeTab === 'all' ? 600 : 500,
                backgroundColor: activeTab === 'all' ? '#ffffff' : 'transparent',
                color: activeTab === 'all' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              All Department
            </button>
            <button
              onClick={() => setActiveTab('assigned_me')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: activeTab === 'assigned_me' ? 600 : 500,
                backgroundColor: activeTab === 'assigned_me' ? '#ffffff' : 'transparent',
                color: activeTab === 'assigned_me' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'assigned_me' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => setActiveTab('unassigned')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: activeTab === 'unassigned' ? 600 : 500,
                backgroundColor: activeTab === 'unassigned' ? '#ffffff' : 'transparent',
                color: activeTab === 'unassigned' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'unassigned' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Unassigned Queue
            </button>
          </div>
        </div>

        {filteredRequests.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Requester & Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>SLA Deadline</th>
                  <th>Assigned Agent</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(req => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/requests/${req.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: '#2563eb' }}>
                      {req.ticketNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{req.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        By {req.createdBy?.fullName || 'Requester'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {req.category?.name || 'General'}
                    </td>
                    <td>
                      <StatusBadge status={req.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td>
                      <SlaTimer
                        dueDate={req.slaDueDate}
                        isBreached={req.isSlaBreached}
                        status={req.status}
                      />
                    </td>
                    <td>
                      {req.assignedTo ? (
                        <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#1e293b' }}>
                          {req.assignedTo.fullName}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600, backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No tickets found"
            description="There are currently no tickets matching the selected filter."
          />
        )}
      </div>
    </div>
  );
}
