import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { UserPlus, ShieldCheck, Mail, Lock, Phone, User, Briefcase, Hash, Sun, Moon } from 'lucide-react';

export const Register = () => {
  const { registerUser, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    employee_id: '',
    department: '',
    designation: '',
    password: '',
    confirmPassword: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const departments = [
    'Engineering',
    'Human Resources',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Quality Assurance'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Consent check
    if (!consentChecked) {
      setError('You must provide biometric consent to register.');
      return;
    }

    // Field Validations
    if (
      !formData.name ||
      !formData.email ||
      !formData.mobile ||
      !formData.employee_id ||
      !formData.department ||
      !formData.designation ||
      !formData.password
    ) {
      setError('Please fill in all employee registration fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        employee_id: formData.employee_id,
        department: formData.department,
        designation: formData.designation,
        password: formData.password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ padding: '40px 20px', position: 'relative' }}>
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

      <div className="auth-card glass-panel" style={{ maxWidth: '640px', padding: '36px' }}>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '2px solid var(--status-present)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 15px var(--status-present-glow)'
              }}
            >
              <ShieldCheck size={36} color="var(--status-present)" />
            </div>
            
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '12px' }}>
              Registration Completed!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
              Your employee account has been created successfully. Your profile is currently **Pending Approval** by the system administrator.
              <br /><br />
              Please sign in using your credentials to **enroll your biometric Face ID** in the next step.
            </p>

            <Link to="/login" className="btn btn-primary" style={{ width: '100%', minHeight: '44px' }}>
              Proceed to Login Portal
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, marginBottom: '6px' }}>
                Employee Registration
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Enroll your details to register as an active employee
              </p>
            </div>

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
                  textAlign: 'left'
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} id="register-grid">
                
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" name="name" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="John Doe" value={formData.name} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="email" name="email" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="john@company.com" value={formData.email} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="tel" name="mobile" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="10-digit number" value={formData.mobile} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" name="employee_id" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="e.g. EMP101" value={formData.employee_id} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <select name="department" className="form-control" style={{ paddingLeft: '40px', appearance: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)', minHeight: '44px' }} value={formData.department} onChange={handleInputChange} required disabled={isSubmitting}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="text" name="designation" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="e.g. Frontend Engineer" value={formData.designation} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="password" name="password" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="Min 6 characters" value={formData.password} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input type="password" name="confirmPassword" className="form-control" style={{ paddingLeft: '40px', minHeight: '44px' }} placeholder="Confirm password" value={formData.confirmPassword} onChange={handleInputChange} required disabled={isSubmitting} />
                  </div>
                </div>

                {/* Biometric consent statement */}
                <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '8px', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      required
                      style={{ marginTop: '3px', width: '18px', height: '18px', minWidth: '18px', minHeight: '18px', cursor: 'pointer' }}
                    />
                    <span>
                      I consent to the secure collection, processing, and mathematical vector storage of my biometric facial signatures for attendance monitoring and verification purposes.
                    </span>
                  </label>
                </div>

              </div>

              <style>{`
                @media (max-width: 600px) {
                  #register-grid {
                    grid-template-columns: 1fr !important;
                  }
                }
              `}</style>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px', minHeight: '44px' }} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    <span>Registering Employee...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Register Account</span>
                  </>
                )}
              </button>
            </form>

            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Already registered? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Sign In here</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
