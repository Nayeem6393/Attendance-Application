import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/api.js';
import WebcamCapture from '../components/WebcamCapture.jsx';
import { ShieldCheck, Info, ScanFace } from 'lucide-react';

export const FaceIdEnrollment = () => {
  const { user, refreshUserSession, showToast } = useAuth();
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCaptureComplete = async (referencePhoto) => {
    setSubmitting(true);
    try {
      // POST the base64 reference photo to backend
      await api.post('/face/register-photo', { referencePhoto });
      showToast('Reference photo saved successfully.');
      setEnrolled(true);
      await refreshUserSession(); // Update status locally
    } catch (error) {
      showToast(error.message || 'Reference photo registration failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/employee/dashboard');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
        
        {enrolled ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
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
              face bio metric is sucessfully completed
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.6 }}>
              Your secure mathematical face biometric signature has been uploaded and stored. 
              Your raw face image was processed purely in memory and was **not** stored, protecting your privacy.
              <br /><br />
              You are now fully authorized to use biometric verify to check in for work!
            </p>

            <button onClick={handleBackToDashboard} className="btn btn-primary" style={{ padding: '12px 36px' }}>
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} id="enroll-split">
            
            {/* Left side instructions */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScanFace color="var(--primary)" />
                <span>Biometric Enrollment</span>
              </h2>
              
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                Set up your high-security Face ID template. This system records geometric relative distances of key facial coordinates, converting them to a 128-float vector.
              </p>

              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.05)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  marginBottom: '20px',
                  display: 'flex',
                  gap: '12px',
                  fontSize: '0.825rem',
                  lineHeight: 1.5
                }}
              >
                <Info color="var(--primary)" size={20} style={{ flexShrink: 0 }} />
                <div>
                  <h5 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Scan Guidelines:</h5>
                  <ul style={{ paddingLeft: '14px', color: 'var(--text-secondary)' }}>
                    <li>Ensure you are in a well-lit environment.</li>
                    <li>Align your face within the glowing oval guide.</li>
                    <li>Slowly follow instructions on the screen: turn left, right, and blink to verify liveness.</li>
                  </ul>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                * Privacy notice: Only encrypted floating-point geometry templates are saved. Standard RGB photo frames are discarded immediately after local hashing.
              </div>
            </div>

            {/* Right side interactive scanning component */}
            <div>
              {submitting ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px' }}>
                  <div className="spinner" style={{ width: '40px', height: '40px', marginBottom: '16px' }}></div>
                  <p>Processing visual signatures...</p>
                </div>
              ) : (
                <WebcamCapture
                  isEnrollment={true}
                  employeeEmail={user.email}
                  onCaptureComplete={handleCaptureComplete}
                />
              )}
            </div>

          </div>
        )}

      </div>

      <style>{`
        @media (max-width: 768px) {
          #enroll-split {
            display: flex !important;
            flex-direction: column-reverse !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FaceIdEnrollment;
