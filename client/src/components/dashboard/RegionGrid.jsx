import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import StatCard from './StatCard';
import CoverageBar from './CoverageBar';
import CoordinadorBadge from '../coordinadores/CoordinadorBadge';
import { coverageAPI, personeroAPI, coordinadorAPI } from '../../utils/api';
import { exportCsv } from '../../utils/exportCsv';

export default function RegionGrid() {
  const navigate = useNavigate();
  const [data, setData]                    = useState(null);
  const [personeroStats, setPersoneroStats] = useState(null);
  const [coordMap, setCoordMap]            = useState({});
  const [loading, setLoading]              = useState(true);
  const [error, setError]                  = useState('');
  const [search, setSearch]                = useState('');
  const [view, setView]                    = useState('cards');
  const [mode, setMode]                    = useState('nacional'); // 'nacional' | 'extranjero'

  const breadcrumbs = [{ label: 'Nacional' }];

  const loadCoords = useCallback(() => {
    coordinadorAPI.list({ nivel: 'region' })
      .then(r => {
        const map = {};
        r.data.data.forEach(c => { map[c.ubigeo] = c; });
        setCoordMap(map);
      }).catch(() => {});
  }, []);

  // Stats de personeros: solo una vez
  useEffect(() => {
    personeroAPI.stats()
      .then(per => setPersoneroStats(per.data))
      .catch(() => {});
  }, []);

  // Cobertura: recargar al cambiar modo
  useEffect(() => {
    setLoading(true);
    setError('');
    const tipo = mode === 'extranjero' ? 'Extranjero' : 'Nacional';
    coverageAPI.national(tipo)
      .then(cov => setData(cov.data))
      .catch(err => setError(err.response?.data?.error || 'Error cargando datos'))
      .finally(() => setLoading(false));
    loadCoords();
  }, [mode, loadCoords]);

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
    exportCsv(cols, filtered, mode === 'extranjero' ? 'extranjero.csv' : 'regiones.csv');
  };

  // Botón de modo:
  //   Nacional  → clic → muestra Extranjero
  //   Extranjero → clic → navega directo a Lima (/dept/14)
  const handleModeBtn = () => {
    if (mode === 'nacional') {
      setMode('extranjero');
    } else {
      navigate('/dept/14'); // "click nuevamente → regiones de Lima"
    }
  };

  const isExtranjero    = mode === 'extranjero';
  const sectionTitle    = isExtranjero
    ? `🌐 Voto Exterior — Países (${filtered.length})`
    : `Regiones / Departamentos (${filtered.length})`;
  const modeBtnLabel    = isExtranjero ? '📍 Lima' : '🌐 Extranjero';
  const modeBtnStyle    = isExtranjero
    ? { ...s.modeBtn, background: '#f59e0b' }
    : { ...s.modeBtn, background: '#6366f1' };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* Tarjetas de resumen */}
      <div style={s.statsRow}>
        <StatCard icon={isExtranjero ? '🌍' : '🗳️'} label="Total Mesas" color="#3b82f6"
          value={data?.totalMesas?.toLocaleString()} sub={`${(data?.cobertura ?? 0).toFixed(1)}% cobertura`} />
        <StatCard icon="✅" label="Asignadas"    color="#10b981" value={data?.asignadas?.toLocaleString()} />
        <StatCard icon="🏆" label="Confirmadas"  color="#8b5cf6" value={data?.confirmadas?.toLocaleString()} />
        <StatCard icon="👥" label="Personeros"   color="#f59e0b"
          value={personeroStats?.total?.toLocaleString()} sub={`${personeroStats?.asignados} asignados`} />
        <StatCard icon="🗺️" label="Electores"   color="#06b6d4" value={data?.totalElectores?.toLocaleString()} />
      </div>

      {/* Barra de herramientas */}
      <div style={s.toolbar}>
        <h2 style={s.sectionTitle}>{sectionTitle}</h2>
        <div style={s.toolbarRight}>
          <button onClick={handleModeBtn} style={modeBtnStyle}>{modeBtnLabel}</button>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isExtranjero ? '🔍 Buscar país...' : '🔍 Buscar región...'}
            style={s.search}
          />
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
          {filtered.length === 0 && (
            <div style={s.empty}>
              {isExtranjero ? 'No hay datos de voto exterior' : 'No se encontraron regiones'}
            </div>
          )}
        </div>
      ) : (
        <ListView
          columns={[
            { header: 'Región',      key: r => r.departamento,                  sortKey: 'departamento' },
            { header: 'Mesas',       key: r => r.totalMesas?.toLocaleString(),   sortKey: 'totalMesas' },
            { header: 'Asignadas',   key: r => r.asignadas?.toLocaleString(),    sortKey: 'asignadas' },
            { header: 'Cobertura',   key: r => <CoverageBar value={r.cobertura} />, sortKey: 'cobertura' },
            { header: 'Electores',   key: r => r.totalElectores?.toLocaleString(), sortKey: 'totalElectores' },
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

// ── Helpers compartidos ───────────────────────────────────────────────────────
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

// ListView con columnas ordenables
// Cada columna puede tener:
//   key:     (row) => ReactNode   — cómo renderizar la celda
//   sortKey: string               — campo del objeto row para ordenar (opcional)
//   header:  string               — encabezado visible
export function ListView({ columns, rows, onRowClick }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  const toggleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc'); // primer clic: mayor a menor
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''), 'es')
        : String(bv ?? '').localeCompare(String(av ?? ''), 'es');
    });
  }, [rows, sortKey, sortDir]);

  const sortIcon = (key) => {
    if (!key) return null;
    if (sortKey !== key) return <span style={s.sortIdle}>⇅</span>;
    return <span style={s.sortActive}>{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>;
  };

  return (
    <div style={s.tableWrap}>
      <table style={s.table}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th
                key={i}
                style={{
                  ...s.th,
                  cursor:     c.sortKey ? 'pointer' : 'default',
                  userSelect: 'none',
                  ...(sortKey === c.sortKey ? s.thActive : {}),
                }}
                onClick={() => c.sortKey && toggleSort(c.sortKey)}
                title={c.sortKey ? 'Clic para ordenar' : undefined}
              >
                {c.header}{sortIcon(c.sortKey)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr key={ri} onClick={() => onRowClick?.(row)} style={s.tr}>
              {columns.map((c, ci) => (
                <td key={ci} style={{ ...s.td, ...(ci === 0 ? { fontWeight: 600, color: '#1e293b' } : {}) }}>
                  {c.key(row)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s = {
  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px,1fr))', gap: '1rem', marginBottom: '1.5rem' },
  toolbar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 },
  toolbarRight: { display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  search:       { padding: '0.5rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', minWidth: '180px' },
  toggle:       { display: 'flex', border: '1.5px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' },
  toggleBtn:    { padding: '0.45rem 0.85rem', border: 'none', background: '#fff', fontSize: '0.82rem', cursor: 'pointer', color: '#64748b' },
  toggleActive: { background: '#1e3a5f', color: '#fff', fontWeight: 600 },
  exportBtn:    { padding: '0.45rem 0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' },
  modeBtn:      { padding: '0.45rem 0.9rem', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '1rem' },
  card: {
    background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem',
    cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s',
    display: 'flex', flexDirection: 'column', gap: '0.65rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  cardHeader:   { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' },
  cardIconWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 },
  cardIcon:     { fontSize: '1.2rem', flexShrink: 0 },
  cardName:     { fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardStats:    { display: 'flex', gap: '1rem' },
  cardStat:     { display: 'flex', flexDirection: 'column', gap: '0.1rem', flex: 1 },
  statVal:      { fontSize: '1rem', fontWeight: 700, color: '#0f172a' },
  statLbl:      { fontSize: '0.67rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  electores:    { fontSize: '0.77rem', color: '#64748b' },

  // tabla
  tableWrap:  { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { background: '#f8fafc', padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', transition: 'background 0.1s' },
  thActive:   { background: '#eff6ff', color: '#1e3a5f' },
  tr:         { borderBottom: '1px solid #f1f5f9', cursor: 'pointer' },
  td:         { padding: '0.6rem 1rem', fontSize: '0.85rem', color: '#374151', verticalAlign: 'middle' },
  sortIdle:   { marginLeft: '4px', color: '#cbd5e1', fontSize: '0.65rem' },
  sortActive: { marginLeft: '4px', color: '#1e3a5f', fontSize: '0.65rem', fontWeight: 700 },

  center:   { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox: { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  empty:    { color: '#94a3b8', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' },
};
