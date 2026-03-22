import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../layout/AppLayout';
import { cargoAPI } from '../../utils/api';

export default function CargosView() {
  const [cargos, setCargos] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode:'create' } | { mode:'edit', cargo }
  const [form, setForm] = useState({ nombre: '', nivel: '', permisos: [] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([cargoAPI.list(), cargoAPI.permisos()]);
      setCargos(cRes.data);
      setPermisos(pRes.data);
    } catch { setMsg({ type: 'error', text: 'Error al cargar cargos' }); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ nombre: '', nivel: '', permisos: [] });
    setModal({ mode: 'create' });
  };

  const openEdit = (cargo) => {
    setForm({ nombre: cargo.nombre, nivel: cargo.nivel, permisos: cargo.permisos || [] });
    setModal({ mode: 'edit', cargo });
  };

  const togglePermiso = (key) => {
    setForm(f => ({
      ...f,
      permisos: f.permisos.includes(key) ? f.permisos.filter(p => p !== key) : [...f.permisos, key],
    }));
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.nivel) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await cargoAPI.create({ nombre: form.nombre, nivel: Number(form.nivel), permisos: form.permisos });
        setMsg({ type: 'ok', text: 'Cargo creado' });
      } else {
        await cargoAPI.update(modal.cargo._id, { nombre: form.nombre, nivel: Number(form.nivel), permisos: form.permisos });
        setMsg({ type: 'ok', text: 'Cargo actualizado' });
      }
      setModal(null);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Desactivar este cargo?')) return;
    try {
      await cargoAPI.remove(id);
      setMsg({ type: 'ok', text: 'Cargo desactivado' });
      load();
    } catch { setMsg({ type: 'error', text: 'Error al eliminar' }); }
  };

  const handleSeed = async () => {
    try {
      const { data } = await cargoAPI.seed();
      setMsg({ type: 'ok', text: data.message });
      load();
    } catch { setMsg({ type: 'error', text: 'Error al sembrar cargos' }); }
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Cargos' }]}>
      <div style={s.header}>
        <h2 style={s.title}>Cargos del Partido</h2>
        <div style={s.actions}>
          <button onClick={handleSeed} style={s.seedBtn}>Sembrar por defecto</button>
          <button onClick={openCreate} style={s.addBtn}>+ Nuevo Cargo</button>
        </div>
      </div>

      {msg && (
        <div style={{ ...s.msg, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#16a34a' : '#dc2626', borderColor: msg.type === 'ok' ? '#bbf7d0' : '#fecaca' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={s.msgClose}>x</button>
        </div>
      )}

      {loading ? <p>Cargando...</p> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nivel</th>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Permisos</th>
                <th style={{ ...s.th, width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargos.map(c => (
                <tr key={c._id}>
                  <td style={s.td}><span style={s.nivelBadge}>{c.nivel}</span></td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{c.nombre}</td>
                  <td style={s.td}>
                    <div style={s.permisosWrap}>
                      {(c.permisos || []).map(p => (
                        <span key={p} style={s.permBadge}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td style={s.td}>
                    <button onClick={() => openEdit(c)} style={s.editBtn}>Editar</button>
                    <button onClick={() => handleDelete(c._id)} style={s.delBtn}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {cargos.length === 0 && (
                <tr><td colSpan={4} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No hay cargos. Use "Sembrar por defecto" para crear los cargos iniciales.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{modal.mode === 'create' ? 'Nuevo Cargo' : 'Editar Cargo'}</h3>
            <div style={s.field}>
              <label style={s.label}>Nombre</label>
              <input style={s.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Coordinador Regional" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Nivel (1=mayor rango)</label>
              <input style={s.input} type="number" min="1" value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} placeholder="1" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Permisos</label>
              <div style={s.permGrid}>
                {permisos.map(p => (
                  <label key={p.key} style={s.permCheck}>
                    <input type="checkbox" checked={form.permisos.includes(p.key)} onChange={() => togglePermiso(p.key)} />
                    <span style={s.permLabel}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={s.modalActions}>
              <button onClick={() => setModal(null)} style={s.cancelBtn}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
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
  actions: { display: 'flex', gap: '0.75rem' },
  seedBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' },
  addBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
  msg: { padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  msgClose: { background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'inherit' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#f8fafc', padding: '0.7rem 0.75rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' },
  td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  nivelBadge: { background: '#dbeafe', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600 },
  permisosWrap: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem' },
  permBadge: { background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', whiteSpace: 'nowrap' },
  editBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem' },
  delBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '480px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' },
  modalTitle: { margin: '0 0 1rem', fontSize: '1.1rem', color: '#1e293b' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
  permGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' },
  permCheck: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' },
  permLabel: { color: '#334155' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' },
  saveBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};
