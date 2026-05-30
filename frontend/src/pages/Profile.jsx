import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { User, Phone, Briefcase, Award, Mail, Save, Fingerprint, Lock } from 'lucide-react';

export const Profile = () => {
  const { user, refreshUserSession, showToast } = useAuth();
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFaceEnrolled, setIsFaceEnrolled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfileDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get('/auth/me');
      setName(data.user.name);
      setMobile(data.user.mobile);
      setEmail(data.user.email);
      setIsFaceEnrolled(data.user.face_enrolled);
    } catch (e) {
      console.error('Failed to load profile details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name || !mobile || !email) {
      showToast('Name, mobile and email cannot be empty.', 'error');
      return;
    }

    if (password) {
      if (password.length < 6) {
        showToast('Password must be at least 6 characters long.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      await api.put('/auth/update-profile', {
        name,
        mobile,
        email,
        password: password || undefined
      });
      showToast('Profile updated successfully.');
      setPassword('');
      setConfirmPassword('');
      await refreshUserSession();
    } catch (error) {
      showToast(error.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        
        {/* Avatar banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '32px',
            borderBottom: '1px solid var(--border-glass)',
            paddingBottom: '24px'
          }}
          id="profile-banner-split"
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '2rem',
              color: '#fff',
              boxShadow: '0 0 15px var(--primary-glow)'
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '4px' }}>
              {name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
              Role: <b style={{ textTransform: 'uppercase' }}>{user.role}</b> {user.role !== 'admin' && <>| ID: <b>{user.employee_id}</b></>} | Status: <b style={{ textTransform: 'uppercase', color: user.status === 'active' ? 'var(--status-present)' : 'var(--status-late)' }}>{user.status}</b>
            </p>
            
            {user.role !== 'admin' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {isFaceEnrolled ? (
                  <span className="badge badge-present" style={{ gap: '4px', textTransform: 'none' }}>
                    <Fingerprint size={12} />
                    Biometrics Registered
                  </span>
                ) : (
                  <span className="badge badge-absent" style={{ gap: '4px', textTransform: 'none' }}>
                    <Fingerprint size={12} />
                    Biometrics Missing
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @media (max-width: 500px) {
            #profile-banner-split {
              flex-direction: column;
              text-align: center;
            }
          }
        `}</style>

        {/* Profile editing form */}
        <form onSubmit={handleUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }} id="profile-grid">
            
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '44px' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registered Mobile</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  className="form-control"
                  style={{ paddingLeft: '44px' }}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  className="form-control"
                  style={{ paddingLeft: '44px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={saving || user.role !== 'admin'}
                />
              </div>
            </div>

            {user.role !== 'admin' && (
              <>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '44px', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                      value={user.department || 'N/A'}
                      disabled
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <div style={{ position: 'relative' }}>
                    <Award size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '44px', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                      value={user.designation || 'N/A'}
                      disabled
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">New Password (leave blank to keep current)</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '44px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '44px' }}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

          </div>

          <style>{`
            @media (max-width: 600px) {
              #profile-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" style={{ gap: '8px' }} disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Profile;
