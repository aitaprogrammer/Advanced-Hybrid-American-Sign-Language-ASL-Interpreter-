interface SentenceBuilderProps {
  sentence: string;
  onSpeak: () => void;
  onClear: () => void;
  onBackspace: () => void;
}

export function SentenceBuilder({ sentence, onSpeak, onClear, onBackspace }: SentenceBuilderProps) {
  return (
    <div className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Sentence Builder
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onBackspace} title="Backspace" id="btn-backspace">
          ⌫
        </button>
      </div>
      <div className="sentence-box">
        {sentence || <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Start signing to build a sentence...</span>}
        <span className="sentence-cursor" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-tts" style={{ flex: 1 }} onClick={onSpeak} id="btn-tts" disabled={!sentence}>
          <span>🔊</span> Speak
        </button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClear} id="btn-clear" disabled={!sentence}>
          ✕ Clear
        </button>
      </div>
    </div>
  );
}
