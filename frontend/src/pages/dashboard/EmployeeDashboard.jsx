import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import SlaTimer from '../../components/common/SlaTimer';
import EmptyState from '../../components/common/EmptyState';
import { PlusCircle, Clock, AlertTriangle, CheckCircle, Ticket, ArrowRight } from 'lucide-react';

export default function EmployeeDashboard({ stats, recentRequests }) {
  const navigate = useNavigate();
  const summary = stats?.summary || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner */}
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
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            Employee Service Portal
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            Track your submitted requests and request assistance from internal support departments.
          </p>
        </div>
        <Link to="/requests/new" className="btn btn-primary">
          <PlusCircle size={16} />
          <span>New Service Request</span>
        </Link>
      </div>

      {/* KPI Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Total Requests</span>
            <Ticket size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div className="stat-value">{summary.totalRequests || 0}</div>
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
          <div className="stat-value">{summary.resolved || 0}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Overdue / SLA Alerts</span>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          </div>
          <div className="stat-value" style={{ color: summary.overdue > 0 ? '#ef4444' : '#0f172a' }}>
            {summary.overdue || 0}
          </div>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Recent Requests
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Your most recent service requests
            </p>
          </div>
          <Link
            to="/requests"
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            View all requests
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentRequests && recentRequests.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Title & Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>SLA Deadline</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map(req => (
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
                        {req.category?.name || 'General'}
                      </div>
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
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No service requests yet"
            description="You haven't submitted any service requests yet. If you need equipment, IT access, or HR support, create a new request."
            action={
              <Link to="/requests/new" className="btn btn-primary">
                <PlusCircle size={14} />
                Create First Request
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
