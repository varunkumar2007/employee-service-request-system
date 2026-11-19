import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import SlaTimer from '../../components/common/SlaTimer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Clock,
  User,
  Building,
  Tag,
  Send,
  Lock,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  History,
  MessageSquare,
  ShieldAlert,
  Trash2,
  Edit3,
  UserCheck
} from 'lucide-react';

export default function RequestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' or 'audit'

  // Action states
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Edit title/description modal state (Employee pending only)
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Reopen modal state
  const [isReopening, setIsReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const fetchRequestDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/requests/${id}`);
      if (res?.data?.request) {
        setRequest(res.data.request);
        setEditTitle(res.data.request.title);
        setEditDesc(res.data.request.description);
      }
    } catch (err) {
      console.error('Failed to load request details:', err);
      setError(err.message || 'Unable to retrieve ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  // Handle adding a comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentSubmitting(true);
    setActionError(null);
    try {
      await api.post(`/requests/${request.id}/comments`, {
        message: newComment.trim(),
        content: newComment.trim(),
        isInternal: Boolean(isInternalNote)
      });
      setNewComment('');
      setIsInternalNote(false);
      await fetchRequestDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Handle status update
  const handleStatusChange = async (newStatus) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await api.patch(`/requests/${request.id}/status`, {
        status: newStatus
      });
      setActionSuccess(`Ticket status updated to ${newStatus}`);
      await fetchRequestDetails();
    } catch (err) {
      setActionError(err.message || `Failed to update status to ${newStatus}`);
    }
  };

  // Handle self-assignment by Agent or assignment by Admin
  const handleSelfAssign = async () => {
    setActionError(null);
    try {
      await api.patch(`/requests/${request.id}/assign`, {
        assignedToId: user.id
      });
      setActionSuccess('Ticket assigned to you successfully');
      await fetchRequestDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to assign ticket.');
    }
  };

  // Handle reopening ticket
  const handleReopenTicket = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) {
      setActionError('Please provide a reason for reopening this ticket.');
      return;
    }

    setActionError(null);
    try {
      await api.patch(`/requests/${request.id}/reopen`, {
        reason: reopenReason.trim()
      });
      setIsReopening(false);
      setReopenReason('');
      setActionSuccess('Ticket reopened and returned to In Progress queue.');
      await fetchRequestDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to reopen ticket.');
    }
  };

  // Handle employee editing pending ticket
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.patch(`/requests/${request.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim()
      });
      setIsEditing(false);
      setActionSuccess('Ticket updated successfully.');
      await fetchRequestDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to update ticket.');
    }
  };

  // Handle Admin soft delete
  const handleDeleteRequest = async () => {
    if (!window.confirm('Are you sure you want to soft delete this ticket? Only Admins can perform this action.')) {
      return;
    }

    try {
      await api.delete(`/requests/${request.id}`);
      navigate('/requests');
    } catch (err) {
      setActionError(err.message || 'Failed to delete request.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LoadingSpinner message="Loading ticket details..." />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center', padding: '32px' }} className="card">
        <ShieldAlert size={40} style={{ color: '#ef4444', margin: '0 auto 12px auto' }} />
        <h2 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '8px' }}>
          Access Denied or Not Found
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '20px' }}>
          {error || 'This request does not exist or you do not have permission to view it.'}
        </p>
        <button onClick={() => navigate('/requests')} className="btn btn-primary">
          Back to Requests
        </button>
      </div>
    );
  }

  // Permissions & Role Flags
  const isCreator = user?.id === request.createdById;
  const isAssignedAgent = user?.id === request.assignedToId;
  const isAgent = user?.role === 'SUPPORT_AGENT';
  const isAdmin = user?.role === 'ADMIN';
  const canManageTicket = isAdmin || (isAgent && request.category?.departmentId === user?.departmentId);

  // Can employee edit? Only creator while status is PENDING
  const canEditPending = isCreator && request.status === 'PENDING';

  // Can reopen? Only creator or Admin while status is RESOLVED or CLOSED
  const canReopen = (isCreator || isAdmin) && ['RESOLVED', 'CLOSED'].includes(request.status);

  // Allowed next status transitions
  const getAvailableStatusTransitions = () => {
    if (!canManageTicket) return [];
    switch (request.status) {
      case 'PENDING':
        return ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'];
      case 'ASSIGNED':
        return ['IN_PROGRESS'];
      case 'IN_PROGRESS':
        return ['RESOLVED'];
      case 'RESOLVED':
        return ['CLOSED'];
      default:
        return [];
    }
  };

  const nextTransitions = getAvailableStatusTransitions();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Action bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/requests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#475569'
            }}
            title="Back to list"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                {request.ticketNumber}
              </span>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
              Created on {new Date(request.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Employee edit pending */}
          {canEditPending && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn btn-secondary">
              <Edit3 size={14} />
              Edit Request
            </button>
          )}

          {/* Reopen button */}
          {canReopen && (
            <button
              onClick={() => setIsReopening(true)}
              className="btn btn-secondary"
              style={{ color: '#d97706', borderColor: '#fde68a', backgroundColor: '#fffbeb' }}
            >
              <RotateCcw size={14} />
              Reopen Request
            </button>
          )}

          {/* Agent Self-Assign */}
          {canManageTicket && !request.assignedToId && (
            <button onClick={handleSelfAssign} className="btn btn-secondary">
              <UserCheck size={14} />
              Assign to Myself
            </button>
          )}

          {/* Status Progression buttons */}
          {nextTransitions.map(st => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              className={st === 'RESOLVED' ? 'btn btn-success' : st === 'REJECTED' ? 'btn btn-danger' : 'btn btn-primary'}
            >
              Move to {st.replace('_', ' ')}
            </button>
          ))}

          {/* Admin soft delete */}
          {isAdmin && (
            <button
              onClick={handleDeleteRequest}
              className="btn btn-danger"
              title="Soft delete request"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Action alerts */}
      {actionError && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#166534', fontSize: '0.85rem' }}>
          {actionSuccess}
        </div>
      )}

      {/* Reopen Form Box */}
      {isReopening && (
        <div className="card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
            Reopen Service Request
          </h3>
          <p style={{ fontSize: '0.825rem', color: '#b45309', marginBottom: '12px' }}>
            Please explain why this issue requires further investigation. A new resolution SLA deadline will be assigned.
          </p>
          <form onSubmit={handleReopenTicket} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <textarea
              rows={3}
              placeholder="e.g. Issue recurred after restarting workstation..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsReopening(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ backgroundColor: '#d97706' }}
              >
                Confirm Reopen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Layout: 2 Columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Request Details & Tabs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Main Info Card */}
          <div className="card">
            {isEditing ? (
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Description</label>
                  <textarea
                    rows={5}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                  {request.title}
                </h2>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#334155',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9'
                }}>
                  {request.description}
                </div>
              </div>
            )}
          </div>

          {/* Discussion & Audit Trail Tabs */}
          <div className="card" style={{ padding: 0 }}>
            {/* Tab navigation */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}>
              <button
                onClick={() => setActiveTab('discussion')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: 'none',
                  backgroundColor: activeTab === 'discussion' ? '#ffffff' : 'transparent',
                  borderBottom: activeTab === 'discussion' ? '2px solid #2563eb' : 'none',
                  fontWeight: activeTab === 'discussion' ? 600 : 500,
                  color: activeTab === 'discussion' ? '#2563eb' : '#64748b',
                  fontSize: '0.875rem'
                }}
              >
                <MessageSquare size={16} />
                <span>Discussion ({request.comments?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  border: 'none',
                  backgroundColor: activeTab === 'audit' ? '#ffffff' : 'transparent',
                  borderBottom: activeTab === 'audit' ? '2px solid #2563eb' : 'none',
                  fontWeight: activeTab === 'audit' ? 600 : 500,
                  color: activeTab === 'audit' ? '#2563eb' : '#64748b',
                  fontSize: '0.875rem'
                }}
              >
                <History size={16} />
                <span>Audit Timeline ({request.activities?.length || 0})</span>
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: '20px' }}>
              {activeTab === 'discussion' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Comments list */}
                  {request.comments?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                      No comments or notes posted yet. Start the conversation below.
                    </div>
                  ) : (
                    request.comments?.map(comment => {
                      const isInternal = comment.isInternal;
                      return (
                        <div
                          key={comment.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '10px',
                            backgroundColor: isInternal ? '#fefce8' : '#f8fafc',
                            border: `1px solid ${isInternal ? '#fef08a' : '#e2e8f0'}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0f172a' }}>
                                {comment.author?.fullName || 'User'}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#e2e8f0',
                                color: '#475569'
                              }}>
                                {comment.author?.role}
                              </span>
                              {isInternal && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#fde047',
                                  color: '#713f12'
                                }}>
                                  <Lock size={10} />
                                  INTERNAL NOTE
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {comment.message || comment.content}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Comment Input Box */}
                  <form onSubmit={handleAddComment} style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {actionError && (
                      <div style={{
                        padding: '10px 14px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#b91c1c',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertCircle size={14} />
                        <span>{actionError}</span>
                      </div>
                    )}
                    <textarea
                      rows={3}
                      placeholder={isInternalNote ? 'Write an internal note (visible only to Agents & Admins)...' : 'Write a public comment for requester and support staff...'}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      style={{
                        backgroundColor: isInternalNote ? '#fffbeb' : '#ffffff',
                        borderColor: isInternalNote ? '#fde68a' : '#cbd5e1'
                      }}
                      required
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      {/* Internal Note Toggle: strictly visible to Agents and Admins only */}
                      {canManageTicket ? (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#713f12', cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={isInternalNote}
                            onChange={(e) => setIsInternalNote(e.target.checked)}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <Lock size={12} />
                          <span>Internal Staff Note (Hide from employee)</span>
                        </label>
                      ) : <div />}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={commentSubmitting || !newComment.trim()}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <Send size={14} />
                        <span>{commentSubmitting ? 'Posting...' : isInternalNote ? 'Post Internal Note' : 'Post Comment'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Audit Trail Timeline */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {request.activities?.map((act, index) => (
                    <div key={act.id || index} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <History size={14} />
                      </div>
                      <div style={{ flex: 1, paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>
                            {act.activityType.replace('_', ' ')}
                          </span>
                          <span style={{ color: '#94a3b8' }}>
                            {new Date(act.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          By {act.actor?.fullName || 'System'} ({act.actor?.role || 'SYSTEM'})
                        </div>
                        {(act.oldValue || act.newValue) && (
                          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '4px' }}>
                            {act.oldValue && <span>Prior: {act.oldValue} → </span>}
                            <span>Updated: {act.newValue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* SLA Tracking Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} style={{ color: '#2563eb' }} />
              Resolution SLA Tracking
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>SLA Target Status:</span>
                <SlaTimer
                  dueDate={request.slaDueDate}
                  isBreached={request.isSlaBreached}
                  status={request.status}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#64748b' }}>Target Deadline:</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                  {new Date(request.slaDueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              {request.resolvedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#64748b' }}>Resolved At:</span>
                  <span style={{ fontWeight: 600, color: '#15803d' }}>
                    {new Date(request.resolvedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Metadata Card */}
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
              Ticket Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Requester:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {request.createdBy?.fullName} ({request.createdBy?.email})
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Assigned Agent:</span>
                <span style={{ fontWeight: 600, color: request.assignedTo ? '#0f172a' : '#d97706' }}>
                  {request.assignedTo ? `${request.assignedTo.fullName} (${request.assignedTo.email})` : 'Unassigned'}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Department:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {request.category?.department?.name} ({request.category?.department?.code})
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Category:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                  {request.category?.name}
                </span>
              </div>

              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Priority:</span>
                <PriorityBadge priority={request.priority} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
