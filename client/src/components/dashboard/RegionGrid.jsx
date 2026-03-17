import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import StatCard from './StatCard';
import CoverageBar from './CoverageBar';
import CoordinadorBadge from '../coordinadores/CoordinadorBadge';
import { coverageAPI, personeroAPI, coordinadorAPI } from '../../utils/api';
import { exportCsv } from '../../utils/exportCsv';

export default function RegionGrid() {
  const navigate = useNavigate();
  const [data, setData]                     = useState(null);
  const [personeroStats, setPersoneroStats]  = useState(null);
  const [coordMap, setCoordMap]             = useState({});
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [search, setSearch]                 = useState('');
  const [view, setView]                     = useState('cards');

  const breadcrumbs = [{ label: 'Nacional' }];

  const loadCoords = useCallback(() => {
    coordinadorAPI.list({ nivel: 'region' })
      .then(r => {
        const map = {};
        r.data.data.forEach(c => { map[c.ubigeo] = c; });
        setCoordMap(map);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([coverageAPI.national(), personeroAPI.stats()])
      .then(([cov, per]) => { setData(cov.data); setPersoneroStats(per.data); })
      .catch(err => setError(err.response?.data?.error || 'Error cargando datos'))
      .finally(() => setLoading(false));
    loadCoords();
  }, [loadCoords]);

  if (loading) return <AppLayout breadcrumbs={breadcrumbs}><div style={s.center}>⏳ Cargando...</div></AppLayout>;
  if (error)   return <AppLayout breadcrumbs={breadcrumbs}><div style={s.errorBox}>❌ {error}</div></AppLayout>;

  const regions  = data?.regions || [];
  const filtered = regions.filter(r =>
    r.departamento?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const cols = [
      { header: 'Región',      key: 'departamento' },
      { header: 'Mesas',       key: 'totalMesas' },
      { header: 'Asignadas',   key: 'asignadas' },
      { header: 'Confirmadas', key: 'confirmadas' },
      { header: 'Cobertura%',  key: r => r.cobertura.toFixed(1) },
      { header: 'Electores',   key: 'totalElectores' },
      { header: 'Coordinador', key: r => {
        const c = coordMap[r.ubigeoPrefix];
        return c ? `${c.nombres} ${c.apellidoPaterno} ${c.apellidoMaterno || ''}`.trim() : '';
      }},
      { header: 'Teléfono', key: r => coordMap[r.ubigeoPrefix]?.telefono || '' },
      { header: 'Correo',   key: r => coordMap[r.ubigeoPrefix]?.correo   || '' },
    ];
    exportCsv(cols, filtered, 'regiones.csv');
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Summary stats */}
      <div style={s.statsRow}>
        <StatCard icon="🗳️" label="Total Mesas" color="#3b82f6"
          value={data?.totalMesas?.toLocaleString()} sub={`${data?.cobertura}% cobertura`} />
        <StatCard icon="✅" label="Asignadas"    color="#10b981" value={data?.asignadas?.toLocaleString()} />
        <StatCard icon="🏆" label="Confirmadas"  color="#8b5cf6" value={data?.confirmadas?.toLocaleString()} />
        <StatCard icon="👥" label="Personeros"   color="#f59e0b"
          value={personeroStats?.total?.toLocaleString()} sub={`${personeroStats?.asignados} asignados`} />
        <StatCard icon="🗺️" label="Electores"   color="#06b6d4" value={data?.totalElectores?.toLocaleString()} />
      </div>

      {/* Toolbar */}
      <div style={s.toolbar}>
        <h2 style={s.sectionTitle}>Regiones / Departamentos</h2>
        <div style={s.toolbarRight}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar región..." style={s.search} />
          <ViewToggle view={view} onChange={setView} />
          <button onClick={handleExport} style={s.exportBtn}>⬇️ Excel</button>
        </div>
      </div>

      {view === 'cards' ? (
        <div style={s.grid}>
          {filtered.map(r => (
            <RegionCard
              key={r.departamento}
              region={r}
              coord={coordMap[r.ubigeoPrefix] || null}
              onCoordUpdated={(c) => setCoordMap(m => ({ ...m, [r.ubigeoPrefix]: c }))}
              onClick={() => navigate(`/dept/${r.ubigeoPrefix}`)}
            />
          ))}
          {filtered.length === 0 && <div style={s.empty}>No se encontraron regiones</div>}
        </div>
      ) : (
        <ListView
          columns={[
            { header: 'Región',      key: r => r.departamento },
            { header: 'Mesas',       key: r => r.totalMesas?.toLocaleString() },
            { header: 'Asignadas',   key: r => r.asignadas?.toLocaleString() },
            { header: 'Cobertura',   key: r => <CoverageBar value={r.cobertura} /> },
            { header: 'Electores',   key: r => r.totalElectores?.toLocaleString() },
            { header: 'Coordinador', key: r => (
              <CoordinadorBadge
                coord={coordMap[r.ubigeoPrefix] || null}
                nivel="region" ubigeo={r.ubigeoPrefix}
                nombreJurisdiccion={r.departamento}
                onUpdated={(c) => setCoordMap(m => ({ ...m, [r.ubigeoPrefix]: c }))}
              />
            )},
          ]}
          rows={filtered}
          onRowClick={r => navigate(`/dept/${r.ubigeoPrefix}`)}
        />
      )}
    </AppLayout>
  );
}

function RegionCard({ region: r, coord, onCoordUpdated, onClick }) {
  const pct   = Math.round(r.cobertura);
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <button onClick={onClick} style={s.card}>
      <div style={s.cardHeader}>
        <div style={s.cardIconWrap}>
          <span style={s.cardIcon}>🗺️</span>
          <span style={s.cardName}>{r.departamento}</span>
        </div>
        <CoordinadorBadge
          coord={coord} nivel="region" ubigeo={r.ubigeoPrefix}
          nombreJurisdiccion={r.departamento}
          onUpdated={onCoordUpdated}
        />
      </div>
      <div style={s.cardStats}>
        <Stat val={r.totalMesas?.toLocaleString()} lbl="mesas" />
        <Stat val={r.asignadas?.toLocaleString()}  lbl="asignadas" />
        <Stat val={`${pct}%`} lbl="cobertura" color={color} />
      </div>
      <CoverageBar value={r.cobertura} showLabel={false} />
      <div style={s.electores}>👤 {r.totalElectores?.toLocaleString()} electores</div>
    </button>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────────────
function Stat({ val, lbl, color }) {
  return (
    <div style={s.cardStat}>
      <span style={{ ...s.statVal, ...(color ? { color } : {}) }}>{val}</span>
      <span style={s.statLbl}>{lbl}</span>
    </div>
  );
}

export function ViewToggle({ view, onChange }) {
  return (
    <div style={s.toggle}>
      <button onClick={() => onChange('cards')}
        style={{ ...s.toggleBtn, ...(view === 'cards' ? s.toggleActive : {}) }}>⊞ Cards</button>
      <button onClick={() => onChange('list')}
        style={{ ...s.toggleBtn, ...(view === 'list'  ? s.toggleActive : {}) }}>☰ Lista</button>
    </div>
  );
}

export function ListView({ columns, rows, onRowClick }) {
  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>{columns.map((c, i) => <th key={i} style={s.th}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} onClick={() => onRowClick?.(row)} style={s.tr}>
              {columns.map((c, ci) => (
                <td key={ci} style={{ ...s.td, ...(ci === 0 ? { fontWeight: 600, color: '#1e293b' } : {}) }}>
                  {c.key(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Sin resultados</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px,1fr))', gap: '1rem', marginBottom: '1.5rem' },
  toolbar:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  search:    { padding: '0.5rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', minWidth: '180px' },
  toggle:    { display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
  toggleBtn: { padding: '0.45rem 0.85rem', border: 'none', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', color: '#64748b' },
  toggleActive: { background: '#1e3a5f', color: '#fff', fontWeight: 600 },
  exportBtn: { padding: '0.45rem 0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '1rem' },
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
  tableWrap: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse' },
  th:        { background: '#f8fafc', padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  tr:        { borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
  td:        { padding: '0.6rem 1rem', fontSize: '0.85rem', color: '#374151', verticalAlign: 'middle' },
  center:    { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox:  { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty:     { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
