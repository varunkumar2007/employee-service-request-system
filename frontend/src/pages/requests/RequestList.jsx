import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import SlaTimer from '../../components/common/SlaTimer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  PlusCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';

export default function RequestList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state initialized from URL query params or defaults
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    categoryId: searchParams.get('categoryId') || '',
    page: parseInt(searchParams.get('page') || '1', 10)
  });

  // Load available categories for filter dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/categories');
        if (res?.data?.categories) {
          setCategories(res.data.categories);
        }
      } catch (err) {
        console.error('Failed to load categories for filter:', err);
      }
    }
    loadCategories();
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: filters.page,
        limit: 10,
        search: filters.search || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        categoryId: filters.categoryId || undefined
      };

      const res = await api.get('/requests', params);
      if (res?.data) {
        setRequests(res.data.requests || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError(err.message || 'Failed to load service requests');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to page 1 on filter changes
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      categoryId: '',
      page: 1
    });
  };

  const hasActiveFilters = Boolean(filters.search || filters.status || filters.priority || filters.categoryId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
            {user?.role === 'EMPLOYEE' ? 'My Service Requests' : 'Service Requests'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            {user?.role === 'EMPLOYEE'
              ? 'View and manage all requests submitted by you.'
              : user?.role === 'SUPPORT_AGENT'
              ? 'Manage and resolve tickets within your department queue.'
              : 'Global service desk management across all organization departments.'}
          </p>
        </div>

        {['EMPLOYEE', 'ADMIN'].includes(user?.role) && (
          <Link to="/requests/new" className="btn btn-primary">
            <PlusCircle size={16} />
            <span>New Request</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', gridColumn: 'span 2' }} className="search-field">
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by ticket #, title, or requester..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              aria-label="Filter by Priority"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              aria-label="Filter by Category"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.department?.code || ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                color: '#64748b',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={12} />
              Reset active filters
            </button>
          </div>
        )}
      </div>

      {/* Request Table / List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner message="Retrieving requests..." />
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#ef4444' }}>
            <p style={{ fontWeight: 600 }}>{error}</p>
            <button onClick={fetchRequests} className="btn btn-secondary" style={{ marginTop: '12px' }}>
              Retry
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '24px' }}>
            <EmptyState
              title={hasActiveFilters ? 'No matching tickets' : 'No requests found'}
              description={
                hasActiveFilters
                  ? 'No tickets match your filter criteria. Try resetting filters.'
                  : user?.role === 'EMPLOYEE'
                  ? 'You haven\'t submitted any requests yet.'
                  : 'There are currently no tickets in this queue.'
              }
              action={
                hasActiveFilters ? (
                  <button onClick={handleResetFilters} className="btn btn-secondary">
                    Clear Filters
                  </button>
                ) : ['EMPLOYEE', 'ADMIN'].includes(user?.role) ? (
                  <Link to="/requests/new" className="btn btn-primary">
                    <PlusCircle size={14} />
                    Create New Request
                  </Link>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Title & Requester</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA Countdown</th>
                    <th>Assigned Agent</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr
                      key={req.id}
                      onClick={() => navigate(`/requests/${req.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>
                        {req.ticketNumber}
                      </td>
                      <td style={{ minWidth: '220px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{req.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          By {req.createdBy?.fullName || 'Requester'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#334155' }}>
                          {req.category?.name || 'General'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {req.category?.department?.name || ''}
                        </div>
                      </td>
                      <td>
                        <PriorityBadge priority={req.priority} />
                      </td>
                      <td>
                        <StatusBadge status={req.status} />
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
                      <td style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              fontSize: '0.85rem',
              color: '#64748b'
            }}>
              <div>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: pagination.page <= 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={14} />
                  Previous
                </button>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .search-field {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
