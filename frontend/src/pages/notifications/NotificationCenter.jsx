import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  Ticket,
  ArrowRight,
  Filter,
  AlertCircle
} from 'lucide-react';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    pagination,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const [filterUnread, setFilterUnread] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchNotifications(currentPage, 20, filterUnread);
  }, [fetchNotifications, currentPage, filterUnread]);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    if (notif.requestId) {
      navigate(`/requests/${notif.requestId}`);
    }
  };

  const handleFilterToggle = (showOnlyUnread) => {
    setFilterUnread(showOnlyUnread);
    setCurrentPage(1);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
            <Bell size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  border: '1px solid #fecaca'
                }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '3px 0 0 0' }}>
              Stay updated on ticket assignments, status changes, discussion comments, and SLA alerts.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCheck size={16} />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '8px 16px'
      }}>
        <div style={{ display: 'inline-flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          <button
            onClick={() => handleFilterToggle(false)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: !filterUnread ? 600 : 500,
              backgroundColor: !filterUnread ? '#ffffff' : 'transparent',
              color: !filterUnread ? '#0f172a' : '#64748b',
              boxShadow: !filterUnread ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            All Notifications
          </button>
          <button
            onClick={() => handleFilterToggle(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.825rem',
              fontWeight: filterUnread ? 600 : 500,
              backgroundColor: filterUnread ? '#ffffff' : 'transparent',
              color: filterUnread ? '#0f172a' : '#64748b',
              boxShadow: filterUnread ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              cursor: 'pointer'
            }}
          >
            Unread Only {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
          Total: {pagination.total || notifications.length}
        </span>
      </div>

      {/* Notifications List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0' }}>
            <LoadingSpinner message="Fetching notifications..." />
          </div>
        ) : error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 8px auto' }} />
            <p style={{ fontWeight: 600 }}>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '32px 16px' }}>
            <EmptyState
              title={filterUnread ? 'No unread notifications' : 'All caught up!'}
              description={
                filterUnread
                  ? 'You have read all your notifications. Switch to "All Notifications" to see past history.'
                  : 'You have no alerts or notifications in your activity feed.'
              }
              action={
                filterUnread ? (
                  <button onClick={() => handleFilterToggle(false)} className="btn btn-secondary">
                    View All Notifications
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((notif, index) => {
              const isUnread = !notif.isRead;
              const hasTicket = Boolean(notif.request || notif.requestId);
              const isBreachAlert = notif.title.toLowerCase().includes('breach');
              const isWarnAlert = notif.title.toLowerCase().includes('warning');

              return (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px 20px',
                    backgroundColor: isUnread ? '#f8fafc' : '#ffffff',
                    borderBottom: index < notifications.length - 1 ? '1px solid #f1f5f9' : 'none',
                    borderLeft: isUnread ? `4px solid ${isBreachAlert ? '#ef4444' : isWarnAlert ? '#f59e0b' : '#2563eb'}` : '4px solid transparent',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isUnread ? '#f1f5f9' : '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isUnread ? '#f8fafc' : '#ffffff'}
                >
                  {/* Left: Content and metadata */}
                  <div
                    onClick={() => handleNotificationClick(notif)}
                    style={{ flex: 1, cursor: hasTicket ? 'pointer' : 'default' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: isUnread ? 700 : 600,
                        color: isBreachAlert ? '#b91c1c' : isWarnAlert ? '#b45309' : '#0f172a'
                      }}>
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          display: 'inline-block'
                        }} />
                      )}
                    </div>

                    <p style={{
                      fontSize: '0.85rem',
                      color: '#475569',
                      lineHeight: 1.45,
                      margin: '0 0 8px 0'
                    }}>
                      {notif.message}
                    </p>

                    {/* Associated Ticket Info Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {notif.request && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          <Ticket size={12} />
                          <span>{notif.request.ticketNumber}</span>
                          {notif.request.status && (
                            <span style={{ marginLeft: '4px' }}>
                              <StatusBadge status={notif.request.status} />
                            </span>
                          )}
                        </div>
                      )}

                      <span style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={12} />
                        {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
                        at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notif.id);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#475569',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                        title="Mark as read"
                      >
                        <Check size={12} />
                        <span>Mark read</span>
                      </button>
                    )}

                    {hasTicket && (
                      <button
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#ffffff',
                          color: '#2563eb',
                          cursor: 'pointer'
                        }}
                        title="Open ticket details"
                      >
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
