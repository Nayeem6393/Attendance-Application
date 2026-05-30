import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import { StatCard } from '../components/StatCard.jsx';
import {
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ScanFace,
  UserCheck,
  CalendarDays,
  CalendarCheck,
  X, Check, ShieldAlert, Navigation
} from 'lucide-react';

const getSessionDateTime = (timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const SessionCountdown = ({ startTimeStr, endTimeStr, status }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (status !== 'open' && status !== 'not_started') return;

    const updateCountdown = () => {
      const now = new Date();
      let targetDate = null;

      if (status === 'not_started') {
        targetDate = getSessionDateTime(startTimeStr);
      } else if (status === 'open') {
        targetDate = getSessionDateTime(endTimeStr);
      }

      if (!targetDate) return;

      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(status === 'not_started' ? 'Opening now...' : 'Closed');
        return;
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hrs > 0) parts.push(`${hrs}h`);
      if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
      parts.push(`${secs}s`);

      setTimeLeft(`${status === 'not_started' ? 'Starts in' : 'Ends in'}: ${parts.join(' ')}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [startTimeStr, endTimeStr, status]);

  if (status !== 'open' && status !== 'not_started') return null;

  return (
    <div style={{
      fontSize: '0.8rem',
      fontWeight: '700',
      color: status === 'open' ? 'var(--status-present)' : 'var(--status-late)',
      marginTop: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <Clock size={12} />
      <span>{timeLeft || 'Calculating...'}</span>
    </div>
  );
};

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const todayRes = await api.get('/employee/attendance-sessions/today');
      setSessions(todayRes.sessions || []);
      setFaceEnrolled(todayRes.faceEnrolled || false);
      
      const historyRes = await api.get('/attendance/my-history');
      setHistoryData(historyRes);
    } catch (error) {
      console.error('Failed to load employee dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  const summary = historyData?.summary || { present: 0, absent: 0, late: 0, total: 0 };
  const history = (historyData?.history || []).slice(0, 5); // recent 5

  return (
    <div>
      {/* Dynamic Alerts for Face ID Enrollment */}
      {!faceEnrolled && (
        <div
          className="glass-panel"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px dashed var(--status-absent)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ScanFace color="var(--status-absent)" size={24} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              To mark attendance, please first enroll a clear reference photo of your face.
            </span>
          </div>
          <Link to="/employee/enroll" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', background: 'var(--status-absent)' }}>
            Setup Face ID
          </Link>
        </div>
      )}

      {/* Account Pending Approval banner if employee is not approved */}
      {user.status === 'pending' && (
        <div
          className="glass-panel"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px dashed var(--status-late)',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <AlertTriangle color="var(--status-late)" size={32} style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--status-late)', marginBottom: '4px' }}>
              Account Pending Approval
            </h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Your registration details are currently being verified by an administrator. Once approved, you can check in for active shifts.
            </p>
          </div>
        </div>
      )}

      {/* Primary Dashboard stats grid */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Present Sessions"
          value={summary.present}
          icon={UserCheck}
          description="Marked on time"
          iconColor="var(--status-present)"
          iconBg="var(--status-present-glow)"
        />

        <StatCard
          title="Late Sessions"
          value={summary.late}
          icon={Clock}
          description="Check-ins after grace limit"
          iconColor="var(--status-late)"
          iconBg="var(--status-late-glow)"
        />

        <StatCard
          title="Absent Sessions"
          value={summary.absent}
          icon={CalendarCheck}
          description="Missed attendance windows"
          iconColor="var(--status-absent)"
          iconBg="var(--status-absent-glow)"
        />

        <StatCard
          title="Biometric Face ID"
          value={faceEnrolled ? 'Active' : 'Missing'}
          icon={ScanFace}
          description={faceEnrolled ? 'Verification enabled' : 'Enrollment required'}
          iconColor={faceEnrolled ? 'var(--status-present)' : 'var(--status-absent)'}
          iconBg={faceEnrolled ? 'var(--status-present-glow)' : 'var(--status-absent-glow)'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.1fr 1fr', gap: '24px', margin: '32px 0' }} id="emp-dashboard-split">
        
        {/* Left Side: Today's Assigned Sessions */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Today's Attendance Sessions</h3>
            
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                No active attendance sessions assigned to you for today.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {sessions.map(s => {
                  let badgeClass = 'badge-absent';
                  let btnColor = 'var(--text-muted)';
                  let btnBg = 'rgba(255,255,255,0.02)';
                  let btnBorder = 'var(--border-glass)';
                  let enableBtn = false;

                  if (s.status === 'open') {
                    badgeClass = 'badge-present';
                    btnColor = '#fff';
                    btnBg = 'var(--primary)';
                    btnBorder = 'var(--primary)';
                    enableBtn = true;
                  } else if (s.status === 'marked') {
                    badgeClass = 'badge-present';
                  } else if (s.status === 'not_started') {
                    badgeClass = 'badge-late';
                  }

                  return (
                    <div 
                      key={s.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '18px', 
                        background: 'rgba(255,255,255,0.01)', 
                        borderColor: s.status === 'open' ? 'rgba(99,102,241,0.25)' : 'var(--border-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '235px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="badge" style={{
                            background: s.session_type === 'morning' ? 'rgba(59, 130, 246, 0.1)' : s.session_type === 'evening' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                            color: s.session_type === 'morning' ? '#60a5fa' : s.session_type === 'evening' ? '#facc15' : '#a78bfa',
                            fontSize: '0.65rem',
                            textTransform: 'uppercase'
                          }}>
                            {s.session_type}
                          </span>
                          
                          <span className={`badge ${
                            s.status === 'open' ? 'badge-present' :
                            s.status === 'marked' ? 'badge-present' :
                            s.status === 'not_started' ? 'badge-late' : 'badge-absent'
                          }`}>
                            {s.status === 'open' ? 'Open' :
                             s.status === 'marked' ? 'Marked' :
                             s.status === 'not_started' ? 'Not Started' : 'Missed'}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>
                          {s.title}
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={12} color="var(--primary)" />
                            <span>{s.start_time} - {s.end_time}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={12} color="var(--primary)" />
                            <span>Grace Period: {s.grace_period_minutes} mins</span>
                          </div>
                        </div>

                        {/* Real-time reactive countdown display */}
                        <SessionCountdown startTimeStr={s.start_time} endTimeStr={s.end_time} status={s.status} />
                      </div>

                      <div style={{ marginTop: '14px' }}>
                        {s.status === 'marked' && s.check_in ? (
                          <div 
                            style={{ 
                              padding: '10px', 
                              borderRadius: 'var(--radius-sm)', 
                              background: 'rgba(16, 185, 129, 0.05)', 
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              fontSize: '0.75rem',
                              color: 'var(--status-present)'
                            }}
                          >
                            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={14} />
                              <span>Checked In ({s.check_in.status})</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Time: {s.check_in.time} | Score: {s.check_in.matchScore?.toFixed(0)}%
                            </div>
                          </div>
                        ) : s.status === 'open' ? (
                          <Link 
                            to={faceEnrolled ? `/employee/mark?session_id=${s.id}` : '#'}
                            onClick={() => !faceEnrolled && alert('Please enroll your Face ID reference photo first.')}
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', gap: '6px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <ScanFace size={16} />
                            <span>Mark Attendance</span>
                          </Link>
                        ) : s.status === 'not_started' ? (
                          <button 
                            className="btn" 
                            style={{ width: '100%', padding: '10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-glass)', color: 'var(--text-secondary)', cursor: 'default', minHeight: '44px' }}
                            disabled
                          >
                            Opens at {s.start_time}
                          </button>
                        ) : (
                          <div 
                            style={{ 
                              padding: '10px', 
                              borderRadius: 'var(--radius-sm)', 
                              background: 'rgba(239, 68, 68, 0.05)', 
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              fontSize: '0.75rem',
                              color: 'var(--status-absent)',
                              textAlign: 'center',
                              fontWeight: 600
                            }}
                          >
                            Attendance Closed (Missed)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Full History Logs block */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.2rem' }}>Recent Check-in Logs</h3>
              <Link to="/employee/history" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                View Full Logs
              </Link>
            </div>

            <div className="table-container">
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                  No recent check-in logs found.
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <table className="custom-table desktop-only-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Session</th>
                        <th>Status</th>
                        <th>Check-in Time</th>
                        <th>Location Details</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr key={record.id}>
                          <td data-label="Date" style={{ fontWeight: 600 }}>{record.date}</td>
                          <td data-label="Session">
                            <div style={{ fontWeight: 600 }}>{record.session_title || 'N/A'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{record.session_type || 'N/A'}</div>
                          </td>
                          <td data-label="Status">
                            <span className={`badge ${
                              record.status === 'Present' ? 'badge-present' :
                              record.status === 'Late' ? 'badge-late' : 'badge-absent'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td data-label="Check-in Time">{record.check_in_time || '--:--'}</td>
                          <td data-label="Location Details">
                            {record.latitude ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                <MapPin size={12} color="var(--primary)" />
                                <span>{record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}</span>
                              </div>
                            ) : 'N/A'}
                          </td>
                          <td data-label="Remarks" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{record.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Cards View */}
                  <div className="attendance-mobile-list">
                    {history.map((record) => (
                      <div key={record.id} className="attendance-card">
                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Date</div>
                          <div className="attendance-card-value">{record.date}</div>
                        </div>

                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Session</div>
                          <div className="attendance-card-value">{record.session_title || 'N/A'}</div>
                        </div>

                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Type</div>
                          <div className="attendance-card-value" style={{ textTransform: 'capitalize' }}>{record.session_type || 'N/A'}</div>
                        </div>

                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Status</div>
                          <div className="attendance-card-value">
                            <span className={`badge ${
                              record.status === 'Present' ? 'badge-present' :
                              record.status === 'Late' ? 'badge-late' : 'badge-absent'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                        </div>

                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Check-in Time</div>
                          <div className="attendance-card-value" style={{ fontFamily: 'monospace' }}>
                            {record.check_in_time || '--:--'}
                          </div>
                        </div>

                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Location</div>
                          <div className="attendance-card-value" style={{ width: '100%' }}>
                            {record.latitude && record.longitude ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                  <MapPin size={12} color="var(--primary)" />
                                  <span>{record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}</span>
                                </div>
                                <a
                                  href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none',
                                    color: 'var(--text-primary)',
                                    background: 'var(--bg-dashboard)',
                                    borderColor: 'var(--border-card)',
                                    justifyContent: 'center',
                                    width: '100%',
                                    minHeight: '44px'
                                  }}
                                >
                                  <MapPin size={14} color="var(--primary)" />
                                  <span>Open Maps</span>
                                </a>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </div>

                        <div className="attendance-card-row">
                          <div className="attendance-card-label">Remarks</div>
                          <div className="attendance-card-value" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {record.remarks || 'No remarks'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action and Monthly Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Face enrollment panel if missing */}
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
            <ScanFace color="var(--primary)" size={32} style={{ marginBottom: '12px' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', fontSize: '1.15rem' }}>Biometric Face Profile</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Ensure your face ID reference photo is enrolled correctly. Toggling reference allows admin approval comparisons.
            </p>
            
            {faceEnrolled ? (
              <div 
                style={{ 
                  padding: '10px 14px', 
                  borderRadius: 'var(--radius-sm)', 
                  background: 'rgba(16, 185, 129, 0.05)', 
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  fontSize: '0.85rem',
                  color: 'var(--status-present)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Check size={16} />
                <span>Face ID Biometrics Active</span>
              </div>
            ) : (
              <Link to="/employee/enroll" className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>
                Setup Biometrics Profile
              </Link>
            )}
          </div>

          {/* Monthly Aggregates Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', fontSize: '1.15rem' }}>Monthly Summary</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Present Sessions</span>
                  <span style={{ color: 'var(--status-present)', fontWeight: 600 }}>{summary.present} shifts</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--status-present)', height: '100%', width: `${summary.total > 0 ? (summary.present / summary.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Late Sessions</span>
                  <span style={{ color: 'var(--status-late)', fontWeight: 600 }}>{summary.late} shifts</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--status-late)', height: '100%', width: `${summary.total > 0 ? (summary.late / summary.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span>Absent Sessions</span>
                  <span style={{ color: 'var(--status-absent)', fontWeight: 600 }}>{summary.absent} shifts</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--status-absent)', height: '100%', width: `${summary.total > 0 ? (summary.absent / summary.total) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  marginTop: '10px',
                  borderTop: '1px solid var(--border-glass)',
                  paddingTop: '12px'
                }}
              >
                <span>Total Tracked Sessions</span>
                <span>{summary.total} shifts</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          #emp-dashboard-split {
            display: flex !important;
            flex-direction: column-reverse !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EmployeeDashboard;
