import { useEffect } from 'react';

interface SplashProps {
  onDone: () => void;
}

export function Splash({ onDone }: SplashProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="screen" style={{ gap: 24 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div className="logo-hand">🤟</div>
        <div>
          <h1 style={{
            fontSize: 'clamp(2.2rem, 8vw, 3.5rem)',
            fontWeight: 900,
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            ASL<br />Interpreter
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: '1rem', letterSpacing: '0.1em' }}>
            Bridging Communication
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === 0 ? 'var(--indigo-light)' : 'var(--border)',
              animation: `pulse-dot ${1 + i * 0.3}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
