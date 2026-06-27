import { useState } from 'react';
import { loginUser } from '../utils/auth';

interface LoginProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function Login({ onLogin, onSignup }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400)); // simulate async
    const user = loginUser(email, password);
    setLoading(false);
    if (!user) {
      setError('Invalid email or password.');
    } else {
      onLogin();
    }
  }

  return (
    <div className="screen">
      <div className="card" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🤟</div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800 }}>Welcome Back</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 4 }}>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <div className="input-with-icon">
              <span className="input-icon">✉</span>
              <input id="login-email" className="input-field" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input id="login-password" className="input-field" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', marginTop: 4, padding: '14px' }}>
            {loading ? 'Signing in…' : 'LOGIN'}
          </button>
        </form>

        <div className="divider">or</div>

        <div style={{ textAlign: 'center' }}>
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>Don't have an account? </span>
          <button className="btn btn-ghost btn-sm" onClick={onSignup} id="goto-signup"
            style={{ padding: '4px 12px' }}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}
