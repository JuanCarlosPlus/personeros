import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import CoverageBar from './CoverageBar';
import { coverageAPI } from '../../utils/api';

export default function ProvinceGrid() {
  const { deptCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    coverageAPI.provinces(deptCode)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error cargando provincias'))
      .finally(() => setLoading(false));
  }, [deptCode]);

  const dept = data?.provinces?.[0]?.departamento || deptCode;

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept },
  ];

  if (loading) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.center}>⏳ Cargando provincias...</div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.errorBox}>❌ {error}</div>
    </AppLayout>
  );

  const provinces = (data?.provinces || []).filter(p =>
    p.provincia?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>{dept}</h2>
          <p style={s.subtitle}>
            {data?.totalMesas?.toLocaleString()} mesas · {data?.cobertura}% cobertura
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar provincia..."
          style={s.search}
        />
      </div>

      <div style={s.grid}>
        {provinces.map(p => (
          <ProvinceCard
            key={p.ubigeoPrefix}
            province={p}
            onClick={() => navigate(`/prov/${p.ubigeoPrefix}`)}
          />
        ))}
        {provinces.length === 0 && (
          <div style={s.empty}>No se encontraron provincias</div>
        )}
      </div>
    </AppLayout>
  );
}

function ProvinceCard({ province: p, onClick }) {
  const pct = Math.round(p.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIcon}>🏙️</div>
        <div style={s.cardName}>{p.provincia}</div>
      </div>
      <div style={s.cardStats}>
        <div style={s.cardStat}>
          <span style={s.statVal}>{p.totalMesas?.toLocaleString()}</span>
          <span style={s.statLbl}>mesas</span>
        </div>
        <div style={s.cardStat}>
          <span style={s.statVal}>{p.asignadas?.toLocaleString()}</span>
          <span style={s.statLbl}>asignadas</span>
        </div>
        <div style={s.cardStat}>
          <span style={{ ...s.statVal, color }}>{pct}%</span>
          <span style={s.statLbl}>cobertura</span>
        </div>
      </div>
      <CoverageBar value={p.cobertura} showLabel={false} />
      <div style={s.electores}>
        👤 {p.totalElectores?.toLocaleString()} electores
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', padding: '1.25rem',
    cursor: 'pointer', textAlign: 'left',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  cardIcon: { fontSize: '1.4rem' },
  cardName: { fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', flex: 1 },
  cardStats: { display: 'flex', gap: '1rem' },
  cardStat: { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal: { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' },
  statLbl: { fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  electores: { fontSize: '0.78rem', color: '#64748b' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox: { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty: { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
