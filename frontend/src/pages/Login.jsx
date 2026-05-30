import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ScanFace, Mail, Lock, ShieldAlert, Sun, Moon } from 'lucide-react';

export const Login = () => {
  const { user, loginUser, loading, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Protect route: Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!loginIdentifier || !password) {
      setError('Please fill in all credentials.');
      setIsSubmitting(false);
      return;
    }

    try {
      const loggedUser = await loginUser(loginIdentifier, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Incorrect email/mobile or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ position: 'relative' }}>
      {/* Floating Theme Toggle */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <button
          onClick={toggleTheme}
          type="button"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            color: 'var(--text-primary)'
          }}
          aria-label="Toggle Theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} color="#f59e0b" /> : <Moon size={20} color="#6366f1" />}
        </button>
      </div>

      <div className="auth-card glass-panel" style={{ textAlign: 'center' }}>
        
        {/* Holographic glowing emblem */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            border: '2px solid var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 20px var(--primary)',
            animation: 'pulse 2s infinite',
          }}
        >
          <ScanFace size={32} color="var(--primary)" />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 15px var(--primary-glow); }
            50% { transform: scale(1.05); box-shadow: 0 0 25px var(--primary); }
          }
        `}</style>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '6px' }}>
          ATTEND<b>SYS</b>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px' }}>
          Attendance Portal & Security Gateway
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--status-absent)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '0.85rem',
              color: 'var(--status-absent)',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textAlign: 'left',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          
          <div className="form-group">
            <label className="form-label">Email or Mobile Number</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '44px', minHeight: '44px' }}
                placeholder="e.g. admin@example.com or 9876543210"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '44px', minHeight: '44px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', minHeight: '44px' }} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                <span>Securing Gate...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Are you a new Employee?
          </p>
          <Link
            to="/register"
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '10px', fontSize: '0.9rem', minHeight: '44px' }}
          >
            Employee Registration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
