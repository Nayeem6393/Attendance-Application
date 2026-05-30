import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Mail, ArrowLeft, KeyRound, Sun, Moon } from 'lucide-react';

export const ForgotPassword = () => {
  const { theme, toggleTheme } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
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
        
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--primary-glow)',
            border: '1px solid var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 10px var(--primary-glow)',
          }}
        >
          <KeyRound size={26} color="var(--primary)" />
        </div>

        {submitted ? (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '12px' }}>
              Reset Link Sent!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              We have dispatched a secure password recovery instruction set to <b>{email}</b>. Please inspect your inbox and spam folders.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', minHeight: '44px' }}>
              Back to Login Portal
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, marginBottom: '6px' }}>
              Recover Password
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '28px' }}>
              Enter your email to receive recovery instructions
            </p>

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Company Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={16}
                    color="var(--text-secondary)"
                    style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="email"
                    className="form-control"
                    style={{ paddingLeft: '44px', minHeight: '44px' }}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '16px', minHeight: '44px' }}>
                Dispatch Reset Instructions
              </button>
            </form>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                marginTop: '10px',
                minHeight: '44px'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Login</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
