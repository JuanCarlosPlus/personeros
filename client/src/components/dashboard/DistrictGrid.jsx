import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import CoverageBar from './CoverageBar';
import { coverageAPI } from '../../utils/api';

export default function DistrictGrid() {
  const { provCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    coverageAPI.districts(provCode)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error cargando distritos'))
      .finally(() => setLoading(false));
  }, [provCode]);

  const first = data?.districts?.[0];
  const dept = first?.departamento || '';
  const prov = first?.provincia || provCode;
  const deptCode = provCode.slice(0, 2);

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept, path: `/dept/${deptCode}` },
    { label: prov },
  ];

  if (loading) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.center}>⏳ Cargando distritos...</div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.errorBox}>❌ {error}</div>
    </AppLayout>
  );

  const districts = (data?.districts || []).filter(d =>
    d.distrito?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.header}>
        <div>
          <h2 style={s.title}>{prov}</h2>
          <p style={s.subtitle}>
            {data?.totalMesas?.toLocaleString()} mesas · {data?.cobertura}% cobertura
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar distrito..."
          style={s.search}
        />
      </div>

      <div style={s.grid}>
        {districts.map(d => (
          <DistrictCard
            key={d.ubigeo}
            district={d}
            onClick={() => navigate(`/dist/${d.ubigeo}`)}
          />
        ))}
        {districts.length === 0 && (
          <div style={s.empty}>No se encontraron distritos</div>
        )}
      </div>
    </AppLayout>
  );
}

function DistrictCard({ district: d, onClick }) {
  const pct = Math.round(d.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIcon}>🏘️</div>
        <div style={s.cardName}>{d.distrito}</div>
      </div>
      <div style={s.cardStats}>
        <div style={s.cardStat}>
          <span style={s.statVal}>{d.totalMesas?.toLocaleString()}</span>
          <span style={s.statLbl}>mesas</span>
        </div>
        <div style={s.cardStat}>
          <span style={{ ...s.statVal, color }}>{pct}%</span>
          <span style={s.statLbl}>cobertura</span>
        </div>
      </div>
      <CoverageBar value={d.cobertura} showLabel={false} />
      <div style={s.meta}>
        <span>👤 {d.totalElectores?.toLocaleString()} electores</span>
        <span style={{ color: '#64748b' }}>ubigeo: {d.ubigeo}</span>
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.9rem',
  },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', padding: '1.1rem',
    cursor: 'pointer', textAlign: 'left',
    transition: 'transform 0.15s, box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.65rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  cardIcon: { fontSize: '1.25rem' },
  cardName: { fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', flex: 1 },
  cardStats: { display: 'flex', gap: '1rem' },
  cardStat: { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal: { fontSize: '1rem', fontWeight: 700, color: '#0f172a' },
  statLbl: { fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  meta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox: { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty: { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
