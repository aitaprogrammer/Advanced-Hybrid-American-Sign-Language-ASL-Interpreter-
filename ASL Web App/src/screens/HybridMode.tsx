import { useState, useEffect, useCallback } from 'react';
import { useMediaPipe, type LandmarkPoint } from '../hooks/useMediaPipe';
import { predict, type Prediction } from '../hooks/useASLModel';
import { getDisplayLabel } from '../utils/labels';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { SentenceBuilder } from '../components/SentenceBuilder';

interface HybridModeProps { onBack: () => void; }

function randomConf() { return 0.78 + Math.random() * 0.2; }

export function HybridMode({ onBack }: HybridModeProps) {
  const { videoRef, canvasRef, isReady, isRunning, error,
          startCamera, stopCamera, setOnLandmarks } = useMediaPipe();
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [gloveConf,  setGloveConf]  = useState(0.85);
  const [sentence,   setSentence]   = useState('');

  // Simulate glove confidence fluctuation
  useEffect(() => {
    const t = setInterval(() => setGloveConf(randomConf()), 2000);
    return () => clearInterval(t);
  }, []);

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

  const cameraConf  = prediction?.confidence ?? 0;
  const combined    = prediction ? Math.min((cameraConf * 0.5 + gloveConf * 0.5 + 0.05), 1) : gloveConf * 0.5;
  const displayLabel = prediction ? getDisplayLabel(prediction.label) : '—';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={onBack} id="btn-back-hybrid">← Back</button>
        <span className="topbar-title">Hybrid Mode</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 99, background: 'rgba(124,58,237,0.12)', color: 'var(--purple)', fontWeight: 600 }}>
            🧤 Glove
          </span>
          {isRunning && <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 99, background: 'rgba(14,165,233,0.12)', color: 'var(--cyan)', fontWeight: 600 }}>
            📷 Camera
          </span>}
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="camera-container" style={{ borderColor: 'rgba(249,115,22,0.4)', boxShadow: '0 0 40px rgba(249,115,22,0.15)' }}>
          <video ref={videoRef} className="camera-video" muted playsInline autoPlay />
          <canvas ref={canvasRef} className="camera-canvas" />
          {!isRunning && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <div style={{ fontSize: '2.5rem' }}>♾️</div>
              <button className="btn btn-primary" id="btn-start-hybrid" onClick={startCamera} disabled={!isReady}>
                {isReady ? 'Start Hybrid' : 'Loading…'}
              </button>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Hybrid Verified</div>
            <div className="prediction-letter" style={{ background: 'linear-gradient(135deg, #F97316, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {displayLabel}
            </div>
          </div>
          <ConfidenceBar label="Glove"    value={gloveConf}  variant="indigo" />
          <ConfidenceBar label="Camera"   value={cameraConf} variant="cyan"   />
          <ConfidenceBar label="Combined" value={combined}   variant="green"  />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" id="btn-add-hybrid"
              onClick={() => prediction && setSentence(s => s + prediction.label)} disabled={!prediction}>
              ✚ Add
            </button>
            {isRunning
              ? <button className="btn btn-danger btn-sm" id="btn-stop-hybrid" onClick={stopCamera}>⏹ Stop</button>
              : <button className="btn btn-ghost btn-sm" id="btn-start-hybrid-2" onClick={startCamera} disabled={!isReady}>▶ Start</button>
            }
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <SentenceBuilder sentence={sentence}
            onSpeak={() => { window.speechSynthesis?.cancel(); window.speechSynthesis?.speak(new SpeechSynthesisUtterance(sentence)); }}
            onClear={() => setSentence('')}
            onBackspace={() => setSentence(s => s.slice(0, -1))} />
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        <div className="alert" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', color: 'var(--orange)' }}>
          ♾️ <strong>Hybrid Mode</strong> — Glove confidence is simulated. Camera inference is live.
        </div>
      </div>
    </div>
  );
}
