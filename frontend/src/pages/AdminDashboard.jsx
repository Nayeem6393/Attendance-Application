import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api.js';
import { StatCard } from '../components/StatCard.jsx';
import {
  Users,
  UserCheck,
  UserX,
  UserCheck2,
  Clock,
  Settings,
  Percent,
  AlertCircle,
  FileSpreadsheet,
  CalendarCheck,
  Award,
  BookOpen
} from 'lucide-react';

export const AdminDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [dailyRecords, setDailyRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const empRes = await api.get('/employees');
      setEmployees(empRes.employees || []);

      // Fetch daily attendance status
      const dailyRes = await api.get('/attendance/admin/daily');
      setDailyRecords(dailyRes.records || []);

      // Fetch active sessions
      const sessionsRes = await api.get('/admin/attendance-sessions');
      setSessions(sessionsRes.sessions || []);
    } catch (e) {
      console.error('Failed to load dashboard metrics:', e);
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

  // Aggregate global daily stats
  const totalEmployees = employees.filter(e => e.status === 'active').length;
  const pendingApprovals = employees.filter(e => e.status === 'pending').length;

  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;

  dailyRecords.forEach(r => {
    if (r.attendance_status === 'Present') presentToday++;
    else if (r.attendance_status === 'Late') lateToday++;
    else if (r.attendance_status === 'Absent') absentToday++;
  });

  const totalMarkedToday = presentToday + lateToday + absentToday;
  const presentPct = totalMarkedToday > 0 ? (presentToday / totalMarkedToday) * 100 : 0;
  const latePct = totalMarkedToday > 0 ? (lateToday / totalMarkedToday) * 100 : 0;
  const absentPct = totalMarkedToday > 0 ? (absentToday / totalMarkedToday) * 100 : 0;

  const attendanceRate = totalMarkedToday > 0
    ? (((presentToday + lateToday) / totalMarkedToday) * 100).toFixed(1)
    : '0.0';

  // Aggregate per-session stats
  const activeSessions = sessions.filter(s => s.is_active === 1);
  const sessionStats = activeSessions.map(session => {
    let pCount = 0;
    let lCount = 0;
    let aCount = 0;

    dailyRecords.forEach(r => {
      if (r.session_id === session.id) {
        if (r.attendance_status === 'Present') pCount++;
        else if (r.attendance_status === 'Late') lCount++;
        else if (r.attendance_status === 'Absent') aCount++;
      }
    });

    const total = pCount + lCount + aCount;
    const rate = total > 0 ? (((pCount + lCount) / total) * 100).toFixed(0) : '0';

    return {
      ...session,
      present: pCount,
      late: lCount,
      absent: aCount,
      total,
      rate
    };
  });

  const renderSessionCard = (s) => (
    <div 
      key={s.id} 
      className="glass-card" 
      style={{ 
        padding: '16px', 
        background: 'rgba(255,255,255,0.01)', 
        borderColor: 'var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '210px'
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
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-present)' }}>{s.rate}% Success</span>
        </div>

        <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 6px 0', fontFamily: 'var(--font-display)' }}>
          {s.title}
        </h4>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          <span>{s.start_time} - {s.end_time}</span>
        </div>
      </div>

      {/* Progress bar counts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: 'var(--status-present)' }}>Present</span>
            <b>{s.present}</b>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--status-present)', height: '100%', width: s.total > 0 ? `${(s.present / s.total) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: 'var(--status-late)' }}>Late</span>
            <b>{s.late}</b>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--status-late)', height: '100%', width: s.total > 0 ? `${(s.late / s.total) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: 'var(--status-absent)' }}>Absent</span>
            <b>{s.absent}</b>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ background: 'var(--status-absent)', height: '100%', width: s.total > 0 ? `${(s.absent / s.total) * 100}%` : '0%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Dynamic Alerts for Pending Approvals */}
      {pendingApprovals > 0 && (
        <div
          id="admin-alert-banner"
          className="glass-panel"
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px dashed var(--primary)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            animation: 'pulseGlow 2.5s infinite ease-in-out'
          }}
        >
          <style>{`
            @keyframes pulseGlow {
              0%, 100% { border-color: rgba(99, 102, 241, 0.15); }
              50% { border-color: var(--primary); }
            }
          `}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle color="var(--primary)" size={24} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              There are <b>{pendingApprovals}</b> pending employee registrations awaiting approval.
            </span>
          </div>
          <Link to="/admin/approvals" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
            Approve Registrations
          </Link>
        </div>
      )}

      {/* Main Admin Metrics Checklist Grid */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <StatCard
          title="Active Staff"
          value={totalEmployees}
          icon={Users}
          description={`${pendingApprovals} accounts pending approval`}
          iconColor="var(--primary)"
          iconBg="var(--primary-glow)"
        />

        <StatCard
          title="Total Present Today"
          value={presentToday}
          icon={UserCheck}
          description="Sessions marked on-time"
          iconColor="var(--status-present)"
          iconBg="var(--status-present-glow)"
        />

        <StatCard
          title="Total Late Today"
          value={lateToday}
          icon={Clock}
          description="Marks after grace period"
          iconColor="var(--status-late)"
          iconBg="var(--status-late-glow)"
        />

        <StatCard
          title="Total Absent Today"
          value={absentToday}
          icon={UserX}
          description="Failed session check-ins"
          iconColor="var(--status-absent)"
          iconBg="var(--status-absent-glow)"
        />

        <StatCard
          title="Active Sessions Today"
          value={activeSessions.length}
          icon={Settings}
          description="Assigned check-in gates"
          iconColor="var(--primary)"
          iconBg="var(--primary-glow)"
        />

        <StatCard
          title="Average Success Rate"
          value={`${attendanceRate}%`}
          icon={Percent}
          description="Across all marked sessions"
          iconColor="var(--status-present)"
          iconBg="var(--status-present-glow)"
        />
      </div>

      {/* PER-SESSION DETAILED telemetry summary */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px', fontSize: '1.25rem' }}>Today's Sessions Summary</h3>
        
        {sessionStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No active sessions are running today. Configure sessions in rules settings.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Morning Sessions */}
            {sessionStats.filter(s => s.session_type === 'morning').length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: '#60a5fa', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                  <span>Morning Sessions</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {sessionStats.filter(s => s.session_type === 'morning').map(renderSessionCard)}
                </div>
              </div>
            )}

            {/* Evening Sessions */}
            {sessionStats.filter(s => s.session_type === 'evening').length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: '#facc15', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
                  <span>Evening Sessions</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {sessionStats.filter(s => s.session_type === 'evening').map(renderSessionCard)}
                </div>
              </div>
            )}

            {/* Custom/Other Sessions */}
            {sessionStats.filter(s => s.session_type !== 'morning' && s.session_type !== 'evening').length > 0 && (
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: '#a78bfa', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }}></span>
                  <span>Custom & General Sessions</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {sessionStats.filter(s => s.session_type !== 'morning' && s.session_type !== 'evening').map(renderSessionCard)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', margin: '24px 0' }} id="admin-dashboard-split">
        
        {/* Left Side: Combined concentrical chart Ring */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px' }}>Global Combined Ring Telemetry</h3>
          
          {totalMarkedToday === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '260px', color: 'var(--text-secondary)' }}>
              No employee attendance logged for today.
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '260px' }} id="chart-flex">
              
              {/* Custom SVG Ring */}
              <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  {presentPct > 0 && (
                    <circle
                      cx="50" cy="50" r="40" fill="transparent" stroke="var(--status-present)" strokeWidth="6"
                      strokeDasharray={`${presentPct * 2.51} 251.2`} strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px var(--status-present-glow))' }}
                    />
                  )}
                  {latePct > 0 && (
                    <circle
                      cx="50" cy="50" r="40" fill="transparent" stroke="var(--status-late)" strokeWidth="6"
                      strokeDasharray={`${latePct * 2.51} 251.2`} strokeDashoffset={`-${presentPct * 2.51}`} strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px var(--status-late-glow))' }}
                    />
                  )}
                  {absentPct > 0 && (
                    <circle
                      cx="50" cy="50" r="40" fill="transparent" stroke="var(--status-absent)" strokeWidth="6"
                      strokeDasharray={`${absentPct * 2.51} 251.2`} strokeDashoffset={`-${(presentPct + latePct) * 2.51}`} strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px var(--status-absent-glow))' }}
                    />
                  )}
                </svg>

                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>
                    {totalMarkedToday}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Logs Today
                  </span>
                </div>
              </div>

              {/* Legends board */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '160px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-present)' }}></span>
                      <span>Present</span>
                    </span>
                    <b>{presentToday} ({presentPct.toFixed(0)}%)</b>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--status-present)', height: '100%', width: `${presentPct}%` }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-late)' }}></span>
                      <span>Late</span>
                    </span>
                    <b>{lateToday} ({latePct.toFixed(0)}%)</b>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--status-late)', height: '100%', width: `${latePct}%` }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-absent)' }}></span>
                      <span>Absent</span>
                    </span>
                    <b>{absentToday} ({absentPct.toFixed(0)}%)</b>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--status-absent)', height: '100%', width: `${absentPct}%` }}></div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Side: Administrative Quick Links Panels */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px' }}>Quick Tools</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/admin/employees"
              className="sidebar-link active"
              style={{ padding: '16px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', borderLeft: 'none', background: 'rgba(255,255,255,0.02)' }}
            >
              <Users size={18} color="var(--primary)" />
              <div style={{ textAlign: 'left', marginLeft: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Employee Database</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Manage accounts and approve sign-ups</div>
              </div>
            </Link>

            <Link
              to="/admin/tracking"
              className="sidebar-link active"
              style={{ padding: '16px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', borderLeft: 'none', background: 'rgba(255,255,255,0.02)' }}
            >
              <CalendarCheck size={18} color="var(--status-present)" />
              <div style={{ textAlign: 'left', marginLeft: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Attendance Tracking</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>View logs, overrides, and map verify</div>
              </div>
            </Link>

            <Link
              to="/admin/reports"
              className="sidebar-link active"
              style={{ padding: '16px', borderRadius: 'var(--radius-sm)', textDecoration: 'none', borderLeft: 'none', background: 'rgba(255,255,255,0.02)' }}
            >
              <FileSpreadsheet size={18} color="var(--status-late)" />
              <div style={{ textAlign: 'left', marginLeft: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Reports Export</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Download daily & monthly Excel & PDFs</div>
              </div>
            </Link>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 1024px) {
          #admin-dashboard-split {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          #admin-alert-banner {
            flex-direction: column !important;
            align-items: stretch !important;
            text-align: center;
          }
        }
        @media (max-width: 500px) {
          #chart-flex {
            flex-direction: column !important;
            height: auto !important;
            gap: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
