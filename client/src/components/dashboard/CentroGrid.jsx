import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import CoverageBar from './CoverageBar';
import CoordinadorBadge from '../coordinadores/CoordinadorBadge';
import { ViewToggle, ListView } from './RegionGrid';
import { coverageAPI, coordinadorAPI } from '../../utils/api';
import { exportCsv } from '../../utils/exportCsv';

export default function CentroGrid() {
  const { ubigeo } = useParams();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [coordMap, setCoordMap] = useState({});  // key = idLocal
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [view, setView]         = useState('cards');

  const loadCoords = useCallback(() => {
    coordinadorAPI.list({ nivel: 'local', ubigeo })
      .then(r => {
        const map = {};
        r.data.data.forEach(c => { map[c.idLocal] = c; });
        setCoordMap(map);
      }).catch(() => {});
  }, [ubigeo]);

  useEffect(() => {
    setLoading(true);
    coverageAPI.centros(ubigeo)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error'))
      .finally(() => setLoading(false));
    loadCoords();
  }, [ubigeo, loadCoords]);

  const first    = data?.centros?.[0];
  const dept     = first?.departamento || '';
  const prov     = first?.provincia    || '';
  const dist     = first?.distrito     || ubigeo;
  const deptCode = ubigeo.slice(0, 2);
  const provCode = ubigeo.slice(0, 4);

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept,       path: `/dept/${deptCode}` },
    { label: prov,       path: `/prov/${provCode}` },
    { label: dist },
  ];

  if (loading) return <AppLayout breadcrumbs={breadcrumbs}><div style={s.center}>⏳ Cargando...</div></AppLayout>;
  if (error)   return <AppLayout breadcrumbs={breadcrumbs}><div style={s.errorBox}>❌ {error}</div></AppLayout>;

  const centros = (data?.centros || []).filter(c =>
    c.nombreLocal?.toLowerCase().includes(search.toLowerCase()) ||
    c.direccion?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const cols = [
      { header: 'Local ID',    key: 'idLocal' },
      { header: 'Nombre',      key: 'nombreLocal' },
      { header: 'Dirección',   key: 'direccion' },
      { header: 'Mesas',       key: 'totalMesas' },
      { header: 'Asignadas',   key: 'asignadas' },
      { header: 'Cobertura%',  key: c => c.cobertura.toFixed(1) },
      { header: 'Electores',   key: 'totalElectores' },
      { header: 'Coordinador', key: c => { const co = coordMap[c.idLocal]; return co ? `${co.nombres} ${co.apellidoPaterno}`.trim() : ''; } },
      { header: 'Teléfono',    key: c => coordMap[c.idLocal]?.telefono || '' },
      { header: 'Correo',      key: c => coordMap[c.idLocal]?.correo   || '' },
    ];
    exportCsv(cols, centros, `centros-${dist}.csv`);
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.toolbar}>
        <div>
          <h2 style={s.title}>{dist}</h2>
          <p style={s.subtitle}>
            {centros.length} centros · {data?.totalMesas?.toLocaleString()} mesas · {Math.round(data?.cobertura)}% cobertura
          </p>
        </div>
        <div style={s.toolbarRight}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar local..." style={s.search} />
          <ViewToggle view={view} onChange={setView} />
          <button onClick={handleExport} style={s.exportBtn}>⬇️ Excel</button>
        </div>
      </div>

      {view === 'cards' ? (
        <div style={s.grid}>
          {centros.map(c => (
            <CentroCard
              key={c.idLocal}
              centro={c}
              coord={coordMap[c.idLocal] || null}
              ubigeo={ubigeo}
              onCoordUpdated={(co) => setCoordMap(m => ({ ...m, [c.idLocal]: co }))}
              onClick={() => navigate(`/centro/${ubigeo}/${encodeURIComponent(c.idLocal)}`)}
            />
          ))}
          {centros.length === 0 && <div style={s.empty}>Sin resultados</div>}
        </div>
      ) : (
        <ListView
          columns={[
            { header: 'Local',       key: c => c.nombreLocal,                    sortKey: 'nombreLocal' },
            { header: 'Dirección',   key: c => c.direccion },
            { header: 'Mesas',       key: c => c.totalMesas,                     sortKey: 'totalMesas' },
            { header: 'Asignadas',   key: c => c.asignadas,                      sortKey: 'asignadas' },
            { header: 'Cobertura',   key: c => <CoverageBar value={c.cobertura} />, sortKey: 'cobertura' },
            { header: 'Electores',   key: c => c.totalElectores?.toLocaleString(), sortKey: 'totalElectores' },
            { header: 'Coordinador', key: c => (
              <CoordinadorBadge
                coord={coordMap[c.idLocal] || null}
                nivel="local" ubigeo={ubigeo} idLocal={c.idLocal}
                nombreJurisdiccion={c.nombreLocal}
                onUpdated={(co) => setCoordMap(m => ({ ...m, [c.idLocal]: co }))}
              />
            )},
          ]}
          rows={centros}
          onRowClick={c => navigate(`/centro/${ubigeo}/${encodeURIComponent(c.idLocal)}`)}
        />
      )}
    </AppLayout>
  );
}

function CentroCard({ centro: c, coord, ubigeo, onCoordUpdated, onClick }) {
  const pct         = Math.round(c.cobertura);
  const color       = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const statusLabel = pct === 100 ? '✅ Completo' : pct > 0 ? '🔄 Parcial' : '⭕ Sin asignar';

  return (
    <button onClick={onClick} style={s.card}>
      {/* Header: nombre + badge coordinador */}
      <div style={s.cardHeader}>
        <div style={s.cardIconWrap}>
          <span style={s.cardIcon}>🏫</span>
          <span style={s.cardName}>{c.nombreLocal}</span>
        </div>
        <CoordinadorBadge
          coord={coord} nivel="local" ubigeo={ubigeo} idLocal={c.idLocal}
          nombreJurisdiccion={c.nombreLocal}
          onUpdated={onCoordUpdated}
        />
      </div>

      <div style={s.direccion}>📍 {c.direccion}</div>
      <div style={s.cardStats}>
        <Stat val={c.totalMesas}               lbl="mesas" />
        <Stat val={c.asignadas}                lbl="asignadas" />
        <Stat val={`${pct}%`} lbl="cobertura" color={color} />
      </div>
      <CoverageBar value={c.cobertura} showLabel={false} />
      <div style={s.footer}>
        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>👤 {c.totalElectores?.toLocaleString()} electores</span>
        <span style={{ fontSize: '0.75rem', color }}>{statusLabel}</span>
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
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: '1rem' },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem',
    cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardHeader:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' },
  cardIconWrap: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem', minWidth: 0, flex: 1 },
  cardIcon:  { fontSize: '1.3rem', flexShrink: 0, marginTop: '0.05rem' },
  cardName:  { fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.3, textAlign: 'left' },
  direccion: { fontSize: '0.77rem', color: '#64748b' },
  cardStats: { display: 'flex', gap: '1rem' },
  cardStat:  { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal:   { fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' },
  statLbl:   { fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  footer:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  center:    { textAlign: 'center', padding: '3rem', color: '#64748b' },
  errorBox:  { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty:     { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
