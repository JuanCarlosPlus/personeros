import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import CoverageBar from './CoverageBar';
import { coverageAPI } from '../../utils/api';

export default function CentroGrid() {
  const { ubigeo } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    coverageAPI.centros(ubigeo)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error cargando centros de votación'))
      .finally(() => setLoading(false));
  }, [ubigeo]);

  const first = data?.centros?.[0];
  const dept = first?.departamento || '';
  const prov = first?.provincia || '';
  const dist = first?.distrito || ubigeo;
  const deptCode = ubigeo.slice(0, 2);
  const provCode = ubigeo.slice(0, 4);

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept, path: `/dept/${deptCode}` },
    { label: prov, path: `/prov/${provCode}` },
    { label: dist },
  ];

  if (loading) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.center}>⏳ Cargando centros de votación...</div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.errorBox}>❌ {error}</div>
    </AppLayout>
  );

  const centros = (data?.centros || []).filter(c =>
    c.nombreLocal?.toLowerCase().includes(search.toLowerCase()) ||
    c.direccion?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>{dist}</h2>
          <p style={s.subtitle}>
            {data?.centros?.length || 0} centros de votación · {data?.totalMesas?.toLocaleString()} mesas · {data?.cobertura}% cobertura
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar local..."
          style={s.search}
        />
      </div>

      <div style={s.grid}>
        {centros.map(c => (
          <CentroCard
            key={c.idLocal}
            centro={c}
            onClick={() => navigate(`/centro/${ubigeo}/${encodeURIComponent(c.idLocal)}`)}
          />
        ))}
        {centros.length === 0 && (
          <div style={s.empty}>No se encontraron centros de votación</div>
        )}
      </div>
    </AppLayout>
  );
}

function CentroCard({ centro: c, onClick }) {
  const pct = Math.round(c.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const statusLabel = pct === 100 ? '✅ Completo' : pct > 0 ? '🔄 Parcial' : '⭕ Sin asignar';

  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIcon}>🏫</div>
        <div style={s.cardName}>{c.nombreLocal}</div>
      </div>
      <div style={s.direccion}>📍 {c.direccion}</div>

      <div style={s.cardStats}>
        <div style={s.cardStat}>
          <span style={s.statVal}>{c.totalMesas}</span>
          <span style={s.statLbl}>mesas</span>
        </div>
        <div style={s.cardStat}>
          <span style={s.statVal}>{c.asignadas}</span>
          <span style={s.statLbl}>asignadas</span>
        </div>
        <div style={s.cardStat}>
          <span style={{ ...s.statVal, color }}>{pct}%</span>
          <span style={s.statLbl}>cobertura</span>
        </div>
      </div>
      <CoverageBar value={c.cobertura} showLabel={false} />
      <div style={s.footer}>
        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
          👤 {c.totalElectores?.toLocaleString()} electores
        </span>
        <span style={{ fontSize: '0.75rem', color }}>
          {statusLabel}
        </span>
      </div>
    </button>
  );
}

const s = {
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap',
  },
  title: { fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' },
  subtitle: { color: '#64748b', fontSize: '0.9rem', marginTop: '0.2rem' },
  search: {
    padding: '0.55rem 0.9rem', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '0.9rem', outline: 'none', minWidth: '200px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', padding: '1.1rem',
    cursor: 'pointer', textAlign: 'left',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.65rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },
  cardIcon: { fontSize: '1.4rem', marginTop: '0.1rem', flexShrink: 0 },
  cardName: { fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.3 },
  direccion: { fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 },
  cardStats: { display: 'flex', gap: '1rem' },
  cardStat: { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal: { fontSize: '1rem', fontWeight: 700, color: '#0f172a' },
  statLbl: { fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox: { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty: { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
