import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import StatCard from './StatCard';
import CoverageBar from './CoverageBar';
import { coverageAPI, personeroAPI } from '../../utils/api';

export default function RegionGrid() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [personeroStats, setPersoneroStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([coverageAPI.national(), personeroAPI.stats()])
      .then(([cov, per]) => {
        setData(cov.data);
        setPersoneroStats(per.data);
      })
      .catch(err => setError(err.response?.data?.error || 'Error cargando datos'))
      .finally(() => setLoading(false));
  }, []);

  const breadcrumbs = [{ label: 'Nacional' }];

  if (loading) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.center}>⏳ Cargando datos nacionales...</div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.errorBox}>❌ {error}</div>
    </AppLayout>
  );

  const regions = data?.regions || [];
  const filtered = regions.filter(r =>
    r.departamento?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Summary stats */}
      <div style={s.statsRow}>
        <StatCard
          icon="🗳️" label="Total Mesas" color="#3b82f6"
          value={data?.totalMesas?.toLocaleString()}
          sub={`${data?.cobertura}% cobertura`}
        />
        <StatCard
          icon="✅" label="Asignadas" color="#10b981"
          value={data?.asignadas?.toLocaleString()}
        />
        <StatCard
          icon="🏆" label="Confirmadas" color="#8b5cf6"
          value={data?.confirmadas?.toLocaleString()}
        />
        <StatCard
          icon="👥" label="Personeros" color="#f59e0b"
          value={personeroStats?.total?.toLocaleString()}
          sub={`${personeroStats?.asignados} asignados`}
        />
        <StatCard
          icon="🗺️" label="Electores" color="#06b6d4"
          value={data?.totalElectores?.toLocaleString()}
        />
      </div>

      {/* Search */}
      <div style={s.searchRow}>
        <h2 style={s.sectionTitle}>Regiones / Departamentos</h2>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar región..."
          style={s.search}
        />
      </div>

      {/* Region cards */}
      <div style={s.grid}>
        {filtered.map(r => (
          <RegionCard
            key={r.departamento}
            region={r}
            onClick={() => navigate(`/dept/${r.ubigeoPrefix}`)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={s.empty}>No se encontraron regiones</div>
        )}
      </div>
    </AppLayout>
  );
}

function RegionCard({ region: r, onClick }) {
  const pct = Math.round(r.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIcon}>🗺️</div>
        <div style={s.cardName}>{r.departamento}</div>
      </div>
      <div style={s.cardStats}>
        <div style={s.cardStat}>
          <span style={s.statVal}>{r.totalMesas?.toLocaleString()}</span>
          <span style={s.statLbl}>mesas</span>
        </div>
        <div style={s.cardStat}>
          <span style={s.statVal}>{r.asignadas?.toLocaleString()}</span>
          <span style={s.statLbl}>asignadas</span>
        </div>
        <div style={s.cardStat}>
          <span style={{ ...s.statVal, color }}>{pct}%</span>
          <span style={s.statLbl}>cobertura</span>
        </div>
      </div>
      <CoverageBar value={r.cobertura} showLabel={false} />
    </button>
  );
}

const s = {
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  searchRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap',
  },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' },
  search: {
    padding: '0.55rem 0.9rem', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '0.9rem', outline: 'none', minWidth: '200px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0',
    borderRadius: '12px', padding: '1.25rem',
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  cardIcon: { fontSize: '1.4rem' },
  cardName: { fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' },
  cardStats: { display: 'flex', gap: '1rem' },
  cardStat: { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal: { fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' },
  statLbl: { fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox: {
    background: '#fef2f2', color: '#dc2626', borderRadius: '10px',
    padding: '1.25rem', fontSize: '0.95rem',
  },
  empty: { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
