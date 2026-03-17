export default function StatCard({ icon, label, value, sub, color = '#3b82f6' }) {
  return (
    <div style={{ ...s.card, borderTop: `4px solid ${color}` }}>
      <div style={{ ...s.icon, color }}>{icon}</div>
      <div style={s.value}>{value}</div>
      <div style={s.label}>{label}</div>
      {sub && <div style={s.sub}>{sub}</div>}
    </div>
  );
}

const s = {
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  icon: { fontSize: '1.5rem' },
  value: { fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  sub: { fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.1rem' },
};
