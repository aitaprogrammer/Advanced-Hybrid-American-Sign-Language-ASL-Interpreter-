import { useState, useEffect, useCallback } from 'react';
import { useMediaPipe, type LandmarkPoint } from '../hooks/useMediaPipe';
import { predict, type Prediction } from '../hooks/useASLModel';
import { getDisplayLabel } from '../utils/labels';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { SentenceBuilder } from '../components/SentenceBuilder';

interface CameraModeProps {
  onBack: () => void;
}

export function CameraMode({ onBack }: CameraModeProps) {
  const { videoRef, canvasRef, isReady, isRunning, error,
          startCamera, stopCamera, setOnLandmarks } = useMediaPipe();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [sentence, setSentence] = useState('');

  const onLandmarks = useCallback(async (lms: LandmarkPoint[] | null) => {
    if (!lms) { setPrediction(null); return; }
    try {
      const video = videoRef.current;
      const vw = video?.videoWidth  || 640;
      const vh = video?.videoHeight || 480;
      setPrediction(await predict(lms, vw, vh));
    } catch { /* ignore */ }
  }, [videoRef]);

  useEffect(() => {
    setOnLandmarks(onLandmarks);
    return () => setOnLandmarks(null);
  }, [onLandmarks, setOnLandmarks]);

  const displayLabel = prediction ? getDisplayLabel(prediction.label) : '—';
  const confidence   = prediction?.confidence ?? 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={onBack} id="btn-back-camera">← Back</button>
        <span className="topbar-title">Camera Mode</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isRunning && <><span className="status-dot"/><span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Live</span></>}
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {!isReady && <div className="alert alert-error" style={{ textAlign: 'center' }}>{error || 'Loading MediaPipe AI model…'}</div>}
        {error && isReady && <div className="alert alert-error">{error}</div>}

        <div className="camera-container">
          <video ref={videoRef} className="camera-video" muted playsInline autoPlay />
          <canvas ref={canvasRef} className="camera-canvas" />
          {isRunning && <div className="camera-overlay-badge"><span className="status-dot"/>Camera Active</div>}
          {!isRunning && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ fontSize: '3rem' }}>📷</div>
              <button className="btn btn-primary" id="btn-start-camera" onClick={startCamera} disabled={!isReady}>
                {isReady ? 'Start Camera' : 'Loading…'}
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '20px 24px', textAlign: 'center', gap: 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Detected Sign</div>
          <div className="prediction-letter">{displayLabel}</div>
          <ConfidenceBar label="Confidence" value={confidence} variant="cyan" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" id="btn-manual-add"
              onClick={() => prediction && setSentence(s => s + prediction.label)} disabled={!prediction}>
              ✚ Add Letter
            </button>
            {isRunning
              ? <button className="btn btn-danger btn-sm" id="btn-stop-camera" onClick={stopCamera}>⏹ Stop</button>
              : <button className="btn btn-ghost btn-sm" id="btn-start-camera-2" onClick={startCamera} disabled={!isReady}>▶ Start</button>
            }
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <SentenceBuilder sentence={sentence}
            onSpeak={() => { window.speechSynthesis?.cancel(); window.speechSynthesis?.speak(new SpeechSynthesisUtterance(sentence)); }}
            onClear={() => setSentence('')}
            onBackspace={() => setSentence(s => s.slice(0, -1))} />
        </div>
      </div>
    </div>
  );
}
