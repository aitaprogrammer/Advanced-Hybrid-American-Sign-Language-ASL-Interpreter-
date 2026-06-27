interface HomeProps {
  onSelectMode: (mode: 'camera' | 'glove' | 'hybrid') => void;
  onProfile: () => void;
  userName: string;
}

const MODES = [
  {
    id: 'glove' as const,
    icon: '🧤',
    title: 'Glove Mode',
    desc: 'Use smart glove via Bluetooth',
    cls: 'glove',
  },
  {
    id: 'camera' as const,
    icon: '📷',
    title: 'Camera Mode',
    desc: 'Use your phone camera for real-time ASL detection',
    cls: 'camera',
  },
  {
    id: 'hybrid' as const,
    icon: '♾️',
    title: 'Hybrid Mode',
    desc: 'Glove + Camera combined for maximum accuracy',
    cls: 'hybrid',
  },
];

export function Home({ onSelectMode, onProfile, userName }: HomeProps) {
  const initials = userName ? userName.charAt(0).toUpperCase() : '?';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Welcome back</div>
          <div className="topbar-title">{userName || 'User'} 👋</div>
        </div>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onProfile} id="btn-profile"
          style={{
            width: 40, height: 40,
            background: 'var(--gradient-main)',
            color: '#fff', fontWeight: 700, fontSize: '1rem',
            border: 'none',
          }}>
          {initials}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '28px 20px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Choose Mode</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 4 }}>
            Select how you want to interpret ASL
          </p>
        </div>

        <div className="mode-cards-grid" style={{ display: 'grid', gap: 16 }}>
          {MODES.map(m => (
            <div key={m.id} className={`mode-card ${m.cls}`} onClick={() => onSelectMode(m.id)}
              role="button" tabIndex={0} id={`mode-${m.id}`}
              onKeyDown={e => e.key === 'Enter' && onSelectMode(m.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className={`mode-icon ${m.cls}`}>{m.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{m.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>{m.desc}</div>
                </div>
              </div>
              <button
                className={`btn btn-sm ${m.id === 'camera' ? 'btn-tts' : 'btn-ghost'}`}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                id={`start-${m.id}`}
                onClick={e => { e.stopPropagation(); onSelectMode(m.id); }}>
                Start →
              </button>
            </div>
          ))}
        </div>

        {/* Info banner */}
        <div style={{
          marginTop: 28, padding: '16px 20px',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--indigo-light)', fontWeight: 600, marginBottom: 4 }}>
            💡 Tip
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Camera Mode is fully functional. Hold a sign steady for 1 second to auto-add it to your sentence.
          </div>
        </div>
      </div>
    </div>
  );
}
