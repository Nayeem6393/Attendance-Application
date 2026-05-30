import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CheckSquare, ShieldCheck, ShieldX, User, Clock, AlertCircle, FileText } from 'lucide-react';

export const PendingApprovals = () => {
  const { showToast } = useAuth();
  
  // Navigation tabs: 'registrations' vs 'late-requests'
  const [activeTab, setActiveTab] = useState('registrations');

  // Data states
  const [pendingUsers, setPendingUsers] = useState([]);
  const [lateRequests, setLateRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending registrations
  const fetchPendingUsers = async () => {
    try {
      const data = await api.get('/employees?status=pending');
      setPendingUsers(data.employees || []);
    } catch (e) {
      console.error('Failed to load pending registrations:', e);
      showToast('Failed to retrieve employee verification queue.', 'error');
    }
  };

  // Fetch late check-in requests
  const fetchLateRequests = async () => {
    try {
      const data = await api.get('/attendance/admin/late-requests');
      setLateRequests(data.requests || []);
    } catch (e) {
      console.error('Failed to load late check-in requests:', e);
      showToast('Failed to retrieve late override requests.', 'error');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPendingUsers(), fetchLateRequests()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Employee Approvals handlers
  const handleApproveUser = async (id, employeeName) => {
    try {
      const data = await api.put(`/employees/${id}/approve`);
      showToast(data.message || `Approved employee account: ${employeeName}.`);
      await fetchPendingUsers();
    } catch (error) {
      showToast(error.message || 'Approval action failed.', 'error');
    }
  };

  const handleRejectUser = async (id, employeeName) => {
    try {
      const data = await api.put(`/employees/${id}/reject`);
      showToast(data.message || `Rejected employee account: ${employeeName}.`);
      await fetchPendingUsers();
    } catch (error) {
      showToast(error.message || 'Rejection action failed.', 'error');
    }
  };

  // Late Request override handlers
  const handleResolveLateRequest = async (requestId, employeeName, status) => {
    try {
      const data = await api.put(`/attendance/admin/late-requests/${requestId}`, { status });
      showToast(data.message || `Late check-in request ${status} for ${employeeName}.`);
      await fetchLateRequests();
    } catch (error) {
      showToast(error.message || 'Failed to update request status.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  // Filter lists for quick counts
  const pendingRequests = lateRequests.filter(r => r.status === 'pending');

  return (
    <div>
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '28px',
            borderBottom: '1px solid var(--border-glass)',
            paddingBottom: '12px',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={() => setActiveTab('registrations')}
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.9rem',
              background: activeTab === 'registrations' ? 'var(--primary-glow)' : 'transparent',
              border: `1px solid ${activeTab === 'registrations' ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === 'registrations' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <User size={16} />
            <span>New Employee Registrations ({pendingUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('late-requests')}
            className="btn"
            style={{
              padding: '8px 16px',
              fontSize: '0.9rem',
              background: activeTab === 'late-requests' ? 'var(--primary-glow)' : 'transparent',
              border: `1px solid ${activeTab === 'late-requests' ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === 'late-requests' ? 'var(--primary)' : 'var(--text-secondary)'
            }}
          >
            <Clock size={16} />
            <span>Late Check-in Requests ({pendingRequests.length})</span>
          </button>
        </div>

        {/* TAB 1: New Employee Registrations */}
        {activeTab === 'registrations' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <CheckSquare color="var(--primary)" size={20} />
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>Employee Signups Awaiting Verification</h3>
            </div>

            {pendingUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                No pending registrations found. All employee accounts are verified!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {pendingUsers.map((emp) => (
                  <div key={emp.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--primary-glow)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            fontWeight: 700
                          }}
                        >
                          <User size={18} />
                        </div>

                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Employee ID: <b style={{ color: 'var(--text-primary)' }}>{emp.employee_id}</b></p>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                        <div>Email: <span style={{ color: 'var(--text-primary)' }}>{emp.email}</span></div>
                        <div>Mobile: <span style={{ color: 'var(--text-primary)' }}>{emp.mobile}</span></div>
                        <div>Department: <span style={{ color: 'var(--text-primary)' }}>{emp.department || 'N/A'}</span></div>
                        <div>Designation: <span style={{ color: 'var(--text-primary)' }}>{emp.designation || 'N/A'}</span></div>
                        <div>Registered: <span style={{ color: 'var(--text-muted)' }}>{new Date(emp.created_at).toLocaleDateString()}</span></div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        borderTop: '1px solid var(--border-glass)',
                        paddingTop: '16px',
                        marginTop: 'auto'
                      }}
                    >
                      <button
                        onClick={() => handleApproveUser(emp.id, emp.name)}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '10px', fontSize: '0.8rem', gap: '6px' }}
                      >
                        <ShieldCheck size={16} />
                        <span>Approve Account</span>
                      </button>

                      <button
                        onClick={() => handleRejectUser(emp.id, emp.name)}
                        className="btn btn-danger"
                        style={{ flex: 1, padding: '10px', fontSize: '0.8rem', gap: '6px' }}
                      >
                        <ShieldX size={16} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Late Check-in Requests */}
        {activeTab === 'late-requests' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <Clock color="var(--primary)" size={20} />
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, color: 'var(--text-primary)' }}>Late Check-in Request Approvals</h3>
            </div>

            {lateRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                No late login requests logged in the database system.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {lateRequests.map((req) => (
                  <div
                    key={req.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      borderColor: req.status === 'pending' ? 'var(--status-late)' : 'var(--border-card)',
                      opacity: req.status !== 'pending' ? 0.75 : 1
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Clock size={16} color="var(--primary)" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            DATE: {req.date}
                          </span>
                        </div>
                        <span className={`badge ${
                          req.status === 'approved' ? 'badge-present' :
                          req.status === 'pending' ? 'badge-late' : 'badge-absent'
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {req.employee_name}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        ID: <b style={{ color: 'var(--text-primary)' }}>{req.employee_id}</b> | Dept: <b style={{ color: 'var(--text-primary)' }}>{req.department || 'N/A'}</b>
                      </p>

                      <div
                        style={{
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-glass)',
                          padding: '12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '6px'
                        }}
                      >
                        <FileText size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Reason:</div>
                          <i>"{req.reason}"</i>
                        </div>
                      </div>
                    </div>

                    {req.status === 'pending' ? (
                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          borderTop: '1px solid var(--border-glass)',
                          paddingTop: '16px',
                          marginTop: 'auto'
                        }}
                      >
                        <button
                          onClick={() => handleResolveLateRequest(req.id, req.employee_name, 'approved')}
                          className="btn btn-primary"
                          style={{
                            flex: 1,
                            padding: '10px',
                            fontSize: '0.8rem',
                            gap: '6px',
                            background: 'var(--status-present)',
                            boxShadow: 'none'
                          }}
                        >
                          <ShieldCheck size={16} />
                          <span>Approve Late</span>
                        </button>

                        <button
                          onClick={() => handleResolveLateRequest(req.id, req.employee_name, 'rejected')}
                          className="btn btn-danger"
                          style={{ flex: 1, padding: '10px', fontSize: '0.8rem', gap: '6px' }}
                        >
                          <ShieldX size={16} />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', fontSize: '0.725rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        Processed on {new Date(req.updated_at).toLocaleDateString()} at {new Date(req.updated_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default PendingApprovals;
