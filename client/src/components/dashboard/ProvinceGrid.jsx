import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import CoverageBar from './CoverageBar';
import CoordinadorBadge from '../coordinadores/CoordinadorBadge';
import { ViewToggle, ListView } from './RegionGrid';
import { coverageAPI, coordinadorAPI } from '../../utils/api';
import { exportCsv } from '../../utils/exportCsv';

export default function ProvinceGrid() {
  const { deptCode } = useParams();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [coordMap, setCoordMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');
  const [view, setView]     = useState('cards');

  const loadCoords = useCallback(() => {
    coordinadorAPI.list({ nivel: 'provincia', ubigeoLike: deptCode })
      .then(r => {
        const map = {};
        r.data.data.forEach(c => { map[c.ubigeo] = c; });
        setCoordMap(map);
      }).catch(() => {});
  }, [deptCode]);

  useEffect(() => {
    setLoading(true);
    coverageAPI.provinces(deptCode)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error'))
      .finally(() => setLoading(false));
    loadCoords();
  }, [deptCode, loadCoords]);

  const first = data?.provinces?.[0];
  const dept  = first?.departamento || deptCode;
  const deptCoordUbigeo = deptCode;

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept },
  ];

  if (loading) return <AppLayout breadcrumbs={breadcrumbs}><div style={s.center}>⏳ Cargando...</div></AppLayout>;
  if (error)   return <AppLayout breadcrumbs={breadcrumbs}><div style={s.errorBox}>❌ {error}</div></AppLayout>;

  const provinces = (data?.provinces || []).filter(p =>
    p.provincia?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const cols = [
      { header: 'Departamento', key: 'departamento' },
      { header: 'Provincia',    key: 'provincia' },
      { header: 'Mesas',        key: 'totalMesas' },
      { header: 'Asignadas',    key: 'asignadas' },
      { header: 'Cobertura%',   key: p => p.cobertura.toFixed(1) },
      { header: 'Electores',    key: 'totalElectores' },
      { header: 'Coordinador',  key: p => { const c = coordMap[p.ubigeoPrefix]; return c ? `${c.nombres} ${c.apellidoPaterno}`.trim() : ''; } },
      { header: 'Teléfono',     key: p => coordMap[p.ubigeoPrefix]?.telefono || '' },
      { header: 'Correo',       key: p => coordMap[p.ubigeoPrefix]?.correo   || '' },
    ];
    exportCsv(cols, provinces, `provincias-${dept}.csv`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.toolbar}>
        <div>
          <h2 style={s.title}>{dept}</h2>
          <p style={s.subtitle}>{data?.totalMesas?.toLocaleString()} mesas · {Math.round(data?.cobertura)}% cobertura</p>
        </div>
        <div style={s.toolbarRight}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar provincia..." style={s.search} />
          <ViewToggle view={view} onChange={setView} />
          <button onClick={handleExport} style={s.exportBtn}>⬇️ Excel</button>
        </div>
      </div>

      {view === 'cards' ? (
        <div style={s.grid}>
          {provinces.map(p => (
            <ProvinceCard
              key={p.ubigeoPrefix}
              province={p}
              coord={coordMap[p.ubigeoPrefix] || null}
              onCoordUpdated={(c) => setCoordMap(m => ({ ...m, [p.ubigeoPrefix]: c }))}
              onClick={() => navigate(`/prov/${p.ubigeoPrefix}`)}
            />
          ))}
          {provinces.length === 0 && <div style={s.empty}>Sin resultados</div>}
        </div>
      ) : (
        <ListView
          columns={[
            { header: 'Provincia',   key: p => p.provincia },
            { header: 'Mesas',       key: p => p.totalMesas?.toLocaleString() },
            { header: 'Asignadas',   key: p => p.asignadas?.toLocaleString() },
            { header: 'Cobertura',   key: p => <CoverageBar value={p.cobertura} /> },
            { header: 'Electores',   key: p => p.totalElectores?.toLocaleString() },
            { header: 'Coordinador', key: p => (
              <CoordinadorBadge
                coord={coordMap[p.ubigeoPrefix] || null}
                nivel="provincia" ubigeo={p.ubigeoPrefix}
                nombreJurisdiccion={p.provincia}
                onUpdated={(c) => setCoordMap(m => ({ ...m, [p.ubigeoPrefix]: c }))}
              />
            )},
          ]}
          rows={provinces}
          onRowClick={p => navigate(`/prov/${p.ubigeoPrefix}`)}
        />
      )}
    </AppLayout>
  );
}

function ProvinceCard({ province: p, coord, onCoordUpdated, onClick }) {
  const pct   = Math.round(p.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIconWrap}>
          <span style={s.cardIcon}>🏙️</span>
          <span style={s.cardName}>{p.provincia}</span>
        </div>
        <CoordinadorBadge
          coord={coord} nivel="provincia" ubigeo={p.ubigeoPrefix}
          nombreJurisdiccion={p.provincia}
          onUpdated={onCoordUpdated}
        />
      </div>
      <div style={s.cardStats}>
        <Stat val={p.totalMesas?.toLocaleString()}   lbl="mesas" />
        <Stat val={p.asignadas?.toLocaleString()}    lbl="asignadas" />
        <Stat val={`${pct}%`} lbl="cobertura" color={color} />
      </div>
      <CoverageBar value={p.cobertura} showLabel={false} />
      <div style={s.electores}>👤 {p.totalElectores?.toLocaleString()} electores</div>
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: '1rem' },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem',
    cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.65rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardHeader:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' },
  cardIconWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 },
  cardIcon:  { fontSize: '1.2rem', flexShrink: 0 },
  cardName:  { fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardStats: { display: 'flex', gap: '1rem' },
  cardStat:  { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal:   { fontSize: '1rem', fontWeight: 700, color: '#0f172a' },
  statLbl:   { fontSize: '0.67rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  electores: { fontSize: '0.77rem', color: '#64748b' },
  center:    { textAlign: 'center', padding: '3rem', color: '#64748b' },
  errorBox:  { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty:     { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
