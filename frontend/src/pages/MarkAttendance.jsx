import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import WebcamCapture from '../components/WebcamCapture.jsx';
import { MapPin, ShieldAlert, CheckCircle, Navigation, ShieldCheck, Clock, HelpCircle, Send } from 'lucide-react';

export const MarkAttendance = () => {
  const { user, showToast } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  // Geolocation states
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState(null);
  const [coords, setCoords] = useState(null);

  // Today status states
  const [todayLoading, setTodayLoading] = useState(true);
  const [windowStatus, setWindowStatus] = useState('open');
  const [lateRequest, setLateRequest] = useState(null);
  const [requestingLate, setRequestingLate] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);

  // Verification & Mark states
  const [capturedEmbedding, setCapturedEmbedding] = useState(null);
  const [marking, setMarking] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [faceError, setFaceError] = useState('');

  // Fetch today's window status and overrides
  const fetchTodayStatus = async () => {
    if (!sessionId) {
      showToast('Session ID is missing.', 'error');
      navigate('/employee/dashboard');
      return;
    }

    try {
      setTodayLoading(true);
      const data = await api.get(`/attendance/today?session_id=${sessionId}`);
      setWindowStatus(data.windowStatus || 'open');
      setLateRequest(data.lateRequest);
      setSessionDetails(data.settings);
    } catch (e) {
      console.error('Failed to load today status:', e);
      showToast('Failed to acquire attendance time rules.', 'error');
    } finally {
      setTodayLoading(false);
    }
  };

  // Request GPS coordinates
  const requestLocation = () => {
    setGpsLoading(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setGpsLoading(false);
        showToast('Live GPS coordinates locked.');
      },
      (error) => {
        console.error('GPS extraction error:', error);
        let errorMsg = 'Failed to fetch GPS coordinates. Please enable location permissions.';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied by user. Access is blocked.';
        }
        setGpsError(errorMsg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    fetchTodayStatus();
    requestLocation();
  }, []);

  // Submit request to admin for late check-in override
  const handleRequestLate = async () => {
    setRequestingLate(true);
    try {
      const data = await api.post('/attendance/late-request', {
        reason: `Late check-in override requested for session ID: ${sessionId}`
      });
      showToast(data.message || 'Late check-in request sent to admin.');
      await fetchTodayStatus(); // refresh states
    } catch (error) {
      showToast(error.message || 'Failed to submit request.', 'error');
    } finally {
      setRequestingLate(false);
    }
  };

  // Submit final attendance to backend
  const handleFinalSubmit = async (attendancePhoto) => {
    if (!sessionId) {
      showToast('Session ID is missing.', 'error');
      return;
    }
    if (!coords || !attendancePhoto) {
      showToast('Awaiting GPS lock or biometric scan.', 'error');
      return;
    }

    setMarking(true);
    setFaceError('');
    try {
      const payload = {
        session_id: parseInt(sessionId, 10),
        latitude: coords.latitude,
        longitude: coords.longitude,
        location_accuracy: coords.accuracy,
        device_info: navigator.userAgent,
        attendancePhoto
      };

      const data = await api.post('/attendance/mark', payload);
      showToast('attendance marked successfully');
      setSuccessData(data.record);
    } catch (error) {
      setFaceError(error.message || 'Face comparison failed. Ensure your face is clearly visible and matches your enrolled profile.');
      showToast(error.message || 'Face verification failed. Please try again.', 'error');
    } finally {
      setMarking(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/employee/dashboard');
  };

  if (todayLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        
        {successData ? (
          /* Check-in Success Banner */
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--status-present-glow)',
                border: '2px solid var(--status-present)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 15px var(--status-present-glow)'
              }}
            >
              <CheckCircle size={36} color="var(--status-present)" />
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
              attendance marked successfully
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
              Your attendance status has been registered as <b style={{ color: 'var(--text-primary)' }}>{successData.status}</b>.
              <br /><br />
              Check-in Time: <b style={{ color: 'var(--text-primary)' }}>{successData.time}</b> | Remarks: <i style={{ color: 'var(--text-primary)' }}>{successData.remarks}</i>
            </p>

            <button onClick={handleBackToDashboard} className="btn btn-primary" style={{ padding: '12px 36px' }}>
              Go to Dashboard
            </button>
          </div>
        ) : windowStatus === 'closed' ? (
          /* Block Screen - Attendance Window Closed */
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--status-absent-glow)',
                border: '2px solid var(--status-absent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 0 15px var(--status-absent-glow)',
                color: 'var(--status-absent)'
              }}
            >
              <Clock size={32} />
            </div>

            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '8px', color: 'var(--status-absent)' }}>
              attendance time is over
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px', lineHeight: 1.6 }}>
              The standard check-in window for today has closed. You cannot access the camera scanning interface at this time.
            </p>

            {/* Overrides / Requests workflow display */}
            <div
              className="glass-card"
              style={{
                maxWidth: '480px',
                margin: '0 auto',
                padding: '24px',
                textAlign: 'left',
                background: 'rgba(255,255,255,0.01)',
                borderColor: 'var(--border-card)'
              }}
            >
              {!lateRequest ? (
                <>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-primary)', fontSize: '1rem' }}>
                    <HelpCircle size={18} color="var(--primary)" />
                    <span>Late Login Override Request</span>
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                    If you are signing in late due to an off-site assignment or technical difficulty, you can submit a late login request. Once accepted by an admin, your attendance button will be re-enabled.
                  </p>
                  <button
                    onClick={handleRequestLate}
                    disabled={requestingLate}
                    className="btn btn-primary"
                    style={{ width: '100%', gap: '8px' }}
                  >
                    {requestingLate ? (
                      <>
                        <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Request Admin</span>
                      </>
                    )}
                  </button>
                </>
              ) : lateRequest.status === 'pending' ? (
                <div style={{ textAlign: 'center' }}>
                  <div className="spinner" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }}></div>
                  <h4 style={{ color: '#eab308', marginBottom: '8px', fontSize: '0.95rem' }}>Late Check-in Request Pending Approval</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Your request was submitted at {new Date(lateRequest.created_at || Date.now()).toLocaleTimeString()}. Please wait for your administrator to approve your request.
                  </p>
                </div>
              ) : lateRequest.status === 'rejected' ? (
                <div>
                  <h4 style={{ color: 'var(--status-absent)', marginBottom: '8px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} />
                    <span>Late Request Declined</span>
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                    Your administrator rejected your late login request. Standard office guidelines apply.
                  </p>
                  <button
                    onClick={handleRequestLate}
                    disabled={requestingLate}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                  >
                    Re-request Permission
                  </button>
                </div>
              ) : null}
            </div>

            <button onClick={handleBackToDashboard} className="btn btn-secondary" style={{ marginTop: '24px', padding: '10px 24px' }}>
              Return to Dashboard
            </button>
          </div>
        ) : (
          /* Normal Attendance Marking UI */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }} id="mark-split">
            
            {/* Left GPS Telemetry Panel */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Navigation color="var(--primary)" size={24} />
                <span>Verify Check-in Gate</span>
              </h2>

              {/* Location Permission Status Indicators */}
              <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
                {gpsLoading ? (
                  <span className="badge badge-late" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                    Location Required
                  </span>
                ) : gpsError ? (
                  <span className="badge badge-absent" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-absent)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-absent)', display: 'inline-block' }}></span>
                    Location Denied
                  </span>
                ) : coords ? (
                  <span className="badge badge-present" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'var(--status-present)', border: '1px solid rgba(22, 163, 74, 0.3)', padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-present)', display: 'inline-block', boxShadow: '0 0 6px var(--status-present)' }}></span>
                    Location Captured
                  </span>
                ) : null}
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                Attendance submission requires dual-factor authentication: verified GPS location boundaries and biometric face match.
              </p>

              {/* GPS status cards */}
              <div
                className="glass-card"
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  borderColor: gpsError ? 'rgba(239, 68, 68, 0.2)' : coords ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-glass)',
                  padding: '20px',
                  marginBottom: '20px'
                }}
              >
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  <MapPin color={gpsError ? 'var(--status-absent)' : coords ? 'var(--status-present)' : 'var(--text-secondary)'} size={18} />
                  <span>GPS Geolocation Telemetry</span>
                </h4>

                {gpsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                    <span>Locating satellites and acquiring lock...</span>
                  </div>
                ) : gpsError ? (
                  <div style={{ color: 'var(--status-absent)', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>GPS Lock Failed:</div>
                    <div>{gpsError}</div>
                    <button onClick={requestLocation} className="btn btn-secondary" style={{ marginTop: '12px', padding: '6px 12px', fontSize: '0.75rem', minHeight: '44px' }}>
                      Re-request Permission
                    </button>
                  </div>
                ) : coords ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>Latitude: <b style={{ color: 'var(--text-primary)' }}>{coords.latitude.toFixed(6)}</b></div>
                    <div>Longitude: <b style={{ color: 'var(--text-primary)' }}>{coords.longitude.toFixed(6)}</b></div>
                    <div>Accuracy Radius: <b style={{ color: 'var(--text-primary)' }}>{coords.accuracy.toFixed(1)} meters</b></div>
                    <div style={{ color: 'var(--status-present)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                      <ShieldCheck size={14} />
                      GPS Integrity Verified
                    </div>
                  </div>
                ) : null}
              </div>

              {gpsError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid var(--status-absent)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    color: 'var(--status-absent)',
                    fontSize: '0.8rem',
                    lineHeight: 1.5
                  }}
                >
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <ShieldAlert size={16} />
                    GPS Block Active
                  </div>
                  Attendance marking is disabled without location permissions. Please verify browser settings.
                </div>
              )}
            </div>

            {/* Right Face Capture panel */}
            <div>
              {faceError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid var(--status-absent)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    color: 'var(--status-absent)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    lineHeight: 1.5
                  }}
                >
                  <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                  <span>{faceError}</span>
                </div>
              )}

              {gpsError ? (
                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Camera scan blocked until GPS location is acquired.
                </div>
              ) : gpsLoading ? (
                <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '12px' }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Waiting for location...</p>
                </div>
              ) : marking ? (
                <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <div className="spinner" style={{ width: '32px', height: '32px', marginBottom: '12px' }}></div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Verifying face...</p>
                </div>
              ) : (
                /* Webcam Scan Feed */
                <WebcamCapture
                  isEnrollment={false}
                  employeeEmail={user.email}
                  onCaptureComplete={handleFinalSubmit}
                />
              )}
            </div>

          </div>
        )}

      </div>

      <style>{`
        @media (max-width: 768px) {
          #mark-split {
            display: flex !important;
            flex-direction: column-reverse !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MarkAttendance;
