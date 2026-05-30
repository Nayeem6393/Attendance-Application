import React, { useEffect, useState } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, Filter, Trash2, Fingerprint, Search, ShieldCheck, ShieldX, Camera, X } from 'lucide-react';

export const EmployeeManagement = () => {
  const { showToast } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.get('/employees');
      setEmployees(data.employees || []);
    } catch (e) {
      console.error('Failed to load employee list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleResetFaceId = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you absolutely sure you want to reset the biometric reference photo for "${employeeName}"? This will require the employee to capture a new reference photo before they can mark attendance.`)) {
      return;
    }

    try {
      const data = await api.post(`/face/reset/${employeeId}`);
      showToast(data.message || 'Biometrics reset successfully.');
      fetchEmployees(); // reload
    } catch (error) {
      showToast(error.message || 'Failed to reset biometrics.', 'error');
    }
  };

  // Reference Photo Modal State
  const [refPhotoModalUser, setRefPhotoModalUser] = useState(null);
  const [refPhotoBlobUrl, setRefPhotoBlobUrl] = useState(null);
  const [refPhotoLoading, setRefPhotoLoading] = useState(false);

  const handleViewReferencePhoto = async (userId, employeeName) => {
    setRefPhotoModalUser({ id: userId, name: employeeName });
    setRefPhotoLoading(true);
    setRefPhotoBlobUrl(null);
    try {
      const blob = await api.download(`/face/photo/reference/${userId}`);
      const url = URL.createObjectURL(blob);
      setRefPhotoBlobUrl(url);
    } catch (err) {
      console.error('Failed to load reference photo:', err);
      showToast('Failed to load employee reference photo.', 'error');
    } finally {
      setRefPhotoLoading(false);
    }
  };

  const handleCloseRefPhoto = () => {
    if (refPhotoBlobUrl) {
      URL.revokeObjectURL(refPhotoBlobUrl);
    }
    setRefPhotoModalUser(null);
    setRefPhotoBlobUrl(null);
  };

  const handleDeleteEmployee = async (id, employeeName) => {
    if (!window.confirm(`WARNING: Deleting "${employeeName}" will permanently remove all their associated face templates and attendance check-in records. Procced?`)) {
      return;
    }

    try {
      const data = await api.del(`/employees/${id}`);
      showToast(data.message || 'Employee deleted successfully.');
      fetchEmployees(); // reload
    } catch (error) {
      showToast(error.message || 'Failed to delete employee.', 'error');
    }
  };

  const handleApprove = async (id, employeeName) => {
    try {
      const data = await api.put(`/employees/${id}/approve`);
      showToast(data.message || `Approved ${employeeName}.`);
      fetchEmployees();
    } catch (error) {
      showToast(error.message || 'Approve action failed.', 'error');
    }
  };

  const handleReject = async (id, employeeName) => {
    try {
      const data = await api.put(`/employees/${id}/reject`);
      showToast(data.message || `Rejected ${employeeName}.`);
      fetchEmployees();
    } catch (error) {
      showToast(error.message || 'Reject action failed.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  // Filter computations
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === '' || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesDept = deptFilter === '' || emp.department === deptFilter;
    const matchesStatus = statusFilter === '' || emp.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div>
      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Filters control bar */}
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, email, or employee ID..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Database tabular records */}
        <div className="table-container">
          {filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No registered employees match your active filters.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <table className="custom-table desktop-only-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Contact Details</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Face ID Status</th>
                    <th>Account Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td data-label="Employee ID" style={{ fontWeight: 600 }}>{emp.employee_id}</td>
                      <td data-label="Name">{emp.name}</td>
                      <td data-label="Contact Details">
                        <div style={{ fontSize: '0.8rem' }}>{emp.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.mobile}</div>
                      </td>
                      <td data-label="Department">{emp.department || 'N/A'}</td>
                      <td data-label="Designation">{emp.designation || 'N/A'}</td>
                      <td data-label="Face ID Status">
                        {emp.face_status === 'enrolled' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                            <span className="badge badge-present" style={{ gap: '4px', textTransform: 'none', width: '100%', justifyContent: 'center' }}>
                              <Fingerprint size={12} />
                              Enrolled
                            </span>
                            <button
                              onClick={() => handleViewReferencePhoto(emp.id, emp.name)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', minHeight: '28px', border: '1px solid rgba(99,102,241,0.2)', width: '100%', display: 'flex', justifyContent: 'center', gap: '4px' }}
                            >
                              <Camera size={10} />
                              <span>Show Photo</span>
                            </button>
                          </div>
                        ) : (
                          <span className="badge badge-absent" style={{ gap: '4px', textTransform: 'none', width: '100%', justifyContent: 'center' }}>
                            <Fingerprint size={12} />
                            Missing
                          </span>
                        )}
                      </td>
                      <td data-label="Account Status">
                        <span className={`badge ${
                          emp.status === 'active' ? 'badge-present' :
                          emp.status === 'pending' ? 'badge-pending' : 'badge-absent'
                        }`}>
                          {emp.status}
                        </span>
                      </td>
                      <td data-label="Actions" className="actions-cell" style={{ textAlign: 'right' }}>
                        <div className="actions-flex" style={{ display: 'inline-flex', gap: '8px' }}>
                          
                          {/* Approval operations */}
                          {emp.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(emp.id, emp.name)}
                                className="btn btn-primary"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', minHeight: '44px' }}
                                title="Approve Employee"
                              >
                                <ShieldCheck size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(emp.id, emp.name)}
                                className="btn btn-danger"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', minHeight: '44px' }}
                                title="Reject Employee"
                              >
                                <ShieldX size={14} />
                                Reject
                              </button>
                            </>
                          )}

                          {/* Reset Face ID */}
                          {emp.face_status === 'enrolled' && (
                            <button
                              onClick={() => handleResetFaceId(emp.employee_id, emp.name)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', minHeight: '44px' }}
                              title="Reset Biometrics"
                            >
                              <Fingerprint size={14} />
                              Reset Photo
                            </button>
                          )}

                          {/* Delete Employee */}
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="btn btn-danger"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '4px', minHeight: '44px' }}
                            title="Delete Employee"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                          
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards View */}
              <div className="attendance-mobile-list">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="attendance-card">
                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Employee ID</div>
                      <div className="attendance-card-value" style={{ fontWeight: 600 }}>{emp.employee_id}</div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Name</div>
                      <div className="attendance-card-value">{emp.name}</div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Contact Details</div>
                      <div className="attendance-card-value">
                        <div style={{ fontSize: '0.9rem' }}>{emp.email}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{emp.mobile}</div>
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Department & Designation</div>
                      <div className="attendance-card-value">
                        {emp.department || 'N/A'} {emp.designation ? `/ ${emp.designation}` : ''}
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Face ID Status</div>
                      <div className="attendance-card-value" style={{ width: '100%' }}>
                        {emp.face_status === 'enrolled' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <span className="badge badge-present" style={{ gap: '4px', textTransform: 'none', justifyContent: 'center', minHeight: '32px' }}>
                              <Fingerprint size={14} />
                              Enrolled
                            </span>
                            <button
                              onClick={() => handleViewReferencePhoto(emp.id, emp.name)}
                              className="btn btn-secondary"
                              style={{ width: '100%', minHeight: '44px', display: 'flex', justifyContent: 'center', gap: '6px' }}
                            >
                              <Camera size={14} />
                              <span>Show Reference Photo</span>
                            </button>
                          </div>
                        ) : (
                          <span className="badge badge-absent" style={{ gap: '4px', textTransform: 'none', justifyContent: 'center', minHeight: '32px', width: '100%' }}>
                            <Fingerprint size={14} />
                            Missing
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="attendance-card-row">
                      <div className="attendance-card-label">Account Status</div>
                      <div className="attendance-card-value">
                        <span className={`badge ${
                          emp.status === 'active' ? 'badge-present' :
                          emp.status === 'pending' ? 'badge-pending' : 'badge-absent'
                        }`} style={{ minHeight: '28px', textTransform: 'uppercase', justifyContent: 'center', padding: '4px 12px' }}>
                          {emp.status}
                        </span>
                      </div>
                    </div>

                    <div className="attendance-card-row" style={{ borderBottom: 'none' }}>
                      <div className="attendance-card-label">Administrative Actions</div>
                      <div className="attendance-card-actions" style={{ width: '100%' }}>
                        
                        {/* Approval operations */}
                        {emp.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(emp.id, emp.name)}
                              className="btn btn-primary"
                              style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <ShieldCheck size={14} />
                              <span>Approve Account</span>
                            </button>
                            <button
                              onClick={() => handleReject(emp.id, emp.name)}
                              className="btn btn-danger"
                              style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <ShieldX size={14} />
                              <span>Reject Account</span>
                            </button>
                          </>
                        )}

                        {/* Reset Face ID */}
                        {emp.face_status === 'enrolled' && (
                          <button
                            onClick={() => handleResetFaceId(emp.employee_id, emp.name)}
                            className="btn btn-secondary"
                            style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--primary)' }}
                          >
                            <Fingerprint size={14} color="var(--primary)" />
                            <span style={{ color: 'var(--primary)' }}>Reset Reference Photo</span>
                          </button>
                        )}

                        {/* Delete Employee */}
                        <button
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          className="btn btn-danger"
                          style={{ width: '100%', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Trash2 size={14} />
                          <span>Delete Employee</span>
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
    {/* Reference Photo Overlay Modal */}
      {refPhotoModalUser && (
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
              onClick={handleCloseRefPhoto}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <Camera size={20} color="var(--primary)" />
              <span>Biometric Reference Photo</span>
            </h3>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)', marginBottom: '16px', fontSize: '0.85rem' }}>
              Employee: <b>{refPhotoModalUser.name}</b>
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
              {refPhotoLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px' }}></div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading photo...</span>
                </div>
              ) : refPhotoBlobUrl ? (
                <img
                  src={refPhotoBlobUrl}
                  alt={`Biometric reference photo for ${refPhotoModalUser.name}`}
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

export default EmployeeManagement;
