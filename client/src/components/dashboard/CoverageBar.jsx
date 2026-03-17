export default function CoverageBar({ value = 0, showLabel = true }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={s.wrap}>
      <div style={s.track}>
        <div style={{ ...s.fill, width: `${pct}%`, background: color }} />
      </div>
      {showLabel && <span style={{ ...s.label, color }}>{pct}%</span>}
    </div>
  );
}

const s = {
  wrap: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  track: {
    flex: 1, height: '6px', background: '#e2e8f0',
    borderRadius: '3px', overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: '3px', transition: 'width 0.4s' },
  label: { fontSize: '0.75rem', fontWeight: 700, minWidth: '2.5rem', textAlign: 'right' },
};
