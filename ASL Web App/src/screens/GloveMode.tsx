import { useState, useEffect, useRef } from 'react';
import { LABELS, getDisplayLabel } from '../utils/labels';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { SentenceBuilder } from '../components/SentenceBuilder';

interface GloveModeProps { onBack: () => void; }

function randomLabel() { return LABELS[Math.floor(Math.random() * 26)]; } // A-Z only
function randomConf() { return 0.75 + Math.random() * 0.24; }

export function GloveMode({ onBack }: GloveModeProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [label, setLabel] = useState('A');
  const [confidence, setConfidence] = useState(0.87);
  const [sentence, setSentence] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!connected) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setLabel(randomLabel());
      setConfidence(randomConf());
    }, 2000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [connected]);

  // Auto-add every 2 ticks
  const tickRef = useRef(0);
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => {
      tickRef.current++;
      if (tickRef.current % 2 === 0) setSentence(s => s + label);
    }, 3000);
    return () => clearInterval(t);
  }, [connected, label]);

  async function handleConnect() {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1800));
    setConnecting(false);
    setConnected(true);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 24 }}>
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={onBack} id="btn-back-glove">← Back</button>
        <span className="topbar-title">Glove Mode</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {connected && <><span className="status-dot"/><span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Connected</span></>}
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 16px', maxWidth: 520, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Connect card */}
        <div className="card" style={{ padding: '28px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div className={`glow-ring bluetooth`} style={connected ? { borderColor: 'var(--green)', boxShadow: '0 0 60px rgba(16,185,129,0.5)' } : {}}>
            {connected ? '✅' : '🦷'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{connected ? 'Glove Connected' : 'Smart Glove'}</div>
            <div className="text-muted" style={{ fontSize: '0.82rem' }}>
              {connected ? 'Receiving sensor data...' : 'Tap to connect via Bluetooth'}
            </div>
          </div>
          {!connected && (
            <button className="btn btn-primary" id="btn-connect-glove"
              onClick={handleConnect} disabled={connecting}>
              {connecting ? '🔄 Connecting…' : '⚡ Connect Glove'}
            </button>
          )}
          {connected && (
            <button className="btn btn-ghost btn-sm" id="btn-disconnect"
              onClick={() => { setConnected(false); setSentence(''); }}>
              Disconnect
            </button>
          )}
        </div>

        {connected && (
          <>
            <div className="card" style={{ padding: '20px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                Detected Sign
              </div>
              <div className="prediction-letter" style={{ background: 'linear-gradient(135deg, var(--purple), var(--indigo-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {getDisplayLabel(label)}
              </div>
              <ConfidenceBar label="Confidence" value={confidence} />
            </div>
            <div className="card" style={{ padding: '20px 24px' }}>
              <SentenceBuilder sentence={sentence}
                onSpeak={() => { window.speechSynthesis?.cancel(); window.speechSynthesis?.speak(new SpeechSynthesisUtterance(sentence)); }}
                onClear={() => setSentence('')}
                onBackspace={() => setSentence(s => s.slice(0, -1))} />
            </div>
          </>
        )}

        <div className="alert" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', color: 'var(--purple)' }}>
          🧤 <strong>Glove Mode</strong> — Simulated demo. Real BLE integration requires hardware glove.
        </div>
      </div>
    </div>
  );
}
