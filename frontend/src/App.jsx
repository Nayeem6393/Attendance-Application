import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';

// Public Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';

// Employee Pages
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import FaceIdEnrollment from './pages/FaceIdEnrollment.jsx';
import MarkAttendance from './pages/MarkAttendance.jsx';
import AttendanceHistory from './pages/AttendanceHistory.jsx';
import Profile from './pages/Profile.jsx';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard.jsx';
import EmployeeManagement from './pages/EmployeeManagement.jsx';
import PendingApprovals from './pages/PendingApprovals.jsx';
import AttendanceTracking from './pages/AttendanceTracking.jsx';
import AttendanceSettings from './pages/AttendanceSettings.jsx';
import ReportsExport from './pages/ReportsExport.jsx';

// Centered Loading Spinner component
const LoadingScreen = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0c1222' }}>
    <div className="spinner" style={{ width: '48px', height: '48px', marginBottom: '16px' }}></div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'monospace' }}>SECURING PROTOCOLS...</div>
  </div>
);

// Route Guards
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? <Layout>{children}</Layout> : <Navigate to="/employee/dashboard" replace />;
};

const EmployeeRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'employee' ? <Layout>{children}</Layout> : <Navigate to="/admin/dashboard" replace />;
};

// Root index redirect router
const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/employee/dashboard" replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Gateways */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Secure Employee Subspaces */}
          <Route path="/employee/dashboard" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
          <Route path="/employee/enroll" element={<EmployeeRoute><FaceIdEnrollment /></EmployeeRoute>} />
          <Route path="/employee/mark" element={<EmployeeRoute><MarkAttendance /></EmployeeRoute>} />
          <Route path="/employee/history" element={<EmployeeRoute><AttendanceHistory /></EmployeeRoute>} />
          <Route path="/employee/profile" element={<EmployeeRoute><Profile /></EmployeeRoute>} />

          {/* Secure Admin Control Rooms */}
          <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/employees" element={<AdminRoute><EmployeeManagement /></AdminRoute>} />
          <Route path="/admin/approvals" element={<AdminRoute><PendingApprovals /></AdminRoute>} />
          <Route path="/admin/tracking" element={<AdminRoute><AttendanceTracking /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AttendanceSettings /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><ReportsExport /></AdminRoute>} />
          <Route path="/admin/profile" element={<AdminRoute><Profile /></AdminRoute>} />

          {/* Fallback Catch-all redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
