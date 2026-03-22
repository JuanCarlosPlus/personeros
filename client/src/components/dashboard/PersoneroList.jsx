import { useState, useEffect } from 'react';
import AppLayout from '../layout/AppLayout';
import { personeroAPI } from '../../utils/api';

const STATUS_LABELS = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
  asignado: { label: 'Asignado', color: '#10b981', bg: '#ecfdf5' },
  confirmado: { label: 'Confirmado', color: '#8b5cf6', bg: '#ede9fe' },
  sin_mesa: { label: 'Sin mesa', color: '#94a3b8', bg: '#f8fafc' },
};

export default function PersoneroList() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: 'Personeros' },
  ];

  const load = () => {
    setLoading(true);
    personeroAPI.list({ search, status, page, limit: 50 })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [search, status]);
  useEffect(() => { load(); }, [search, status, page]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.header}>
        <h2 style={s.title}>👥 Personeros registrados</h2>
        <span style={s.count}>{data.total.toLocaleString()} total</span>
      </div>

      <div style={s.filters}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar por DNI, nombre..."
          style={s.search}
        />
        <select value={status} onChange={e => setStatus(e.target.value)} style={s.select}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="asignado">Asignado</option>
          <option value="confirmado">Confirmado</option>
          <option value="sin_mesa">Sin mesa</option>
        </select>
      </div>

      {loading ? (
        <div style={s.center}>⏳ Cargando...</div>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['DNI', 'Nombre', 'Teléfono', 'Correo', 'Ubigeo', 'Mesa asignada', 'Estado', ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.data.map(p => {
                  const st = STATUS_LABELS[p.assignmentStatus] || STATUS_LABELS.pendiente;
                  return (
                    <tr key={p._id} style={s.tr}>
                      <td style={s.td}><span style={s.mono}>{p.dni}</span></td>
                      <td style={s.td}>
                        {p.apellidoPaterno} {p.apellidoMaterno}, {p.nombres}
                      </td>
                      <td style={s.td}>{p.telefono || '—'}</td>
                      <td style={s.td}>{p.correo || '—'}</td>
                      <td style={s.td}><span style={s.mono}>{p.ubigeo || '—'}</span></td>
                      <td style={s.td}><span style={s.mono}>{p.assignedMesa || '—'}</span></td>
                      <td style={s.td}>
                        <span style={{ background: st.bg, color: st.color, borderRadius: '99px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={s.td}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Eliminar a ${p.nombres} ${p.apellidoPaterno}?`)) {
                              personeroAPI.remove(p._id).then(() => load()).catch(err => alert(err.response?.data?.error || 'Error'));
                            }
                          }}
                          style={s.deleteBtn}
                          title="Eliminar personero"
                        >🗑️</button>
                      </td>
                    </tr>
                  );
                })}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No se encontraron personeros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > 50 && (
            <div style={s.pagination}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={s.pageBtn}>← Anterior</button>
              <span style={s.pageInfo}>Página {page} · {data.total} resultados</span>
              <button disabled={page * 50 >= data.total} onClick={() => setPage(p => p + 1)} style={s.pageBtn}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

const s = {
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' },
  title: { fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' },
  count: { background: '#dbeafe', color: '#1d4ed8', borderRadius: '99px', padding: '0.2rem 0.75rem', fontSize: '0.8rem', fontWeight: 700 },
  filters: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  search: {
    padding: '0.55rem 0.9rem', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '0.9rem', outline: 'none', flex: '1 1 200px',
  },
  select: {
    padding: '0.55rem 0.9rem', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#fff',
  },
  tableWrap: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    background: '#f8fafc', padding: '0.75rem 1rem',
    textAlign: 'left', fontSize: '0.75rem', fontWeight: 700,
    color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '0.65rem 1rem', fontSize: '0.85rem', color: '#374151', verticalAlign: 'middle' },
  mono: { fontFamily: 'monospace', fontSize: '0.82rem' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' },
  pageBtn: {
    background: '#fff', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', padding: '0.45rem 1rem',
    fontSize: '0.85rem', color: '#374151',
  },
  pageInfo: { color: '#64748b', fontSize: '0.85rem' },
  deleteBtn: {
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
    padding: '0.2rem 0.4rem', borderRadius: '4px', opacity: 0.6,
  },
};
