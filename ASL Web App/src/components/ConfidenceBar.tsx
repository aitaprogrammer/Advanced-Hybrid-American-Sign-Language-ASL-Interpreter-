interface ConfidenceBarProps {
  label: string;
  value: number; // 0–1
  variant?: 'indigo' | 'cyan' | 'orange' | 'green';
}

export function ConfidenceBar({ label, value, variant = 'indigo' }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  return (
    <div className="confidence-bar-wrap">
      <div className="confidence-label">
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{pct}%</span>
      </div>
      <div className="confidence-track">
        <div
          className={`confidence-fill ${variant !== 'indigo' ? variant : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
