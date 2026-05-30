import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { Calendar, Filter, MapPin, CalendarDays, CheckCircle2, Award } from 'lucide-react';

export const AttendanceHistory = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, late: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/attendance/my-history');
      setHistory(data.history || []);
      setSummary(data.summary || { present: 0, absent: 0, late: 0, total: 0 });
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  // Filter history logic
  const filteredHistory = history.filter(record => {
    const matchesStatus = statusFilter === '' || record.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      record.date.includes(searchQuery) ||
      (record.remarks && record.remarks.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  // Calculate attendance rate
  const attendanceRate = summary.total > 0
    ? (((summary.present + summary.late) / summary.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      {/* Visual Header Summary Grid */}
      <div className="metrics-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'var(--status-present-glow)', color: 'var(--status-present)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <Award size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{attendanceRate}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Attendance Rate</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'rgba(128,128,128,0.1)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <CalendarDays size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{summary.total}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Tracked Days</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'var(--status-present-glow)', color: 'var(--status-present)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{summary.present}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Present (On-Time)</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', background: 'var(--status-late-glow)', color: 'var(--status-late)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{summary.late}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Late Days</div>
          </div>
        </div>
      </div>

      {/* Primary table panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Filters control bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Search by date (YYYY-MM-DD) or remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px' }}>
            <Filter size={16} color="var(--text-secondary)" />
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
        </div>

        {/* Attendance history logs table */}
        <div className="table-container">
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No check-in logs match your active filters.
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
                    <th>Match Score</th>
                    <th>Coordinates (Lat, Lng)</th>
                    <th>Location</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((record) => (
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
                      <td data-label="Check-in Time" style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {record.check_in_time || '--:--'}
                      </td>
                      <td data-label="Match Score" style={{ fontWeight: 700, color: record.face_match_score >= 60 ? 'var(--status-present)' : 'var(--text-secondary)' }}>
                        {record.face_match_score ? `${record.face_match_score}%` : 'N/A'}
                      </td>
                      <td data-label="Coordinates (Lat, Lng)">
                        {record.latitude ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                            <MapPin size={12} color="var(--primary)" />
                            <span>
                              {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                              <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                                (±{record.location_accuracy ? record.location_accuracy.toFixed(0) : 0}m)
                              </span>
                            </span>
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td data-label="Location">
                        {record.latitude && record.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8rem',
                              minHeight: '44px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              textDecoration: 'none',
                              color: 'var(--text-primary)',
                              background: 'var(--bg-dashboard)',
                              borderColor: 'var(--border-card)',
                              justifyContent: 'center',
                              width: '100%'
                            }}
                          >
                            <MapPin size={12} color="var(--primary)" />
                            <span>Open Maps</span>
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td data-label="Remarks" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {record.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards View */}
              <div className="attendance-mobile-list">
                {filteredHistory.map((record) => (
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
                      <div className="attendance-card-label">Face Match Score</div>
                      <div className="attendance-card-value" style={{ fontWeight: 700, color: record.face_match_score >= 60 ? 'var(--status-present)' : 'var(--text-secondary)' }}>
                        {record.face_match_score ? `${record.face_match_score}%` : 'N/A'}
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Location</div>
                      <div className="attendance-card-value" style={{ width: '100%' }}>
                        {record.latitude && record.longitude ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                              <MapPin size={12} color="var(--primary)" />
                              <span>
                                {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                                  (±{record.location_accuracy ? record.location_accuracy.toFixed(0) : 0}m)
                                </span>
                              </span>
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
  );
};

export default AttendanceHistory;
