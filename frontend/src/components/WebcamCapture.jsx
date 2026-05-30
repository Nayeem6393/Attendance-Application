import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

export const WebcamCapture = ({
  isEnrollment = false,
  employeeEmail = '',
  onCaptureComplete
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // prompt, granted, denied
  const [promptMessage, setPromptMessage] = useState('Keep your face visible');
  const [scanState, setScanState] = useState('idle'); // idle, success, failed
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  // Start camera stream
  const startCamera = async () => {
    setPromptMessage('Requesting camera permission...');
    setScanState('idle');
    setCapturedPhoto(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      setStream(mediaStream);
      setCameraPermission('granted');
      setPromptMessage('Keep your face visible');
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Webcam launch error:', error);
      setCameraPermission('denied');
      setScanState('failed');
      setPromptMessage('Camera permission denied or unavailable.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (cameraPermission === 'granted' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraPermission, stream]);

  // Capture photo from video stream
  const handleCapture = () => {
    const video = videoRef.current;
    
    // Create temporary canvas to grab current frame at high resolution
    const tempCanvas = document.createElement('canvas');
    if (video) {
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        // Draw mirror-flipped image for natural webcam capture
        ctx.translate(tempCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const base64Image = tempCanvas.toDataURL('image/jpeg', 0.82);
        setCapturedPhoto(base64Image);
        setScanState('success');
        setPromptMessage('Photo captured successfully');

        // Pause video stream visually
        video.pause();

        // Trigger capture callback
        onCaptureComplete(base64Image);
      }
    }
  };

  const handleRetry = () => {
    const video = videoRef.current;
    if (video) {
      video.play();
    }
    setScanState('idle');
    setCapturedPhoto(null);
    setPromptMessage('Keep your face visible');
  };

  const handleAllowClick = () => {
    setCameraPermission('prompt');
    setPromptMessage('Re-requesting camera stream...');
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Visual Canvas frame container */}
      <div className="scanner-container">
        {cameraPermission === 'granted' && stream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="scanner-video"
            />
            
            <div className="scanner-overlay">
              <div className="scanner-hud">
                <div>SENSOR: ACTIVE</div>
                <div>POSE: {isEnrollment ? 'REFERENCE_CAPTURE' : 'ATTENDANCE_CAPTURE'}</div>
              </div>
              
              {/* Glowing biometric guide oval (non-blocking visual aid) */}
              <div className={`scanner-oval ${scanState}`}></div>
              
              <div className="scanner-hud" style={{ alignSelf: 'flex-end' }}>
                <div>LIVE: RESOLVED</div>
              </div>
            </div>
          </>
        ) : (
          <div className="map-placeholder">
            {cameraPermission === 'denied' ? (
              <>
                <CameraOff size={48} color="var(--status-absent)" style={{ marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Camera Permission Blocked</h3>
                <p style={{ fontSize: '0.8rem', marginBottom: '14px', lineHeight: 1.5 }}>
                  Webcam access is critical to register/verify your Face photo.
                  <br />
                  <span style={{ color: 'var(--status-late)', fontWeight: 600 }}>Tip: Click the 🔒 lock icon in your address bar and change Camera from "Block" to "Allow".</span>
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ gap: '8px', padding: '10px 20px', fontSize: '0.85rem' }}
                  onClick={handleAllowClick}
                >
                  <Camera size={16} />
                  <span>Allow Camera Access</span>
                </button>
              </>
            ) : (
              <>
                <div className="spinner" style={{ width: '40px', height: '40px', marginBottom: '16px' }}></div>
                <h3>Awaiting Webcam...</h3>
              </>
            )}
          </div>
        )}
      </div>

      {/* Prompts box */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '24px',
          border: '1px dashed var(--border-glass)',
        }}
      >
        <div
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: scanState === 'success' ? 'var(--status-present)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {scanState === 'success' ? <CheckCircle2 size={16} /> : <Sparkles size={16} color="var(--primary)" />}
          <span>{promptMessage}</span>
        </div>
      </div>

      {/* Trigger Buttons */}
      {cameraPermission === 'granted' && stream && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '440px' }}>
          {scanState !== 'success' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCapture}
              style={{
                width: '100%',
                background: 'var(--status-present)',
                color: '#fff',
                fontSize: '1.05rem',
                fontWeight: '700',
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 15px var(--status-present-glow)',
                minHeight: '48px',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                touchAction: 'manipulation'
              }}
            >
              <Camera size={20} />
              <span>{isEnrollment ? 'Capture Reference Photo' : 'Capture Attendance Photo'}</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetry}
              style={{ gap: '8px', width: '100%' }}
            >
              <RotateCcw size={16} />
              <span>Retake Photo</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
};

export default WebcamCapture;
