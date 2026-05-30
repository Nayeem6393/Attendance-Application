import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { MapPin, Filter, Search, Calendar, Map, CheckCircle2, ShieldAlert, Sparkles, X, Edit, ClipboardSignature, Camera } from 'lucide-react';

export const AttendanceTracking = () => {
  const { showToast } = useAuth();
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionFilter, setSessionFilter] = useState('');

  // Map Modal
  const [selectedMapCoords, setSelectedMapCoords] = useState(null);

  // Manual Override Modal
  const [overrideModal, setOverrideModal] = useState(null); // holds row record
  const [overrideStatus, setOverrideStatus] = useState('Present');
  const [overrideTime, setOverrideTime] = useState('09:00:00');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);

  // Captured Photo Modal
  const [photoModalRecord, setPhotoModalRecord] = useState(null);
  const [photoBlobUrl, setPhotoBlobUrl] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  const handleOpenPhoto = async (recordId, employeeName) => {
    setPhotoModalRecord({ id: recordId, name: employeeName });
    setPhotoLoading(true);
    setPhotoBlobUrl(null);
    try {
      const blob = await api.download(`/attendance/photo/${recordId}`);
      const url = URL.createObjectURL(blob);
      setPhotoBlobUrl(url);
    } catch (err) {
      console.error('Failed to load check-in photo:', err);
      showToast('Failed to load check-in photo.', 'error');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleClosePhoto = () => {
    if (photoBlobUrl) {
      URL.revokeObjectURL(photoBlobUrl);
    }
    setPhotoModalRecord(null);
    setPhotoBlobUrl(null);
  };

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      // Fetch all attendance logs
      const data = await api.get('/attendance/admin');
      setRecords(data.records || []);

      // Fetch employees list for manual override selection
      const empRes = await api.get('/employees');
      setEmployees(empRes.employees || []);

      // Fetch active sessions list
      const sessRes = await api.get('/admin/attendance-sessions');
      setSessions(sessRes.sessions || []);
    } catch (e) {
      console.error('Failed to load tracking log details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, []);

  const handleOpenMap = (lat, lng, name) => {
    if (!lat || lat === 0) {
      showToast('No location coordinates recorded for this log.', 'error');
      return;
    }
    setSelectedMapCoords({ lat, lng, name });
  };

  const handleCloseMap = () => {
    setSelectedMapCoords(null);
  };

  const handleOpenOverride = (record) => {
    setOverrideModal(record);
    setOverrideStatus(record.status);
    setOverrideTime(record.check_in_time || '09:00:00');
    setOverrideRemarks('');
  };

  const handleCloseOverride = () => {
    setOverrideModal(null);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideRemarks.trim()) {
      showToast('Please provide an override reason remark.', 'error');
      return;
    }

    setOverrideSaving(true);
    try {
      const payload = {
        userId: overrideModal.user_id,
        date: overrideModal.date,
        status: overrideStatus,
        checkInTime: overrideStatus === 'Absent' ? null : overrideTime,
        remarks: overrideRemarks,
        session_id: overrideModal.session_id // Add session_id!
      };

      const data = await api.put('/attendance/admin/manual', payload);
      showToast(data.message || 'Attendance manually updated.');
      setOverrideModal(null);
      fetchTrackingData(); // reload
    } catch (error) {
      showToast(error.message || 'Override failed.', 'error');
    } finally {
      setOverrideSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  // Filter local logic
  const filteredRecords = records.filter(row => {
    const matchesSearch = searchQuery === '' ||
      row.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.employee_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = deptFilter === '' || row.department === deptFilter;
    const matchesStatus = statusFilter === '' || row.status === statusFilter;
    const matchesSession = sessionFilter === '' || String(row.session_id) === sessionFilter;

    const matchesStart = startDate === '' || row.date >= startDate;
    const matchesEnd = endDate === '' || row.date <= endDate;

    return matchesSearch && matchesDept && matchesStatus && matchesSession && matchesStart && matchesEnd;
  });

  const departments = [...new Set(records.map(r => r.department).filter(Boolean))];

  return (
    <div>
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Filters control bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Search employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
            <Filter size={16} color="var(--text-secondary)" />
            <select
              className="form-control"
              style={{ appearance: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px' }}>
            <select
              className="form-control"
              style={{ appearance: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
            >
              <option value="">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '150px' }}>
            <select
              className="form-control"
              style={{ appearance: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <input
              type="date"
              className="form-control"
              style={{ width: '135px', padding: '10px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="form-control"
              style={{ width: '135px', padding: '10px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Tabular checklist display */}
        <div className="table-container">
          {filteredRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No attendance check-in logs match your filters.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <table className="custom-table desktop-only-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee Name</th>
                    <th>Employee ID</th>
                    <th>Department</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th>Check-in Time</th>
                    <th>GPS Coordinates</th>
                    <th>Captured Photo</th>
                    <th>Biometric Check</th>
                    <th>Device / Browser Info</th>
                    <th>Remarks / Override</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((row) => (
                    <tr key={row.id}>
                      <td data-label="Date" style={{ fontWeight: 600 }}>{row.date}</td>
                      <td data-label="Employee Name">{row.employee_name}</td>
                      <td data-label="Employee ID">{row.employee_id}</td>
                      <td data-label="Department">{row.department}</td>
                      <td data-label="Session">
                        <div style={{ fontWeight: 600 }}>{row.session_title || 'N/A'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{row.session_type || 'N/A'}</div>
                      </td>
                      <td data-label="Status">
                        <span className={`badge ${
                          row.status === 'Present' ? 'badge-present' :
                          row.status === 'Late' ? 'badge-late' : 'badge-absent'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td data-label="Check-in Time" style={{ fontFamily: 'monospace' }}>{row.check_in_time || '--:--'}</td>
                      <td data-label="GPS Coordinates">
                        {row.latitude && row.latitude !== 0 ? (
                          <button
                            onClick={() => handleOpenMap(row.latitude, row.longitude, row.employee_name)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', border: '1px solid rgba(99,102,241,0.2)', width: '100%', minHeight: '44px' }}
                          >
                            <MapPin size={12} color="var(--primary)" />
                            <span>Show Map</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>N/A</span>
                        )}
                      </td>
                      <td data-label="Captured Photo">
                        {row.attendance_photo_url ? (
                          <button
                            onClick={() => handleOpenPhoto(row.id, row.employee_name)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', border: '1px solid rgba(16,185,129,0.2)', width: '100%', minHeight: '44px' }}
                          >
                            <Camera size={12} color="var(--status-present)" />
                            <span>View Photo</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>N/A</span>
                        )}
                      </td>
                      <td data-label="Biometric Check">
                        {row.face_match_score !== null && row.face_match_score !== undefined ? (
                          <span className={`badge ${row.face_match_score >= 60 ? 'badge-present' : 'badge-late'}`} style={{ fontWeight: 700 }}>
                            {row.face_match_score.toFixed(0)}% Match
                          </span>
                        ) : row.face_verified === 1 ? (
                          <span style={{ color: 'var(--status-present)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <CheckCircle2 size={12} />
                            Liveness OK
                          </span>
                        ) : (
                          <span style={{ color: 'var(--status-absent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            <ShieldAlert size={12} />
                            No Verify
                          </span>
                        )}
                      </td>
                      <td
                        data-label="Device / Browser Info"
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={row.device_info}
                      >
                        {row.device_info || 'N/A'}
                      </td>
                      <td data-label="Remarks / Override" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.remarks}
                      </td>
                      <td data-label="Actions" className="actions-cell" style={{ textAlign: 'right' }}>
                        <div className="actions-flex" style={{ width: '100%' }}>
                          <button
                            onClick={() => handleOpenOverride(row)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', minHeight: '44px', width: '100%' }}
                            title="Override Status"
                          >
                            <Edit size={12} />
                            <span>Override</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards View */}
              <div className="attendance-mobile-list">
                {filteredRecords.map((row) => (
                  <div key={row.id} className="attendance-card">
                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Date</div>
                      <div className="attendance-card-value">{row.date}</div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Employee</div>
                      <div className="attendance-card-value">
                        <div style={{ fontWeight: 600 }}>{row.employee_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {row.employee_id} | {row.department}</div>
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Session</div>
                      <div className="attendance-card-value">
                        <div style={{ fontWeight: 600 }}>{row.session_title || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{row.session_type || 'N/A'}</div>
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Status</div>
                      <div className="attendance-card-value">
                        <span className={`badge ${
                          row.status === 'Present' ? 'badge-present' :
                          row.status === 'Late' ? 'badge-late' : 'badge-absent'
                        }`}>
                          {row.status}
                        </span>
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Check-in Time</div>
                      <div className="attendance-card-value" style={{ fontFamily: 'monospace' }}>
                        {row.check_in_time || '--:--'}
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Biometric Check</div>
                      <div className="attendance-card-value">
                        {row.face_match_score !== null && row.face_match_score !== undefined ? (
                          <span className={`badge ${row.face_match_score >= 60 ? 'badge-present' : 'badge-late'}`} style={{ fontWeight: 700 }}>
                            {row.face_match_score.toFixed(0)}% Match
                          </span>
                        ) : row.face_verified === 1 ? (
                          <span style={{ color: 'var(--status-present)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <CheckCircle2 size={14} />
                            Liveness OK
                          </span>
                        ) : (
                          <span style={{ color: 'var(--status-absent)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            <ShieldAlert size={14} />
                            No Verify
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Device Info</div>
                      <div className="attendance-card-value" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {row.device_info || 'N/A'}
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Remarks</div>
                      <div className="attendance-card-value" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {row.remarks || 'No remarks'}
                      </div>
                    </div>

                    <div className="attendance-card-row" style={{ borderBottom: 'none' }}>
                      <div className="attendance-card-label">Actions & Location</div>
                      <div className="attendance-card-actions" style={{ width: '100%' }}>
                        {row.latitude && row.latitude !== 0 && (
                          <button
                            onClick={() => handleOpenMap(row.latitude, row.longitude, row.employee_name)}
                            className="btn btn-secondary"
                            style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <MapPin size={14} color="var(--primary)" />
                            <span>Show Map</span>
                          </button>
                        )}

                        {row.attendance_photo_url && (
                          <button
                            onClick={() => handleOpenPhoto(row.id, row.employee_name)}
                            className="btn btn-secondary"
                            style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Camera size={14} color="var(--status-present)" />
                            <span>View Photo</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenOverride(row)}
                          className="btn btn-secondary"
                          style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--primary)' }}
                        >
                          <Edit size={14} color="var(--primary)" />
                          <span style={{ color: 'var(--primary)' }}>Override Status</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Map Overlay Modal */}
      {selectedMapCoords && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7,10,19,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '24px', position: 'relative' }}>
            <button
              onClick={handleCloseMap}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Map size={20} color="var(--primary)" />
              <span>Verify Location: {selectedMapCoords.name}</span>
            </h3>

            {/* Embedded maps iframe (pure, offline-friendly OSM coordinate visualization) */}
            <div className="map-embed">
              <iframe
                title="Check-in Location Map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${selectedMapCoords.lat},${selectedMapCoords.lng}&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Latitude: <b>{selectedMapCoords.lat.toFixed(6)}</b></span>
              <span>Longitude: <b>{selectedMapCoords.lng.toFixed(6)}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {overrideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7,10,19,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '28px', position: 'relative' }}>
            <button
              onClick={handleCloseOverride}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardSignature size={20} color="var(--primary)" />
              <span>Override Attendance</span>
            </h3>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div>Employee: <b>{overrideModal.employee_name} ({overrideModal.employee_id})</b></div>
              <div>Target Date: <b>{overrideModal.date}</b></div>
            </div>

            <form onSubmit={handleSaveOverride}>
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select
                  className="form-control"
                  style={{ appearance: 'none', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  disabled={overrideSaving}
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              {overrideStatus !== 'Absent' && (
                <div className="form-group">
                  <label className="form-label">Check-in Time (24h format)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 09:12:00"
                    value={overrideTime}
                    onChange={(e) => setOverrideTime(e.target.value)}
                    required
                    disabled={overrideSaving}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Reason for Manual Update</label>
                <textarea
                  className="form-control"
                  style={{ height: '80px', resize: 'none' }}
                  placeholder="e.g. Forgot to mark check-in, system error, or offsite assignment..."
                  value={overrideRemarks}
                  onChange={(e) => setOverrideRemarks(e.target.value)}
                  required
                  disabled={overrideSaving}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCloseOverride} disabled={overrideSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={overrideSaving}>
                  {overrideSaving ? 'Saving...' : 'Apply Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {/* Captured Photo Overlay Modal */}
      {photoModalRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7,10,19,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative', textAlign: 'center' }}>
            <button
              onClick={handleClosePhoto}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Camera size={20} color="var(--primary)" />
              <span>Captured Attendance Photo</span>
            </h3>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', marginBottom: '16px', fontSize: '0.85rem' }}>
              Employee: <b>{photoModalRecord.name}</b>
            </div>

            <div
              style={{
                width: '100%',
                aspectRatio: '1/1',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '1px solid var(--border-card)',
                background: 'rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {photoLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading photo...</span>
                </div>
              ) : photoBlobUrl ? (
                <img
                  src={photoBlobUrl}
                  alt={`Attendance captured photo for ${photoModalRecord.name}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--status-absent)' }}>Failed to load image.</span>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceTracking;
