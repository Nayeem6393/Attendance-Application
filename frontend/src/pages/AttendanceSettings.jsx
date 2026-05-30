import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Settings, Save, Sparkles, Plus, Trash2, Edit2, 
  UserCheck, Power, X, Calendar, Clock, ShieldAlert,
  ChevronRight, Users, ToggleLeft, Check
} from 'lucide-react';

export const AttendanceSettings = () => {
  const { showToast } = useAuth();
  
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningJob, setRunningJob] = useState(false);

  // Global Settings states
  const [globalTimezone, setGlobalTimezone] = useState('Asia/Kolkata');
  const [globalGrace, setGlobalGrace] = useState(15);
  const [globalAutoAbsent, setGlobalAutoAbsent] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);

  // Modal / Editor states
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  
  // Form states
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState('custom');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [gracePeriod, setGracePeriod] = useState(15);
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [workingDays, setWorkingDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [assignmentType, setAssignmentType] = useState('all');
  const [department, setDepartment] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Assignment Drawer states
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [assigningSession, setAssigningSession] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const departmentsList = ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'Support', 'Management'];

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.get('/admin/attendance-sessions');
      setSessions(data.sessions || []);
    } catch (e) {
      console.error('Failed to load sessions:', e);
      showToast('Failed to load attendance sessions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await api.get('/employees?status=active');
      setEmployees(data.employees || []);
    } catch (e) {
      console.error('Failed to load employees:', e);
    }
  };

  const fetchGlobalSettings = async () => {
    try {
      const data = await api.get('/admin/settings/attendance');
      if (data && data.settings) {
        setGlobalTimezone(data.settings.timezone);
        setGlobalGrace(data.settings.grace_period_minutes);
        setGlobalAutoAbsent(data.settings.auto_absent_enabled === 1);
      }
    } catch (e) {
      console.error('Failed to load global defaults:', e);
    }
  };

  const handleSaveGlobal = async (e) => {
    e.preventDefault();
    setSavingGlobal(true);
    try {
      await api.put('/admin/settings/attendance', {
        timezone: globalTimezone,
        grace_period_minutes: parseInt(globalGrace, 10),
        auto_absent_enabled: globalAutoAbsent
      });
      showToast('Global system defaults saved successfully.');
      fetchGlobalSettings();
      fetchSessions(); // Reload sessions in case default timezone/grace applies
    } catch (error) {
      showToast(error.message || 'Failed to save global defaults.', 'error');
    } finally {
      setSavingGlobal(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchEmployees();
    fetchGlobalSettings();
  }, []);

  const handleOpenCreate = () => {
    setEditingSession(null);
    setTitle('');
    setSessionType('custom');
    setStartTime('09:00');
    setEndTime('10:00');
    setGracePeriod(15);
    setTimezone('Asia/Kolkata');
    setWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    setAssignmentType('all');
    setDepartment('');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (session) => {
    setEditingSession(session);
    setTitle(session.title);
    setSessionType(session.session_type);
    setStartTime(session.start_time);
    setEndTime(session.end_time);
    setGracePeriod(session.grace_period_minutes);
    setTimezone(session.timezone);
    setWorkingDays(session.working_days || []);
    setAssignmentType(session.assignment_type);
    setDepartment(session.department || '');
    setIsActive(session.is_active === 1);
    setShowModal(true);
  };

  const handleDayToggle = (day) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter(d => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (workingDays.length === 0) {
      showToast('Please select at least one working day.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        session_type: sessionType,
        start_time: startTime,
        end_time: endTime,
        grace_period_minutes: parseInt(gracePeriod, 10),
        timezone,
        working_days: workingDays,
        assignment_type: assignmentType,
        department: assignmentType === 'department' ? department : null,
        is_active: isActive
      };

      if (editingSession) {
        await api.put(`/admin/attendance-sessions/${editingSession.id}`, payload);
        showToast('Attendance session updated successfully.');
      } else {
        await api.post('/admin/attendance-sessions', payload);
        showToast('Attendance session created successfully.');
      }
      setShowModal(false);
      fetchSessions();
    } catch (error) {
      showToast(error.message || 'Failed to save session.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this session? This will cascade and delete all attendance records associated with it.')) {
      return;
    }

    try {
      await api.delete(`/admin/attendance-sessions/${id}`);
      showToast('Session deleted successfully.');
      fetchSessions();
    } catch (error) {
      showToast(error.message || 'Failed to delete session.', 'error');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const data = await api.patch(`/admin/attendance-sessions/${id}/toggle`);
      showToast(data.message);
      fetchSessions();
    } catch (error) {
      showToast(error.message || 'Failed to toggle status.', 'error');
    }
  };

  // Open Assign Drawer
  const handleOpenAssign = async (session) => {
    setAssigningSession(session);
    setSelectedUserIds([]);
    try {
      const data = await api.get(`/admin/attendance-sessions/${session.id}/assignments`);
      const assignedIds = (data.assignments || []).map(emp => emp.id);
      setSelectedUserIds(assignedIds);
      setShowAssignDrawer(true);
    } catch (error) {
      showToast('Failed to retrieve session assignments.', 'error');
    }
  };

  const handleToggleEmployeeAssign = (empId) => {
    if (selectedUserIds.includes(empId)) {
      setSelectedUserIds(selectedUserIds.filter(id => id !== empId));
    } else {
      setSelectedUserIds([...selectedUserIds, empId]);
    }
  };

  const handleSaveAssignments = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/attendance-sessions/${assigningSession.id}/assign`, {
        user_ids: selectedUserIds
      });
      showToast('Assignments saved successfully.');
      setShowAssignDrawer(false);
      fetchSessions();
    } catch (error) {
      showToast(error.message || 'Failed to save assignments.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerAutoAbsent = async () => {
    setRunningJob(true);
    try {
      const data = await api.post('/attendance/admin/run-auto-absent');
      showToast('Per-session Auto-Absent job completed.');
      alert(`SYSTEM JOB COMPLETED:\nTotal Absent records created: ${data.count} employees flagged.`);
    } catch (error) {
      showToast(error.message || 'Failed to run scheduler check.', 'error');
    } finally {
      setRunningJob(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department && emp.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && sessions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings color="var(--primary)" size={26} />
            <span>Attendance Sessions Manager</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Configure offices hours, custom meetings, site visits, and assign them dynamically to your team.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '8px' }}>
          <Plus size={18} />
          <span>New Session / Link</span>
        </button>
      </div>

      {/* Grid of Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {sessions.map(s => (
          <div key={s.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', border: s.is_active ? '1px solid var(--border-glass)' : '1px solid rgba(239, 68, 68, 0.15)' }}>
            <div>
              {/* Type indicator and toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="badge" style={{
                  background: s.session_type === 'morning' ? 'rgba(59, 130, 246, 0.1)' : s.session_type === 'evening' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                  color: s.session_type === 'morning' ? '#60a5fa' : s.session_type === 'evening' ? '#facc15' : '#a78bfa',
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em'
                }}>
                  {s.session_type}
                </span>

                <button 
                  onClick={() => handleToggleActive(s.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.is_active ? 'var(--status-present)' : 'var(--text-muted)' }}
                  title={s.is_active ? 'Deactivate session' : 'Activate session'}
                >
                  <Power size={18} />
                </button>
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: s.is_active ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>
                {s.title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="var(--primary)" />
                  <span>{s.start_time} - {s.end_time} (Grace: {s.grace_period_minutes}m)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.75rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {Array.isArray(s.working_days) ? s.working_days.join(', ') : s.working_days}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} color="var(--primary)" />
                  <span>
                    Assignment: <b style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{s.assignment_type}</b>
                    {s.assignment_type === 'department' && ` (${s.department})`}
                  </span>
                </div>
              </div>
            </div>

            {/* Session actions */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleOpenEdit(s)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}>
                  <Edit2 size={12} />
                  <span>Edit</span>
                </button>

                {s.assignment_type === 'selected' && (
                  <button onClick={() => handleOpenAssign(s)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px', borderColor: 'var(--primary)' }}>
                    <UserCheck size={12} color="var(--primary)" />
                    <span style={{ color: 'var(--primary)' }}>Assign ({s.assigned_count || 0})</span>
                  </button>
                )}
              </div>

              <button onClick={() => handleDelete(s.id)} className="btn" style={{ padding: '6px', background: 'none', border: 'none', color: 'var(--status-absent)' }} title="Delete session">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No attendance sessions found. Click the button above to seed or create one.
          </div>
        )}
      </div>

      {/* Global Defaults panel */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 16px 0', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings color="var(--primary)" size={20} />
          <span>Global System Defaults</span>
        </h3>
        <form onSubmit={handleSaveGlobal} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '20px', alignItems: 'end' }} id="global-defaults-form">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>System Timezone</label>
            <select 
              className="form-control" 
              style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              value={globalTimezone} 
              onChange={(e) => setGlobalTimezone(e.target.value)}
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+5:30)</option>
              <option value="UTC">Coordinated Universal Time (UTC)</option>
              <option value="America/New_York">America/New_York (EST - UTC-5)</option>
              <option value="Europe/London">Europe/London (GMT - UTC+0)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+8)</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Default Grace Period (Minutes)</label>
            <input 
              type="number" 
              className="form-control" 
              style={{ fontSize: '0.8rem', padding: '8px 12px' }}
              value={globalGrace} 
              onChange={(e) => setGlobalGrace(e.target.value)} 
              min="0" max="60" 
              required 
            />
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', minHeight: '38px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                id="globalAutoAbsentCheck" 
                checked={globalAutoAbsent} 
                onChange={(e) => setGlobalAutoAbsent(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }} 
              />
              <label htmlFor="globalAutoAbsentCheck" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Auto-Absent Ticker
              </label>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem' }} disabled={savingGlobal}>
              {savingGlobal ? 'Saving...' : 'Save Defaults'}
            </button>
          </div>
        </form>
        <style>{`
          @media (max-width: 768px) {
            #global-defaults-form {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>

      {/* Scheduler Simulation triggers */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderLeft: '3px solid var(--status-late)' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles color="#facc15" size={18} />
            <span>Simulate Per-Session Auto-Absent Job</span>
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>
            Forces the background scheduler task to sweep closed windows for all active sessions immediately and flag no-shows as "Absent".
          </p>
        </div>

        <button 
          onClick={handleTriggerAutoAbsent}
          disabled={runningJob}
          className="btn btn-secondary"
          style={{ gap: '8px', borderColor: '#facc15', color: '#facc15' }}
        >
          {runningJob ? (
            <>
              <div className="spinner" style={{ width: '14px', height: '14px' }}></div>
              <span>Flagging...</span>
            </>
          ) : (
            <span>Run Dynamic Absent Generator</span>
          )}
        </button>
      </div>

      {/* Session Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '640px', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingSession ? <Edit2 size={18} color="var(--primary)" /> : <Plus size={20} color="var(--primary)" />}
                <span>{editingSession ? 'Edit Attendance Session' : 'Create Attendance Session'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              
              {/* Form Grid Mobile Responsive Overrides */}
              <style>{`
                @media (max-width: 550px) {
                  .form-grid-2col {
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                  }
                }
              `}</style>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Session Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Morning Shift, Site Visit, Board Meeting" 
                  required 
                />
              </div>

              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Session Type</label>
                  <select className="form-control" value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                    <option value="morning">Morning Shift</option>
                    <option value="evening">Evening Shift</option>
                    <option value="custom">Custom Meeting / Site Visit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Grace Period (Minutes)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={gracePeriod} 
                    onChange={(e) => setGracePeriod(e.target.value)} 
                    min="0" max="60" 
                    required 
                  />
                </div>
              </div>

              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Start Time (HH:MM)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    placeholder="e.g. 09:00" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Time (HH:MM)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={endTime} 
                    onChange={(e) => setEndTime(e.target.value)} 
                    placeholder="e.g. 10:00" 
                    required 
                  />
                </div>
              </div>

              {/* Timezone and working days */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Working Days</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                  {daysOfWeek.map(d => {
                    const isSel = workingDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleDayToggle(d)}
                        className="btn"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          background: isSel ? 'var(--primary-glow)' : 'rgba(255,255,255,0.02)',
                          borderColor: isSel ? 'var(--primary)' : 'var(--border-glass)',
                          color: isSel ? 'var(--primary)' : 'var(--text-secondary)'
                        }}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignment logic */}
              <div className="form-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Assignment Type</label>
                  <select className="form-control" value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)}>
                    <option value="all">All Employees</option>
                    <option value="department">By Department</option>
                    <option value="selected">Selected Employees</option>
                  </select>
                </div>

                {assignmentType === 'department' && (
                  <div className="form-group">
                    <label className="form-label">Select Department</label>
                    <select className="form-control" value={department} onChange={(e) => setDepartment(e.target.value)} required>
                      <option value="">Choose department...</option>
                      {departmentsList.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <input 
                  type="checkbox" 
                  id="isActiveCheck" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)} 
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} 
                />
                <label htmlFor="isActiveCheck" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Enable session immediately (Active)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Selected Employee Assignment Drawer */}
      {showAssignDrawer && (
        <div style={{ position: 'fixed', top: 0, right: 0, width: '100%', height: '100%', background: 'rgba(5, 8, 16, 0.75)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'flex-end', zIndex: 1100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="var(--primary)" />
                  <span>Assign Employees</span>
                </h3>
                <button onClick={() => setShowAssignDrawer(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Select employees to assign to session: <b>{assigningSession?.title}</b>.
              </p>

              {/* Search */}
              <input
                type="text"
                className="form-control"
                style={{ marginBottom: '16px', fontSize: '0.85rem' }}
                placeholder="Search by name, ID or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Employee list */}
              <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEmployees.map(emp => {
                  const isChecked = selectedUserIds.includes(emp.id);
                  return (
                    <div 
                      key={emp.id}
                      onClick={() => handleToggleEmployeeAssign(emp.id)}
                      className="glass-card"
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        borderColor: isChecked ? 'var(--primary)' : 'var(--border-glass)',
                        background: isChecked ? 'rgba(79, 70, 229, 0.04)' : 'rgba(255,255,255,0.01)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {emp.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ID: {emp.employee_id} | Dept: {emp.department || 'N/A'}
                        </div>
                      </div>

                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isChecked ? 'var(--primary)' : 'none',
                        borderColor: isChecked ? 'var(--primary)' : 'var(--border-glass)',
                        color: '#fff'
                      }}>
                        {isChecked && <Check size={12} />}
                      </div>
                    </div>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    No active employees matched your search.
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowAssignDrawer(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleSaveAssignments} className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceSettings;
