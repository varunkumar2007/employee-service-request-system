import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Bell,
  Building2,
  ShieldCheck,
  Headphones,
  User
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admin', icon: ShieldCheck, color: '#9333ea', bg: '#f3e8ff' };
      case 'SUPPORT_AGENT':
        return { label: 'Agent', icon: Headphones, color: '#2563eb', bg: '#eff6ff' };
      default:
        return { label: 'Employee', icon: User, color: '#059669', bg: '#ecfdf5' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['EMPLOYEE', 'SUPPORT_AGENT', 'ADMIN']
    },
    {
      to: '/requests',
      label: user?.role === 'EMPLOYEE' ? 'My Requests' : 'All Requests',
      icon: Ticket,
      roles: ['EMPLOYEE', 'SUPPORT_AGENT', 'ADMIN']
    },
    {
      to: '/requests/new',
      label: 'Create Request',
      icon: PlusCircle,
      roles: ['EMPLOYEE', 'ADMIN']
    },
    {
      to: '/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['EMPLOYEE', 'SUPPORT_AGENT', 'ADMIN'],
      badge: unreadCount > 0 ? unreadCount : null
    },
    {
      to: '/admin/departments',
      label: 'Departments & SLA',
      icon: Building2,
      roles: ['ADMIN']
    }
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            zIndex: 40,
            display: 'block'
          }}
        />
      )}

      <aside style={{
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease-in-out'
      }} className="sidebar-container">
        {/* Brand header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            ES
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
              ServiceDesk
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Internal Request Portal
            </div>
          </div>
        </div>

        {/* User Card */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: roleInfo.bg,
            color: roleInfo.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RoleIcon size={18} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.fullName || 'User'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: roleInfo.color,
                backgroundColor: roleInfo.bg,
                padding: '1px 6px',
                borderRadius: '4px'
              }}>
                {roleInfo.label}
              </span>
              {user?.department?.code && (
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  • {user.department.code}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {allowedItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#2563eb' : '#475569',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          v1.0.0 • Employee Service System
        </div>
      </aside>

      <style>{`
        @media (min-width: 1024px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
}
