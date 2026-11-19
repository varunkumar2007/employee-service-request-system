import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import SlaTimer from '../../components/common/SlaTimer';
import EmptyState from '../../components/common/EmptyState';
import {
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  Clock,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Layers
} from 'lucide-react';

export default function AdminDashboard({ stats, recentRequests }) {
  const navigate = useNavigate();

  const summary = stats?.summary || {};
  const priorityCounts = stats?.priorityCounts || {};
  const categoryCounts = stats?.categoryCounts || {};
  const performance = stats?.performance || {};

  const total = summary.totalRequests || 0;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            backgroundColor: '#f3e8ff',
            color: '#9333ea',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
              Company-Wide Executive Overview
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              Global ticket volume, SLA compliance health, and cross-departmental operations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/admin/departments" className="btn btn-secondary">
            <span>Manage SLA & Depts</span>
          </Link>
          <Link to="/requests" className="btn btn-primary">
            <span>All System Tickets</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Total Company Requests</span>
            <Layers size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div className="stat-value">{total}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">SLA Compliance Rate</span>
            <TrendingUp size={20} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: performance.slaComplianceRate >= 90 ? '#10b981' : '#f59e0b' }}>
            {performance.slaComplianceRate !== undefined ? `${performance.slaComplianceRate}%` : '100%'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Based on {performance.resolvedTicketsCount || 0} resolved tickets
          </span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Avg. Resolution Time</span>
            <Clock size={20} style={{ color: '#6366f1' }} />
          </div>
          <div className="stat-value">
            {performance.averageResolutionTimeHours !== undefined ? `${performance.averageResolutionTimeHours}h` : '0h'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            From ticket creation to resolution
          </span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Overdue Breaches</span>
            <AlertOctagon size={20} style={{ color: '#ef4444' }} />
          </div>
          <div className="stat-value" style={{ color: summary.overdue > 0 ? '#ef4444' : '#0f172a' }}>
            {summary.overdue || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: summary.overdue > 0 ? '#ef4444' : '#64748b' }}>
            {summary.overdue > 0 ? 'Active tickets past SLA deadline' : 'Zero overdue tickets'}
          </span>
        </div>
      </div>

      {/* Two-Column Analytics Breakdown: Status & Categories */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Status Lifecycle Distribution */}
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
            Status Lifecycle Distribution
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Pending Triage', count: summary.pending || 0, color: '#f59e0b', bg: '#fef3c7' },
              { label: 'Assigned', count: summary.assigned || 0, color: '#0284c7', bg: '#e0f2fe' },
              { label: 'In Progress', count: summary.inProgress || 0, color: '#4f46e5', bg: '#e0e7ff' },
              { label: 'Resolved', count: summary.resolved || 0, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Closed', count: summary.closed || 0, color: '#475569', bg: '#f1f5f9' },
              { label: 'Rejected', count: summary.rejected || 0, color: '#dc2626', bg: '#fee2e2' }
            ].map(item => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>
                    <span style={{ color: '#334155' }}>{item.label}</span>
                    <span style={{ color: '#64748b' }}>{item.count} ({pct}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: item.color, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown & Priorities */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '16px' }}>
              Category Volume
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.keys(categoryCounts).length > 0 ? (
                Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500, marginBottom: '4px' }}>
                        <span style={{ color: '#334155' }}>{cat}</span>
                        <span style={{ color: '#64748b' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: '#2563eb', borderRadius: '4px' }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No category data available</p>
              )}
            </div>
          </div>

          {/* Priority Pills */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '8px' }}>
              Global Priority Distribution:
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>LOW</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{priorityCounts.LOW || 0}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 600 }}>MEDIUM</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1d4ed8' }}>{priorityCounts.MEDIUM || 0}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
                <div style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 600 }}>HIGH</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#b45309' }}>{priorityCounts.HIGH || 0}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '6px', borderRadius: '6px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.65rem', color: '#b91c1c', fontWeight: 600 }}>URGENT</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#b91c1c' }}>{priorityCounts.URGENT || 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Global Requests */}
      <div className="card">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Recent Company Tickets
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Live audit stream of service tickets across all company departments
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
            All Requests Table
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentRequests && recentRequests.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Title & Requester</th>
                  <th>Department / Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>SLA Deadline</th>
                  <th>Assigned Agent</th>
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
                        By {req.createdBy?.fullName || 'User'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#334155' }}>
                        {req.category?.name || 'General'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {req.category?.department?.name || ''}
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
            title="No tickets created yet"
            description="No service requests have been submitted in the company yet."
          />
        )}
      </div>
    </div>
  );
}
