import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jefeLocalAPI } from '../../utils/api';

export default function JefeLocalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jefe, setJefe] = useState(null);
  const [tab, setTab] = useState('mesas'); // 'mesas' | 'registrar'
  // Assign modal
  const [assignModal, setAssignModal] = useState(null);
  const [dniSearch, setDniSearch] = useState('');
  const [dniResult, setDniResult] = useState(null);
  const [assigning, setAssigning] = useState(false);
  // Register form
  const [regDni, setRegDni] = useState('');
  const [regData, setRegData] = useState(null);
  const [regTel, setRegTel] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regSaving, setRegSaving] = useState(false);
  const [regMsg, setRegMsg] = useState(null);
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
      .catch(() => { localStorage.removeItem('jefeLocalToken'); localStorage.removeItem('jefeLocal'); navigate('/jefe-local/login'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const logout = () => {
    localStorage.removeItem('jefeLocalToken');
    localStorage.removeItem('jefeLocal');
    navigate('/jefe-local/login');
  };

  // --- Assign logic ---
  const handleDniSearch = async () => {
    if (!/^\d{8}$/.test(dniSearch)) return;
    try {
      const { data } = await jefeLocalAPI.dniLookup(dniSearch);
      setDniResult(data);
    } catch { setDniResult(null); }
  };

  const handleAsignar = async (personeroId) => {
    setAssigning(true);
    try {
      await jefeLocalAPI.asignar(personeroId, assignModal);
      setAssignModal(null); setDniSearch(''); setDniResult(null);
      load();
    } catch (err) { alert(err.response?.data?.error || 'Error al asignar'); }
    setAssigning(false);
  };

  const handleDesasignar = async (mesaCodigo) => {
    if (!confirm('Quitar personero de esta mesa?')) return;
    try { await jefeLocalAPI.desasignar(mesaCodigo); load(); }
    catch (err) { alert(err.response?.data?.error || 'Error'); }
  };

  // --- Register logic ---
  const handleRegDniSearch = async () => {
    if (!/^\d{8}$/.test(regDni)) return;
    setRegData(null); setRegMsg(null);
    try {
      const { data } = await jefeLocalAPI.dniLookup(regDni);
      if (data.registered && data.personero) {
        setRegData({ nombres: data.personero.nombres, apellidoPaterno: data.personero.apellidoPaterno, apellidoMaterno: data.personero.apellidoMaterno || '', yaRegistrado: true, status: data.personero.assignmentStatus });
        setRegTel(data.personero.telefono || '');
        setRegCorreo(data.personero.correo || '');
      } else if (data.reniec) {
        setRegData({ nombres: data.reniec.nombres, apellidoPaterno: data.reniec.apellidoPaterno, apellidoMaterno: data.reniec.apellidoMaterno || '', yaRegistrado: false });
        setRegTel(''); setRegCorreo('');
      } else {
        setRegMsg({ type: 'error', text: 'DNI no encontrado en RENIEC' });
      }
    } catch { setRegMsg({ type: 'error', text: 'Error consultando DNI' }); }
  };

  const handleRegistrar = async () => {
    setRegSaving(true); setRegMsg(null);
    try {
      const { data } = await jefeLocalAPI.registrarPersonero({
        dni: regDni, nombres: regData.nombres, apellidoPaterno: regData.apellidoPaterno,
        apellidoMaterno: regData.apellidoMaterno, telefono: regTel, correo: regCorreo,
      });
      setRegMsg({ type: 'ok', text: `${data.personero.nombres} registrado y asignado a su local` });
      setRegDni(''); setRegData(null); setRegTel(''); setRegCorreo('');
      load();
    } catch (err) { setRegMsg({ type: 'error', text: err.response?.data?.error || 'Error' }); }
    setRegSaving(false);
  };

  const statusLabels = { 0: '⭕ Sin asignar', 1: '✅ Asignado', 2: '🏆 Confirmado' };
  const statusColors = { 0: '#dc2626', 1: '#2563eb', 2: '#16a34a' };

  // Personeros asignados al local pero sin mesa
  const personerosDelLocal = data?.mesas?.filter(m => m.personero).map(m => m.personero) || [];

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

        {/* Tabs */}
        <div style={s.tabs}>
          <button onClick={() => setTab('mesas')} style={{ ...s.tabBtn, ...(tab === 'mesas' ? s.tabActive : {}) }}>📋 Mesas ({data.mesas.length})</button>
          <button onClick={() => setTab('registrar')} style={{ ...s.tabBtn, ...(tab === 'registrar' ? s.tabActive : {}) }}>➕ Registrar Personero</button>
        </div>

        {/* Tab: Mesas */}
        {tab === 'mesas' && (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Mesa</th><th style={s.th}>Electores</th>
                  <th style={s.th}>Personero</th><th style={s.th}>Telefono</th>
                  <th style={s.th}>Estado</th><th style={{ ...s.th, width: 100 }}>Accion</th>
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
                      {m.status === 0 && <button onClick={() => { setAssignModal(m.mesa); setDniResult(null); setDniSearch(''); }} style={s.assignBtn}>Asignar</button>}
                      {m.status >= 1 && <button onClick={() => handleDesasignar(m.mesa)} style={s.removeBtn}>Quitar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Registrar Personero */}
        {tab === 'registrar' && (
          <div style={s.registerBox}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#1e293b' }}>Registrar Personero para este Local</h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b' }}>
              Ingrese el DNI del personero. Sus datos se consultaran automaticamente y quedara asignado a este local de votacion.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input style={s.modalInput} value={regDni} maxLength={8} placeholder="DNI (8 digitos)"
                onChange={e => { setRegDni(e.target.value.replace(/\D/g, '')); setRegData(null); setRegMsg(null); }}
                onKeyDown={e => e.key === 'Enter' && handleRegDniSearch()} />
              <button onClick={handleRegDniSearch} disabled={regDni.length !== 8} style={{ ...s.searchBtn, opacity: regDni.length !== 8 ? 0.5 : 1 }}>Buscar DNI</button>
            </div>

            {regMsg && (
              <div style={{ ...s.msgBox, background: regMsg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: regMsg.type === 'ok' ? '#16a34a' : '#dc2626', border: `1px solid ${regMsg.type === 'ok' ? '#bbf7d0' : '#fecaca'}` }}>
                {regMsg.text}
              </div>
            )}

            {regData && (
              <div style={s.regCard}>
                {regData.yaRegistrado && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.5rem', marginBottom: '0.5rem', fontSize: '0.78rem', color: '#92400e' }}>
                    Este personero ya esta registrado ({regData.status}). Se actualizara y asignara a su local.
                  </div>
                )}
                <div style={s.regGrid}>
                  <div><span style={s.regLabel}>Nombres</span><div style={s.regValue}>{regData.nombres}</div></div>
                  <div><span style={s.regLabel}>Ap. Paterno</span><div style={s.regValue}>{regData.apellidoPaterno}</div></div>
                  <div><span style={s.regLabel}>Ap. Materno</span><div style={s.regValue}>{regData.apellidoMaterno}</div></div>
                </div>
                <div style={s.regGrid}>
                  <div>
                    <span style={s.regLabel}>Celular *</span>
                    <input style={s.regInput} value={regTel} placeholder="999999999"
                      onChange={e => setRegTel(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div>
                    <span style={s.regLabel}>Correo</span>
                    <input style={s.regInput} value={regCorreo} placeholder="correo@ejemplo.com"
                      onChange={e => setRegCorreo(e.target.value)} />
                  </div>
                </div>
                <button onClick={handleRegistrar} disabled={regSaving || !regTel}
                  style={{ ...s.confirmBtn, opacity: regSaving || !regTel ? 0.5 : 1 }}>
                  {regSaving ? 'Guardando...' : 'Registrar y Asignar a mi Local'}
                </button>
              </div>
            )}
          </div>
        )}

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
                  ) : dniResult.reniec ? (
                    <div style={s.notFound}>Este DNI no esta registrado como personero. Use la pestana "Registrar Personero" para agregarlo primero.</div>
                  ) : (
                    <div style={s.notFound}>DNI no encontrado</div>
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
  tabs: { display: 'flex', gap: '0.3rem', marginBottom: '1rem', background: '#fff', borderRadius: '8px', padding: '0.25rem', border: '1px solid #e2e8f0' },
  tabBtn: { flex: 1, padding: '0.5rem', border: 'none', borderRadius: '6px', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer', color: '#64748b', fontWeight: 500 },
  tabActive: { background: '#1e3a5f', color: '#fff', fontWeight: 600 },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#f8fafc', padding: '0.6rem 0.75rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#475569' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' },
  assignBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  removeBtn: { background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer' },
  registerBox: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' },
  regCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginTop: '0.5rem' },
  regGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' },
  regLabel: { display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '0.15rem' },
  regValue: { fontSize: '0.88rem', fontWeight: 500, color: '#1e293b' },
  regInput: { width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' },
  msgBox: { borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', marginBottom: '0.5rem' },
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
  notFound: { color: '#64748b', fontSize: '0.85rem' },
  cancelBtn: { width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' },
};
