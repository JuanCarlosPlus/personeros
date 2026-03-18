import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import CoverageBar from './CoverageBar';
import CoordinadorBadge from '../coordinadores/CoordinadorBadge';
import { ViewToggle, ListView } from './RegionGrid';
import { coverageAPI, coordinadorAPI } from '../../utils/api';
import { exportCsv } from '../../utils/exportCsv';

export default function DistrictGrid() {
  const { provCode } = useParams();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [coordMap, setCoordMap] = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('cards');

  const loadCoords = useCallback(() => {
    coordinadorAPI.list({ nivel: 'distrito', ubigeoLike: provCode })
      .then(r => {
        const map = {};
        r.data.data.forEach(c => { map[c.ubigeo] = c; });
        setCoordMap(map);
      }).catch(() => {});
  }, [provCode]);

  useEffect(() => {
    setLoading(true);
    coverageAPI.districts(provCode)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error'))
      .finally(() => setLoading(false));
    loadCoords();
  }, [provCode, loadCoords]);

  const first    = data?.districts?.[0];
  const dept     = first?.departamento || '';
  const prov     = first?.provincia    || provCode;
  const deptCode = provCode.slice(0, 2);

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept,       path: `/dept/${deptCode}` },
    { label: prov },
  ];

  if (loading) return <AppLayout breadcrumbs={breadcrumbs}><div style={s.center}>⏳ Cargando...</div></AppLayout>;
  if (error)   return <AppLayout breadcrumbs={breadcrumbs}><div style={s.errorBox}>❌ {error}</div></AppLayout>;

  const districts = (data?.districts || []).filter(d =>
    d.distrito?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const cols = [
      { header: 'Departamento', key: 'departamento' },
      { header: 'Provincia',    key: 'provincia' },
      { header: 'Distrito',     key: 'distrito' },
      { header: 'Ubigeo',       key: 'ubigeo' },
      { header: 'Mesas',        key: 'totalMesas' },
      { header: 'Asignadas',    key: 'asignadas' },
      { header: 'Cobertura%',   key: d => d.cobertura.toFixed(1) },
      { header: 'Electores',    key: 'totalElectores' },
      { header: 'Coordinador',  key: d => { const c = coordMap[d.ubigeo]; return c ? `${c.nombres} ${c.apellidoPaterno}`.trim() : ''; } },
      { header: 'Teléfono',     key: d => coordMap[d.ubigeo]?.telefono || '' },
      { header: 'Correo',       key: d => coordMap[d.ubigeo]?.correo   || '' },
    ];
    exportCsv(cols, districts, `distritos-${prov}.csv`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.toolbar}>
        <div>
          <h2 style={s.title}>{prov}</h2>
          <p style={s.subtitle}>{data?.totalMesas?.toLocaleString()} mesas · {Math.round(data?.cobertura)}% cobertura</p>
        </div>
        <div style={s.toolbarRight}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar distrito..." style={s.search} />
          <ViewToggle view={view} onChange={setView} />
          <button onClick={handleExport} style={s.exportBtn}>⬇️ Excel</button>
        </div>
      </div>

      {view === 'cards' ? (
        <div style={s.grid}>
          {districts.map(d => (
            <DistrictCard
              key={d.ubigeo}
              district={d}
              coord={coordMap[d.ubigeo] || null}
              onCoordUpdated={(c) => setCoordMap(m => ({ ...m, [d.ubigeo]: c }))}
              onClick={() => navigate(`/dist/${d.ubigeo}`)}
            />
          ))}
          {districts.length === 0 && <div style={s.empty}>Sin resultados</div>}
        </div>
      ) : (
        <ListView
          columns={[
            { header: 'Distrito',    key: d => d.distrito,                      sortKey: 'distrito' },
            { header: 'Ubigeo',      key: d => d.ubigeo,                        sortKey: 'ubigeo' },
            { header: 'Mesas',       key: d => d.totalMesas?.toLocaleString(),   sortKey: 'totalMesas' },
            { header: 'Asignadas',   key: d => d.asignadas?.toLocaleString(),    sortKey: 'asignadas' },
            { header: 'Cobertura',   key: d => <CoverageBar value={d.cobertura} />, sortKey: 'cobertura' },
            { header: 'Electores',   key: d => d.totalElectores?.toLocaleString(), sortKey: 'totalElectores' },
            { header: 'Coordinador', key: d => (
              <CoordinadorBadge
                coord={coordMap[d.ubigeo] || null}
                nivel="distrito" ubigeo={d.ubigeo}
                nombreJurisdiccion={d.distrito}
                onUpdated={(c) => setCoordMap(m => ({ ...m, [d.ubigeo]: c }))}
              />
            )},
          ]}
          rows={districts}
          onRowClick={d => navigate(`/dist/${d.ubigeo}`)}
        />
      )}
    </AppLayout>
  );
}

function DistrictCard({ district: d, coord, onCoordUpdated, onClick }) {
  const pct   = Math.round(d.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIconWrap}>
          <span style={s.cardIcon}>🏘️</span>
          <span style={s.cardName}>{d.distrito}</span>
        </div>
        <CoordinadorBadge
          coord={coord} nivel="distrito" ubigeo={d.ubigeo}
          nombreJurisdiccion={d.distrito}
          onUpdated={onCoordUpdated}
        />
      </div>
      <div style={s.cardStats}>
        <Stat val={d.totalMesas?.toLocaleString()}  lbl="mesas" />
        <Stat val={d.asignadas?.toLocaleString()}   lbl="asignadas" />
        <Stat val={`${pct}%`} lbl="cobertura" color={color} />
      </div>
      <CoverageBar value={d.cobertura} showLabel={false} />
      <div style={s.meta}>
        <span>👤 {d.totalElectores?.toLocaleString()} electores</span>
        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{d.ubigeo}</span>
      </div>
    </button>
  );
}

function Stat({ val, lbl, color }) {
  return (
    <div style={s.cardStat}>
      <span style={{ ...s.statVal, ...(color ? { color } : {}) }}>{val}</span>
      <span style={s.statLbl}>{lbl}</span>
    </div>
  );
}

const s = {
  toolbar:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.75rem', flexWrap: 'wrap' },
  title:    { fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' },
  subtitle: { color: '#64748b', fontSize: '0.88rem', marginTop: '0.2rem' },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  search:    { padding: '0.5rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', minWidth: '180px' },
  exportBtn: { padding: '0.45rem 0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px,1fr))', gap: '0.9rem' },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem',
    cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardHeader:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' },
  cardIconWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 },
  cardIcon:  { fontSize: '1.1rem', flexShrink: 0 },
  cardName:  { fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardStats: { display: 'flex', gap: '0.75rem' },
  cardStat:  { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal:   { fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' },
  statLbl:   { fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  meta:      { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' },
  center:    { textAlign: 'center', padding: '3rem', color: '#64748b' },
  errorBox:  { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty:     { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
