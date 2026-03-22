import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jefeLocalAPI, personeroAPI } from '../../utils/api';

export default function JefeLocalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jefe, setJefe] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // mesa code
  const [dniSearch, setDniSearch] = useState('');
  const [dniResult, setDniResult] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const j = JSON.parse(localStorage.getItem('jefeLocal'));
      if (!j) { navigate('/jefe-local/login'); return; }
      setJefe(j);
    } catch { navigate('/jefe-local/login'); return; }
  }, [navigate]);

  const load = useCallback(() => {
    jefeLocalAPI.miLocal()
      .then(r => setData(r.data))
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('jefeLocal'); navigate('/jefe-local/login'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('jefeLocal');
    navigate('/jefe-local/login');
  };

  const handleDniSearch = async () => {
    if (!/^\d{8}$/.test(dniSearch)) return;
    try {
      const { data } = await personeroAPI.dniLookup(dniSearch);
      setDniResult(data);
    } catch { setDniResult(null); }
  };

  const handleAsignar = async (personeroId) => {
    setAssigning(true);
    try {
      await jefeLocalAPI.asignar(personeroId, assignModal);
      setAssignModal(null);
      setDniSearch('');
      setDniResult(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al asignar');
    }
    setAssigning(false);
  };

  const handleDesasignar = async (mesaCodigo) => {
    if (!confirm('Quitar personero de esta mesa?')) return;
    try {
      await jefeLocalAPI.desasignar(mesaCodigo);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al desasignar');
    }
  };

  const statusLabels = { 0: '⭕ Sin asignar', 1: '✅ Asignado', 2: '🏆 Confirmado' };
  const statusColors = { 0: '#dc2626', 1: '#2563eb', 2: '#16a34a' };

  if (loading) return <div style={s.page}><p style={{ color: '#fff' }}>Cargando...</p></div>;
  if (!data) return null;

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.headerIcon}>🏢</div>
            <h2 style={s.headerTitle}>{data.local.nombreLocal}</h2>
            <p style={s.headerSub}>{data.local.direccion} — {data.local.distrito}, {data.local.provincia}</p>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Salir</button>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          <div style={s.stat}><div style={s.statNum}>{data.stats.total}</div><div style={s.statLbl}>Total Mesas</div></div>
          <div style={s.stat}><div style={{ ...s.statNum, color: '#2563eb' }}>{data.stats.asignadas}</div><div style={s.statLbl}>Asignadas</div></div>
          <div style={s.stat}><div style={{ ...s.statNum, color: '#16a34a' }}>{data.stats.confirmadas}</div><div style={s.statLbl}>Confirmadas</div></div>
          <div style={s.stat}><div style={{ ...s.statNum, color: data.stats.total > 0 ? '#1e293b' : '#94a3b8' }}>{data.stats.total > 0 ? Math.round(data.stats.asignadas / data.stats.total * 100) : 0}%</div><div style={s.statLbl}>Cobertura</div></div>
        </div>

        {/* Mesas table */}
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Mesa</th>
                <th style={s.th}>Electores</th>
                <th style={s.th}>Personero</th>
                <th style={s.th}>Telefono</th>
                <th style={s.th}>Estado</th>
                <th style={{ ...s.th, width: 100 }}>Accion</th>
              </tr>
            </thead>
            <tbody>
              {data.mesas.map(m => (
                <tr key={m.mesa}>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600 }}>{m.mesa}</td>
                  <td style={s.td}>{m.electores}</td>
                  <td style={s.td}>{m.personero ? `${m.personero.nombres} ${m.personero.apellidoPaterno}` : '—'}</td>
                  <td style={s.td}>{m.personero?.telefono || '—'}</td>
                  <td style={s.td}><span style={{ color: statusColors[m.status], fontWeight: 500, fontSize: '0.82rem' }}>{statusLabels[m.status]}</span></td>
                  <td style={s.td}>
                    {m.status === 0 && (
                      <button onClick={() => { setAssignModal(m.mesa); setDniResult(null); setDniSearch(''); }} style={s.assignBtn}>Asignar</button>
                    )}
                    {m.status >= 1 && (
                      <button onClick={() => handleDesasignar(m.mesa)} style={s.removeBtn}>Quitar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Assign modal */}
        {assignModal && (
          <div style={s.overlay} onClick={() => setAssignModal(null)}>
            <div style={s.modal} onClick={e => e.stopPropagation()}>
              <h3 style={s.modalTitle}>Asignar personero a mesa {assignModal}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input style={s.modalInput} value={dniSearch} maxLength={8} placeholder="Buscar por DNI"
                  onChange={e => setDniSearch(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleDniSearch()} />
                <button onClick={handleDniSearch} style={s.searchBtn}>Buscar</button>
              </div>
              {dniResult && (
                <div style={s.resultCard}>
                  {dniResult.registered && dniResult.personero ? (
                    <>
                      <div style={s.resultName}>{dniResult.personero.nombres} {dniResult.personero.apellidoPaterno}</div>
                      <div style={s.resultDni}>DNI: {dniResult.personero.dni} — Tel: {dniResult.personero.telefono || 'sin tel'}</div>
                      <div style={s.resultStatus}>Estado: {dniResult.personero.assignmentStatus}</div>
                      {dniResult.personero.assignmentStatus === 'pendiente' && (
                        <button onClick={() => handleAsignar(dniResult.personero._id)} disabled={assigning}
                          style={s.confirmBtn}>{assigning ? 'Asignando...' : 'Asignar a esta mesa'}</button>
                      )}
                      {dniResult.personero.assignmentStatus !== 'pendiente' && (
                        <div style={s.warnText}>Este personero ya esta asignado a otra mesa</div>
                      )}
                    </>
                  ) : (
                    <div style={s.notFound}>No se encontro un personero registrado con ese DNI</div>
                  )}
                </div>
              )}
              <button onClick={() => setAssignModal(null)} style={s.cancelBtn}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f1f5f9', padding: '1rem' },
  container: { maxWidth: '800px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', background: '#fff', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' },
  headerIcon: { fontSize: '1.5rem' },
  headerTitle: { margin: '0.25rem 0 0.15rem', fontSize: '1.1rem', color: '#1e293b' },
  headerSub: { margin: 0, fontSize: '0.8rem', color: '#64748b' },
  logoutBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: '80px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' },
  statNum: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' },
  statLbl: { fontSize: '0.72rem', color: '#64748b' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#f8fafc', padding: '0.6rem 0.75rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#475569' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' },
  assignBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  removeBtn: { background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '420px', maxWidth: '90vw' },
  modalTitle: { margin: '0 0 0.75rem', fontSize: '1rem', color: '#1e293b' },
  modalInput: { flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' },
  searchBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer' },
  resultCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' },
  resultName: { fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' },
  resultDni: { fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' },
  resultStatus: { fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' },
  confirmBtn: { width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  warnText: { color: '#d97706', fontSize: '0.8rem', marginTop: '0.3rem' },
  notFound: { color: '#94a3b8', fontSize: '0.85rem' },
  cancelBtn: { width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' },
};
