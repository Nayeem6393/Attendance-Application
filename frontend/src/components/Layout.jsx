import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  MapPin,
  Settings,
  FileSpreadsheet,
  User,
  Calendar,
  LogOut,
  Menu,
  X,
  ScanFace,
  Clock,
  Sun,
  Moon
} from 'lucide-react';

export const Layout = ({ children }) => {
  const { user, logoutUser, theme, toggleTheme } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  // Define sidebar navigation items based on User Role
  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Pending Approvals', path: '/admin/approvals', icon: CheckSquare },
    { name: 'Live Tracking', path: '/admin/tracking', icon: MapPin },
    { name: 'Rule Settings', path: '/admin/settings', icon: Settings },
    { name: 'Reports Export', path: '/admin/reports', icon: FileSpreadsheet },
    { name: 'My Profile', path: '/admin/profile', icon: User },
  ];

  const employeeLinks = [
    { name: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'Biometric Enroll', path: '/employee/enroll', icon: ScanFace },
    { name: 'Mark Attendance', path: '/employee/mark', icon: Clock },
    { name: 'History Records', path: '/employee/history', icon: Calendar },
    { name: 'My Profile', path: '/employee/profile', icon: User },
  ];

  const links = user.role === 'admin' ? adminLinks : employeeLinks;

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <div className="app-container">
      {/* Mobile Toggle Navbar */}
      <div
        className="glass-panel"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 1200,
          borderRadius: 0,
          borderWidth: '0 0 1px 0',
        }}
        id="mobile-nav-toggle"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ScanFace color="#6366f1" size={24} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>ATTEND</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px',
              minHeight: '44px',
              minWidth: '44px',
              color: 'var(--text-primary)'
            }}
            aria-label="Toggle Theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#6366f1" />}
          </button>

          <button
            onClick={toggleMobileSidebar}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '44px',
              minWidth: '44px'
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          #mobile-nav-toggle {
            display: flex !important;
          }
          .sidebar {
            transform: translateX(${mobileOpen ? '0' : '-100%'});
            padding-top: 80px;
          }
        }
      `}</style>

      {/* Overlay Backdrop for Mobile Drawer */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(false)}
      ></div>

      {/* Main Responsive Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <ScanFace size={30} color="#6366f1" style={{ filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }} />
          <span>ATTEND<b>SYS</b></span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={18} />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          {/* User Brief card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              background: 'rgba(255,255,255,0.03)',
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: user.role === 'admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: '#fff',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  color: 'var(--text-primary)'
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {user.role === 'admin' ? 'Administrator' : user.employee_id}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="sidebar-link"
            style={{
              width: '100%',
              background: 'rgba(239, 68, 68, 0.05)',
              border: '1px solid rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              cursor: 'pointer',
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minHeight: '44px'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Primary Page Canvas Shell */}
      <main className="main-content">
        {/* General Top Header */}
        <header className="topbar">
          <div className="page-title">
            <h1 style={{ fontFamily: 'var(--font-display)' }}>
              {location.pathname.includes('/dashboard') && `Welcome Back, ${user.name}`}
              {location.pathname.includes('/employees') && 'Employee Base'}
              {location.pathname.includes('/approvals') && 'Pending Approvals'}
              {location.pathname.includes('/tracking') && 'Live Attendance Tracker'}
              {location.pathname.includes('/settings') && 'Attendance Window Rules'}
              {location.pathname.includes('/reports') && 'Telemetry Reports Export'}
              {location.pathname.includes('/mark') && 'Biometric Verification Check-in'}
              {location.pathname.includes('/enroll') && 'Biometric Face ID Enrollment'}
              {location.pathname.includes('/history') && 'Attendance Logs'}
              {location.pathname.includes('/profile') && (user.role === 'admin' ? 'Administrator Profile' : 'Employee Profile')}
            </h1>
            <p>
              {user.role === 'admin' ? 'Administrator Console' : `Employee Workspace (Department: ${user.department || 'N/A'})`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Desktop Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{
                width: '40px',
                height: '40px',
                minHeight: '40px',
                borderRadius: '50%',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderColor: 'var(--border-card)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
              }}
              aria-label="Toggle Theme"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#6366f1" />}
            </button>

            <div
              className="user-profile-badge glass-panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: user.status === 'active' ? 'var(--status-present)' : 'var(--status-late)',
                  boxShadow: user.status === 'active' ? '0 0 8px var(--status-present)' : '0 0 8px var(--status-late)',
                }}
              ></span>
              <span style={{ textTransform: 'capitalize' }}>
                {user.role}: {user.status}
              </span>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
};

export default Layout;
