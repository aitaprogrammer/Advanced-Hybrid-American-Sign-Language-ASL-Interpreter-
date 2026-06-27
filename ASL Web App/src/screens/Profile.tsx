import { getCurrentUser, logoutUser } from '../utils/auth';

interface ProfileProps { onLogout: () => void; onBack: () => void; }

export function Profile({ onLogout, onBack }: ProfileProps) {
  const user = getCurrentUser();

  function handleLogout() { logoutUser(); onLogout(); }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={onBack} id="btn-back-profile">← Back</button>
        <span className="topbar-title">Profile</span>
        <div />
      </div>

      <div style={{ flex: 1, padding: '32px 20px', maxWidth: 480, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'var(--gradient-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 0 30px rgba(99,102,241,0.5)',
          }}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '1.3rem' }}>{user?.name || 'User'}</div>
            <div className="text-muted" style={{ fontSize: '0.9rem', marginTop: 4 }}>{user?.email}</div>
          </div>
        </div>

        {/* Info rows */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {[
            { icon: '👤', label: 'Name', value: user?.name || '—' },
            { icon: '✉', label: 'Email', value: user?.email || '—' },
            { icon: '🔑', label: 'Account Type', value: 'Local User' },
          ].map((row, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 20px',
              borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: '1.2rem' }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.label}</div>
                <div style={{ fontWeight: 500 }}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* About */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--indigo-light)' }}>About</div>
          <div className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
            ASL Interpreter v1.0 — Final Year Project<br/>
            Real-time American Sign Language recognition using MediaPipe Hands + Random Forest model.<br/>
            38 classes: A–Z, 0–9, Space, Period.
          </div>
        </div>

        <button className="btn btn-danger" id="btn-logout" onClick={handleLogout}
          style={{ width: '100%', padding: '14px' }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
