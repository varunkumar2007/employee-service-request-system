import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Menu, Bell, LogOut, CheckCheck, ExternalLink, Clock } from 'lucide-react';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotifications = () => {
    setShowNotifMenu(prev => !prev);
    if (!showNotifMenu) {
      fetchNotifications(1, 5); // Fetch top 5 recent notifications
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setShowNotifMenu(false);
    const targetRequestId = notif.requestId || notif.request?.id;
    if (targetRequestId) {
      navigate(`/requests/${targetRequestId}`);
    }
  };

  return (
    <header style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 30
    }}>
      {/* Left side: Hamburger button for mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569'
          }}
          className="mobile-menu-btn"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>
          Welcome, {user?.fullName || 'User'}
        </span>
      </div>

      {/* Right side: Notifications & User profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={handleOpenNotifications}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: showNotifMenu ? '#eff6ff' : '#ffffff',
              color: showNotifMenu ? '#2563eb' : '#475569'
            }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Quick Dropdown */}
          {showNotifMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              marginTop: '8px',
              width: '340px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              zIndex: 100,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc'
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCheck size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 5).map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: notif.isRead ? '#ffffff' : '#f0fdf4',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = notif.isRead ? '#f8fafc' : '#e6f7ec'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notif.isRead ? '#ffffff' : '#f0fdf4'}
                    >
                      <div style={{ fontWeight: notif.isRead ? 500 : 700, fontSize: '0.8rem', color: '#1e293b', marginBottom: '2px' }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} />
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{
                padding: '10px 16px',
                borderTop: '1px solid #f1f5f9',
                textAlign: 'center',
                backgroundColor: '#f8fafc'
              }}>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifMenu(false)}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#2563eb',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none'
                  }}
                >
                  View all notifications
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Pill & Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingLeft: '8px',
          borderLeft: '1px solid #e2e8f0'
        }}>
          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '0.8125rem',
              fontWeight: 600
            }}
            title="Log out"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
