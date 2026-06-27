import { useState } from 'react';
import { registerUser, loginUser } from '../utils/auth';

interface SignupProps {
  onLogin: () => void;
  onBack: () => void;
}

export function Signup({ onLogin, onBack }: SignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const ok = registerUser(name, email, password);
    if (!ok) { setLoading(false); setError('Email already registered.'); return; }
    loginUser(email, password);
    setLoading(false);
    onLogin();
  }

  return (
    <div className="screen">
      <div className="card" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>✋</div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800 }}>Join Us</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 4 }}>Create your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input id="signup-name" className="input-field" type="text" placeholder="Your Name"
                value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-with-icon">
              <span className="input-icon">✉</span>
              <input id="signup-email" className="input-field" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input id="signup-password" className="input-field" type="password" placeholder="Min 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input id="signup-confirm" className="input-field" type="password" placeholder="Repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button id="signup-submit" className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', marginTop: 4, padding: '14px' }}>
            {loading ? 'Creating account…' : 'SIGN UP'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>Already have an account? </span>
          <button className="btn btn-ghost btn-sm" onClick={onBack} id="goto-login"
            style={{ padding: '4px 12px' }}>Login</button>
        </div>
      </div>
    </div>
  );
}
