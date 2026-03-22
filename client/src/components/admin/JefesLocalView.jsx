import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../layout/AppLayout';
import { jefeLocalAPI } from '../../utils/api';

export default function JefesLocalView() {
  const [jefes, setJefes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ telefono: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', ubigeo: '', idLocal: '', nombreLocal: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await jefeLocalAPI.list(); setJefes(data); } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await jefeLocalAPI.crear(form);
      setMsg({ type: 'ok', text: 'Jefe de local creado' });
      setModal(false);
      setForm({ telefono: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', ubigeo: '', idLocal: '', nombreLocal: '' });
      load();
    } catch (err) { setMsg({ type: 'error', text: err.response?.data?.error || 'Error' }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Desactivar este jefe de local?')) return;
    try { await jefeLocalAPI.remove(id); load(); } catch { /* */ }
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Jefes de Local' }]}>
      <div style={s.header}>
        <h2 style={s.title}>Jefes de Local de Votacion</h2>
        <button onClick={() => setModal(true)} style={s.addBtn}>+ Nuevo Jefe de Local</button>
      </div>

      {msg && (
        <div style={{ ...s.msg, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#16a34a' : '#dc2626' }}>
          {msg.text} <button onClick={() => setMsg(null)} style={s.msgX}>x</button>
        </div>
      )}

      {loading ? <p>Cargando...</p> : (
        <div style={s.tw}>
          <table style={s.t}>
            <thead><tr>
              <th style={s.th}>Telefono</th><th style={s.th}>Nombre</th><th style={s.th}>Ubigeo</th><th style={s.th}>ID Local</th><th style={s.th}>Local</th><th style={s.th}>Acciones</th>
            </tr></thead>
            <tbody>
              {jefes.map(j => (
                <tr key={j._id}>
                  <td style={s.td}>{j.telefono}</td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{j.nombres} {j.apellidoPaterno}</td>
                  <td style={s.td}><code>{j.ubigeo}</code></td>
                  <td style={s.td}>{j.idLocal}</td>
                  <td style={s.td}>{j.nombreLocal}</td>
                  <td style={s.td}><button onClick={() => handleDelete(j._id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' }}>Eliminar</button></td>
                </tr>
              ))}
              {jefes.length === 0 && <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No hay jefes de local</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={s.overlay} onClick={() => setModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Nuevo Jefe de Local</h3>
            <div style={s.row}><div style={s.f}><label style={s.l}>Telefono</label><input style={s.i} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="999999999" /></div></div>
            <div style={s.row}><div style={s.f}><label style={s.l}>Nombres</label><input style={s.i} value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} /></div><div style={s.f}><label style={s.l}>Ap. Paterno</label><input style={s.i} value={form.apellidoPaterno} onChange={e => setForm(f => ({ ...f, apellidoPaterno: e.target.value }))} /></div></div>
            <div style={s.row}><div style={s.f}><label style={s.l}>Ubigeo del local</label><input style={s.i} value={form.ubigeo} onChange={e => setForm(f => ({ ...f, ubigeo: e.target.value }))} placeholder="150101" /></div><div style={s.f}><label style={s.l}>ID Local</label><input style={s.i} value={form.idLocal} onChange={e => setForm(f => ({ ...f, idLocal: e.target.value }))} placeholder="001" /></div></div>
            <div style={s.row}><div style={s.f}><label style={s.l}>Nombre del local</label><input style={s.i} value={form.nombreLocal} onChange={e => setForm(f => ({ ...f, nombreLocal: e.target.value }))} placeholder="I.E. Jose Olaya" /></div></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setModal(false)} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' },
  title: { margin: 0, fontSize: '1.3rem', color: '#1e293b' },
  addBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  msg: { padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #bbf7d0', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' },
  msgX: { background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' },
  tw: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' },
  t: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#f8fafc', padding: '0.6rem 0.75rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.78rem', fontWeight: 600, color: '#475569' },
  td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '500px', maxWidth: '90vw' },
  row: { display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' },
  f: { flex: 1 },
  l: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' },
  i: { width: '100%', padding: '0.45rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' },
};
