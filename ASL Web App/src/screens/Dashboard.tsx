import { useState, useEffect, useCallback, useRef } from 'react';
import { useMediaPipe, type LandmarkPoint } from '../hooks/useMediaPipe';
import { predict } from '../hooks/useASLModel';
import { useHybridModel } from '../hooks/useHybridModel';
import { getDisplayLabel } from '../utils/labels';
import { getCurrentUser, logoutUser } from '../utils/auth';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { SentenceBuilder } from '../components/SentenceBuilder';

/* ─── Types ─────────────────────────────────────────────────────────── */
type Tab = 'camera' | 'glove' | 'hybrid' | 'profile';

interface DashboardProps {
  onLogout: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════
   Dashboard — single mounted component; camera never unmounts.
   Glove Mode listens to native OS keystrokes from the BLE HID glove.
═══════════════════════════════════════════════════════════════════════ */
export function Dashboard({ onLogout }: DashboardProps) {
  const user = getCurrentUser();
  const [tab, setTab] = useState<Tab>('camera');

  /* ── Camera / MediaPipe ───────────────────────────────────────────── */
  const {
    videoRef, canvasRef, isReady, isRunning, error,
    startCamera, stopCamera, setOnLandmarks,
  } = useMediaPipe();

  /* ── Camera prediction state ──────────────────────────────────────── */
  const [predLabel, setPredLabel] = useState<string>('—');
  const [predConf,  setPredConf]  = useState<number>(0);
  const [sentence,  setSentence]  = useState<string>('');

  /* ── Glove state (real HID keyboard) ─────────────────────────────── */
  const [gloveSentence,  setGloveSentence]  = useState('');
  const [gloveLastKey,   setGloveLastKey]   = useState<string>('—');
  // gloveBarConf: continuously updated via RAF — decays 0.85→0 over 1 s after each keystroke
  const [gloveBarConf,   setGloveBarConf]   = useState(0);
  const gloveKeyTimeRef = useRef<number>(0);       // ms timestamp of last glove key
  const gloveRafRef     = useRef<number | null>(null);
  // Ref so the keydown handler always sees the latest tab without re-binding
  const tabRef = useRef<Tab>(tab);
  useEffect(() => { tabRef.current = tab; }, [tab]);

  /* ── Hybrid TFjs model ────────────────────────────────────────────── */
  // Hook is always called (React rules), but `active` controls whether the model loads.
  const {
    prediction: hybridCamPred,
    modelReady: hybridModelReady,
    modelError: hybridModelError,
  } = useHybridModel(videoRef, tab === 'hybrid');

  /* ── Hybrid: fuse camera TFjs model + glove keystroke ────────────── */
  // gloveLetter is the last key received from the physical glove (gloveLastKey).
  // We compare it to the camera prediction and pick the winner by confidence.
  const gloveConf     = 0.85; // The real glove Decision Tree typically has high certainty
  const gloveLetter   = gloveLastKey === '—' ? null : (gloveLastKey === 'SPACE' ? ' ' : gloveLastKey);

  const fusedLabel = (() => {
    if (!hybridCamPred || hybridCamPred.label === '—') return gloveLetter ?? '—';
    if (!gloveLetter) return hybridCamPred.label;
    if (hybridCamPred.label === gloveLetter) return hybridCamPred.label; // agreement
    return hybridCamPred.confidence >= gloveConf ? hybridCamPred.label : gloveLetter;
  })();

  const fusedConf = (() => {
    if (!hybridCamPred || hybridCamPred.label === '—') return gloveConf;
    if (!gloveLetter) return hybridCamPred.confidence;
    if (hybridCamPred.label === gloveLetter)
      return Math.min((hybridCamPred.confidence + gloveConf) / 2 + 0.05, 1.0);
    return Math.max(hybridCamPred.confidence, gloveConf);
  })();

  const [hybridSentence, setHybridSentence] = useState('');

  /* ── Inference callback — runs inside RAF loop ────────────────────── */
  const onLandmarks = useCallback(async (lms: LandmarkPoint[] | null) => {
    if (!lms) { setPredLabel('—'); setPredConf(0); return; }
    try {
      const video = videoRef.current;
      const vw = video?.videoWidth  || 640;
      const vh = video?.videoHeight || 480;
      const pred = await predict(lms, vw, vh);
      setPredLabel(pred.label);
      setPredConf(pred.confidence);
    } catch { /* ignore single-frame errors */ }
  }, [videoRef]);

  /* ── Register / deregister inference callback on tab change ────────── */
  useEffect(() => {
    if (tab === 'camera' || tab === 'hybrid') setOnLandmarks(onLandmarks);
    else setOnLandmarks(null);
  }, [tab, onLandmarks, setOnLandmarks]);

  /* ── Auto-start camera when tab switches to camera/hybrid ─────────── */
  useEffect(() => {
    if ((tab === 'camera' || tab === 'hybrid') && isReady && !isRunning) startCamera();
  }, [tab, isReady]); // intentionally omit isRunning/startCamera

  /* ── Global keystroke listener — captures HID Keyboard glove input ── */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const currentTab = tabRef.current;
      // Active in Glove Mode AND Hybrid Mode
      if (currentTab !== 'glove' && currentTab !== 'hybrid') return;

      // Ignore modifier-key combinations (Ctrl+C, Alt+F4, Win key, etc.)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const key = e.key;

      // Accept A–Z (case-insensitive) and Space only
      const isLetter = key.length === 1 && /^[a-zA-Z]$/.test(key);
      const isSpace  = key === ' ';

      if (!isLetter && !isSpace) return;

      // Prevent browser from acting on the key (e.g. Space scrolling the page)
      e.preventDefault();

      const char = isSpace ? ' ' : key.toUpperCase();
      // Always update gloveLastKey — the fusion logic in Hybrid Mode reads this
      setGloveLastKey(isSpace ? 'SPACE' : char);
      if (currentTab === 'hybrid') {
        // Stamp the time — RAF loop picks this up and decays the bar smoothly
        gloveKeyTimeRef.current = Date.now();
      }
      // Only append to gloveSentence in Glove Mode (Hybrid has its own hybridSentence)
      if (currentTab === 'glove') {
        setGloveSentence(s => s + char);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // mount once — tabRef keeps it in sync without rebinding

  /* ── RAF loop: continuously decay glove confidence bar in Hybrid Mode ── */
  useEffect(() => {
    function tick() {
      if (gloveKeyTimeRef.current > 0) {
        const elapsed = Date.now() - gloveKeyTimeRef.current;
        // Decay from 0.85 → 0 over 1000 ms (matches glove's ~1 s fire interval)
        const val = Math.max(0, 0.85 * (1 - elapsed / 1000));
        setGloveBarConf(val);
      }
      gloveRafRef.current = requestAnimationFrame(tick);
    }
    gloveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (gloveRafRef.current) cancelAnimationFrame(gloveRafRef.current);
    };
  }, []);

  /* ── TTS helper ───────────────────────────────────────────────────── */
  function speak(text: string) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  const showCamera = tab === 'camera' || tab === 'hybrid';

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="dashboard-root">
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🤟</div>
          <div>
            <div className="sidebar-logo-title">ASL</div>
            <div className="sidebar-logo-sub">Interpreter</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {([
            { id: 'camera',  icon: '📷', label: 'Camera Mode' },
            { id: 'glove',   icon: '🧤', label: 'Glove Mode'  },
            { id: 'hybrid',  icon: '♾️', label: 'Hybrid Mode' },
          ] as { id: Tab; icon: string; label: string }[]).map(item => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`sidebar-nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`sidebar-nav-item ${tab === 'profile' ? 'active' : ''}`}
            id="nav-profile"
            onClick={() => setTab('profile')}
          >
            <span className="sidebar-nav-icon">👤</span>
            <span>{user?.name || 'Profile'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="dashboard-main">
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <div className="dash-tab-title">
              {tab === 'camera'  && '📷 Camera Mode'}
              {tab === 'glove'   && '🧤 Glove Mode'}
              {tab === 'hybrid'  && '♾️ Hybrid Mode'}
              {tab === 'profile' && '👤 Profile'}
            </div>

            {showCamera && isRunning && (
              <div className="live-badge">
                <span className="status-dot"/>LIVE
              </div>
            )}

            {tab === 'glove' && (
              <div className="live-badge" style={{
                background: 'rgba(124,58,237,0.12)',
                color: '#7C3AED',
                border: '1px solid rgba(124,58,237,0.3)',
              }}>
                <span className="status-dot" style={{ background: '#7C3AED' }}/>LISTENING
              </div>
            )}
          </div>

          <div className="dash-topbar-right">
            {showCamera && (
              isRunning
                ? <button className="btn btn-danger btn-sm" id="btn-stop" onClick={stopCamera}>⏹ Stop Camera</button>
                : <button className="btn btn-primary btn-sm" id="btn-start" onClick={startCamera} disabled={!isReady}>
                    {isReady ? '▶ Start Camera' : '⏳ Loading…'}
                  </button>
            )}
          </div>
        </header>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="dash-body">

          {/* ════════ CAMERA TAB (landmark model — unchanged) ════════ */}
          {tab === 'camera' && (
            <div className="two-col-layout">

              {/* LEFT — camera feed */}
              <div className="col-camera">
                {error && <div className="alert alert-error mb-3">{error}</div>}

                {!isReady && !error && (
                  <div className="loading-bar">
                    <span className="loading-spinner"/>
                    Loading MediaPipe AI model…
                  </div>
                )}

                <div className="camera-container" style={{ maxWidth: '100%' }}>
                  <video ref={videoRef} className="camera-video" muted playsInline autoPlay />
                  <canvas ref={canvasRef} className="camera-canvas" />

                  {isRunning && (
                    <div className="camera-overlay-badge">
                      <span className="status-dot"/>Camera Active
                    </div>
                  )}

                  {!isRunning && (
                    <div className="camera-placeholder">
                      <div style={{ fontSize: '4rem' }}>📷</div>
                      <p className="text-muted" style={{ marginTop: 8 }}>
                        {isReady ? 'Camera stopped' : 'Loading MediaPipe…'}
                      </p>
                      {isReady && (
                        <button className="btn btn-primary" id="btn-start-cam"
                          style={{ marginTop: 16 }} onClick={startCamera}>
                          Start Camera
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT — prediction + controls */}
              <div className="col-controls">
                <div className="card prediction-card">
                  <div className="section-label">Detected Sign</div>
                  <div className="prediction-letter">{getDisplayLabel(predLabel)}</div>
                  <ConfidenceBar label="Camera Confidence" value={predConf} variant="cyan" />
                  <div className="action-row">
                    <button className="btn btn-primary btn-sm" id="btn-add-letter"
                      onClick={() => predLabel !== '—' && setSentence(s => s + predLabel)}
                      disabled={predLabel === '—'}>
                      ✚ Add Letter
                    </button>
                    <button className="btn btn-ghost btn-sm" id="btn-backspace"
                      onClick={() => setSentence(s => s.slice(0, -1))}
                      disabled={!sentence}>
                      ⌫ Backspace
                    </button>
                  </div>
                </div>
                <div className="card" style={{ padding: '20px 24px' }}>
                  <SentenceBuilder
                    sentence={sentence}
                    onSpeak={() => speak(sentence)}
                    onClear={() => setSentence('')}
                    onBackspace={() => setSentence(s => s.slice(0, -1))}
                  />
                </div>
                <div className="hint-box">
                  💡 Show your sign, then press <strong>✚ Add Letter</strong> to add it to the sentence.
                </div>
              </div>
            </div>
          )}

          {/* ════════ HYBRID TAB (TFjs image model + glove fusion) ════════ */}
          {tab === 'hybrid' && (
            <div className="two-col-layout">

              {/* LEFT — same camera feed (video element is always in DOM) */}
              <div className="col-camera">
                {error && <div className="alert alert-error mb-3">{error}</div>}

                {!isReady && !error && (
                  <div className="loading-bar">
                    <span className="loading-spinner"/>
                    Starting camera…
                  </div>
                )}

                {hybridModelError && (
                  <div className="hint-box" style={{ borderColor: 'rgba(220,38,38,0.3)', background: '#FEF2F2', color: '#991B1B', marginBottom: 8 }}>
                    ⚠️ {hybridModelError}
                  </div>
                )}

                <div className="camera-container" style={{ maxWidth: '100%' }}>
                  <video ref={videoRef} className="camera-video" muted playsInline autoPlay />
                  <canvas ref={canvasRef} className="camera-canvas" />

                  {isRunning && (
                    <div className="camera-overlay-badge">
                      <span className="status-dot"/>
                      {hybridModelReady ? 'Hybrid Active' : 'Loading TFjs model…'}
                    </div>
                  )}

                  {!isRunning && (
                    <div className="camera-placeholder">
                      <div style={{ fontSize: '4rem' }}>♾️</div>
                      <p className="text-muted" style={{ marginTop: 8 }}>
                        {isReady ? 'Camera stopped' : 'Loading…'}
                      </p>
                      {isReady && (
                        <button className="btn btn-primary" id="btn-start-hybrid-cam"
                          style={{ marginTop: 16 }} onClick={startCamera}>
                          Start Camera
                        </button>
                      )}
                    </div>
                  )}
                </div>


              </div>

              {/* RIGHT — fused prediction + controls */}
              <div className="col-controls">
                <div className="card prediction-card">
                  <div className="section-label">Fused Prediction</div>
                  <div className="prediction-letter" style={{
                    background: 'linear-gradient(135deg, #0EA5E9, #7C3AED)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    {getDisplayLabel(fusedLabel)}
                  </div>

                  {/* Individual confidence bars */}
                  <ConfidenceBar
                    label="Camera (TFjs)"
                    value={hybridCamPred?.confidence ?? 0}
                    variant="cyan"
                  />
                  <ConfidenceBar
                    label="Glove"
                    value={gloveBarConf}
                    variant="indigo"
                  />
                  <ConfidenceBar
                    label="Fused confidence"
                    value={fusedConf}
                    variant="green"
                  />

                  <div className="action-row">
                    <button className="btn btn-primary btn-sm" id="btn-hybrid-add-letter"
                      onClick={() => fusedLabel !== '—' && setHybridSentence(s => s + fusedLabel)}
                      disabled={fusedLabel === '—' || !isRunning}>
                      ✚ Add Fused Letter
                    </button>
                    <button className="btn btn-ghost btn-sm" id="btn-hybrid-backspace"
                      onClick={() => setHybridSentence(s => s.slice(0, -1))}
                      disabled={!hybridSentence}>
                      ⌫ Backspace
                    </button>
                  </div>
                </div>

                <div className="card" style={{ padding: '20px 24px' }}>
                  <SentenceBuilder
                    sentence={hybridSentence}
                    onSpeak={() => speak(hybridSentence)}
                    onClear={() => setHybridSentence('')}
                    onBackspace={() => setHybridSentence(s => s.slice(0, -1))}
                  />
                </div>

                <div className="hint-box" style={{ borderColor: 'rgba(14,165,233,0.2)', background: '#F0F9FF', color: '#0C4A6E' }}>
                  ♾️ <strong>Hybrid Mode:</strong> Camera uses the TFjs image model (A B C).
                  Glove sends its prediction via BLE keyboard. Both are fused — agreement boosts confidence,
                  disagreement picks the higher-confidence source.
                </div>
              </div>
            </div>
          )}

          {/* ════════ GLOVE TAB ════════ */}
          {tab === 'glove' && (
            <div className="two-col-layout">

              {/* LEFT — glove status panel */}
              <div className="col-camera" style={{
                alignItems: 'center', justifyContent: 'center',
                display: 'flex', flexDirection: 'column', gap: 24,
              }}>

                {/* Glove icon ring — always "ready" in HID mode, no connect button needed */}
                <div
                  className="glow-ring bluetooth connected"
                  style={{ borderColor: 'var(--purple)', boxShadow: '0 0 60px rgba(124,58,237,0.45)' }}
                >
                  🧤
                </div>

                <div style={{ textAlign: 'center', maxWidth: 280 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>
                    ASL Flex Glove
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                    Pair the glove in your device's native&nbsp;
                    <strong>Bluetooth Settings</strong>&nbsp;(look for&nbsp;
                    <em>"ASL Flex Glove"</em>), then start signing here.
                    Keystrokes are captured automatically.
                  </div>
                </div>

                {/* Last received key indicator */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'rgba(124,58,237,0.07)', borderRadius: 14,
                  border: '1px solid rgba(124,58,237,0.18)', padding: '16px 32px',
                }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 600, color: '#7C3AED',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>Last Key Received</div>
                  <div style={{
                    fontSize: '2.4rem', fontWeight: 800, color: '#7C3AED',
                    minWidth: 48, textAlign: 'center',
                  }}>
                    {gloveLastKey}
                  </div>
                </div>

                <button
                  className="btn btn-ghost btn-sm"
                  id="btn-glove-clear-last"
                  onClick={() => setGloveLastKey('—')}
                  style={{ opacity: 0.7 }}
                >
                  Reset indicator
                </button>
              </div>

              {/* RIGHT — sentence builder */}
              <div className="col-controls">
                <div className="card" style={{ padding: '20px 24px' }}>
                  <SentenceBuilder
                    sentence={gloveSentence}
                    onSpeak={() => speak(gloveSentence)}
                    onClear={() => { setGloveSentence(''); setGloveLastKey('—'); }}
                    onBackspace={() => setGloveSentence(s => s.slice(0, -1))}
                  />
                </div>

                <div className="hint-box" style={{
                  borderColor: 'rgba(124,58,237,0.20)',
                  background: '#F5F3FF', color: '#5B21B6',
                }}>
                  🧤 <strong>How it works:</strong> The glove acts as a Bluetooth HID keyboard
                  (Seeed XIAO nRF52840). Pair it via your OS Bluetooth settings, switch to
                  this tab, then start signing. Every recognised character appears above automatically.
                </div>

                <div className="hint-box" style={{
                  marginTop: 0,
                  borderColor: 'rgba(79,70,229,0.15)',
                  background: '#EEF2FF', color: '#3730A3',
                }}>
                  ⌨️ <strong>Supported keys:</strong> A – Z and Space.
                  Modifier keys (Shift, Ctrl, Alt) are ignored.
                </div>
              </div>
            </div>
          )}

          {/* ════════ PROFILE TAB ════════ */}
          {tab === 'profile' && (
            <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: 'var(--gradient-main)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.2rem', fontWeight: 800, color: '#fff',
                  boxShadow: '0 0 30px rgba(99,102,241,0.5)', margin: '0 auto 16px',
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.4rem' }}>{user?.name}</div>
                <div className="text-muted">{user?.email}</div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {[
                  { icon: '👤', label: 'Name',    value: user?.name },
                  { icon: '✉',  label: 'Email',   value: user?.email },
                  { icon: '🔑', label: 'Account', value: 'Local session (no backend)' },
                ].map((r, i, a) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px',
                    borderBottom: i < a.length - 1 ? '1px solid #E5E7EB' : 'none',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>{r.label}</div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{r.value || '—'}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#4F46E5' }}>About</div>
                <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#6B7280' }}>
                  ASL Interpreter v1.0 – FYP Demo<br/>
                  38 classes: A–Z, 0–9, Space, Period.<br/>
                  Camera pipeline: MediaPipe Hands → landmark normalisation → Random Forest.<br/>
                  Glove: Seeed XIAO nRF52840 — BLE HID Keyboard mode.
                </div>
              </div>

              <button className="btn btn-danger" id="btn-logout"
                style={{ width: '100%', padding: 14 }}
                onClick={() => { logoutUser(); onLogout(); }}>
                🚪 Sign Out
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ── Mobile bottom nav (visible only on ≤640px) ────────────── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {([
          { id: 'camera',  icon: '📷', label: 'Camera'  },
          { id: 'glove',   icon: '🧤', label: 'Glove'   },
          { id: 'hybrid',  icon: '♾️', label: 'Hybrid'  },
          { id: 'profile', icon: '👤', label: 'Profile' },
        ] as { id: Tab; icon: string; label: string }[]).map(item => (
          <button
            key={item.id}
            id={`mob-nav-${item.id}`}
            className={`mobile-nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
