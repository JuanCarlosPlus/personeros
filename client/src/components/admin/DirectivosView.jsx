import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../layout/AppLayout';
import { directivoAPI, cargoAPI, personeroAPI } from '../../utils/api';

export default function DirectivosView() {
  const [directivos, setDirectivos] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', password: '', cargoId: '', region: '' });
  const [dniStatus, setDniStatus] = useState(''); // '' | 'loading' | 'ok' | 'exists' | 'error'
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCargo, setFilterCargo] = useState('');
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, cRes] = await Promise.all([
        directivoAPI.list({ search, cargoId: filterCargo || undefined }),
        cargoAPI.list(),
      ]);
      setDirectivos(dRes.data.data || dRes.data);
      setCargos(cRes.data);
    } catch { setMsg({ type: 'error', text: 'Error al cargar' }); }
    setLoading(false);
  }, [search, filterCargo]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '', correo: '', password: '', cargoId: '', region: '' });
    setDniStatus('');
    setModal({ mode: 'create' });
  };

  const lookupDni = async () => {
    const dni = form.dni.trim();
    if (!/^\d{8}$/.test(dni)) { setDniStatus('error'); return; }
    setDniStatus('loading');
    try {
      const { data } = await directivoAPI.dniLookup(dni);
      if (data.registered) {
        setDniStatus('exists');
        setMsg({ type: 'error', text: 'Este DNI ya tiene un directivo registrado' });
      } else if (data.reniec) {
        setForm(f => ({ ...f, nombres: data.reniec.nombres || '', apellidoPaterno: data.reniec.apellidoPaterno || '', apellidoMaterno: data.reniec.apellidoMaterno || '' }));
        setDniStatus('ok');
      } else {
        setDniStatus('error');
      }
    } catch { setDniStatus('error'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await directivoAPI.create(form);
        setMsg({ type: 'ok', text: 'Directivo creado' });
      } else {
        await directivoAPI.update(modal.directivo._id, form);
        setMsg({ type: 'ok', text: 'Directivo actualizado' });
      }
      setModal(null);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Error al guardar' });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Desactivar este directivo?')) return;
    try {
      await directivoAPI.remove(id);
      setMsg({ type: 'ok', text: 'Directivo desactivado' });
      load();
    } catch { setMsg({ type: 'error', text: 'Error al eliminar' }); }
  };

  const copyLink = (linkCode) => {
    const url = `${window.location.origin}/registro/${linkCode}`;
    navigator.clipboard.writeText(url);
    setCopied(linkCode);
    setTimeout(() => setCopied(null), 2000);
  };

  const openEdit = (d) => {
    setForm({ dni: d.dni, nombres: d.nombres, apellidoPaterno: d.apellidoPaterno, apellidoMaterno: d.apellidoMaterno || '', telefono: d.telefono || '', correo: d.correo || '', password: '', cargoId: d.cargoId?._id || '', region: d.region || '' });
    setDniStatus('');
    setModal({ mode: 'edit', directivo: d });
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Directivos' }]}>
      <div style={s.header}>
        <h2 style={s.title}>Directivos del Partido</h2>
        <button onClick={openCreate} style={s.addBtn}>+ Nuevo Directivo</button>
      </div>

      {msg && (
        <div style={{ ...s.msg, background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#16a34a' : '#dc2626', borderColor: msg.type === 'ok' ? '#bbf7d0' : '#fecaca' }}>
          {msg.text}
          <button onClick={() => setMsg(null)} style={s.msgClose}>x</button>
        </div>
      )}

      <div style={s.filters}>
        <input style={s.searchInput} placeholder="Buscar por DNI o nombre..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={s.select} value={filterCargo} onChange={e => setFilterCargo(e.target.value)}>
          <option value="">Todos los cargos</option>
          {cargos.map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}
        </select>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>DNI</th>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Cargo</th>
                <th style={s.th}>Registrado por</th>
                <th style={s.th}>Region</th>
                <th style={s.th}>Telefono</th>
                <th style={s.th}>Link</th>
                <th style={{ ...s.th, width: 120 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {directivos.map(d => (
                <tr key={d._id}>
                  <td style={s.td}><code>{d.dni}</code></td>
                  <td style={{ ...s.td, fontWeight: 500 }}>{d.nombres} {d.apellidoPaterno} {d.apellidoMaterno}</td>
                  <td style={s.td}><span style={s.cargoBadge}>{d.cargoId?.nombre || '—'}</span></td>
                  <td style={s.td}>{d.registradoPor || 'Admin'}</td>
                  <td style={s.td}>{d.region || '—'}</td>
                  <td style={s.td}>{d.telefono || '—'}</td>
                  <td style={s.td}>
                    {d.linkCode && (
                      <button onClick={() => copyLink(d.linkCode)} style={s.linkBtn}>
                        {copied === d.linkCode ? 'Copiado!' : 'Copiar link'}
                      </button>
                    )}
                  </td>
                  <td style={s.td}>
                    <button onClick={() => openEdit(d)} style={s.editBtn}>Editar</button>
                    <button onClick={() => handleDelete(d._id)} style={s.delBtn}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {directivos.length === 0 && (
                <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>No hay directivos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>{modal.mode === 'create' ? 'Nuevo Directivo' : 'Editar Directivo'}</h3>

            <div style={s.dniRow}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>DNI</label>
                <input style={s.input} value={form.dni} maxLength={8} disabled={modal.mode === 'edit'}
                  onChange={e => setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') }))} placeholder="12345678" />
              </div>
              {modal.mode === 'create' && (
                <button onClick={lookupDni} disabled={dniStatus === 'loading'} style={s.lookupBtn}>
                  {dniStatus === 'loading' ? '...' : 'Buscar'}
                </button>
              )}
              {dniStatus === 'ok' && <span style={{ color: '#16a34a', fontSize: '1.2rem' }}>OK</span>}
              {dniStatus === 'exists' && <span style={{ color: '#dc2626', fontSize: '0.8rem' }}>Ya existe</span>}
            </div>

            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Nombres</label><input style={s.input} value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} /></div>
              <div style={s.field}><label style={s.label}>Ap. Paterno</label><input style={s.input} value={form.apellidoPaterno} onChange={e => setForm(f => ({ ...f, apellidoPaterno: e.target.value }))} /></div>
            </div>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Ap. Materno</label><input style={s.input} value={form.apellidoMaterno} onChange={e => setForm(f => ({ ...f, apellidoMaterno: e.target.value }))} /></div>
              <div style={s.field}><label style={s.label}>Telefono</label><input style={s.input} value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
            </div>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Correo</label><input style={s.input} value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} /></div>
              <div style={s.field}>
                <label style={s.label}>Cargo</label>
                <select style={s.input} value={form.cargoId} onChange={e => setForm(f => ({ ...f, cargoId: e.target.value }))}>
                  <option value="">Seleccionar...</option>
                  {cargos.map(c => <option key={c._id} value={c._id}>{c.nombre} (Nivel {c.nivel})</option>)}
                </select>
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}><label style={s.label}>Region</label><input style={s.input} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Ej: Lima" /></div>
              <div style={s.field}>
                <label style={s.label}>Contrasena {modal.mode === 'edit' ? '(dejar vacio para no cambiar)' : ''}</label>
                <input style={s.input} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={modal.mode === 'edit' ? '••••' : 'Min 4 caracteres'} />
              </div>
            </div>

            <div style={s.modalActions}>
              <button onClick={() => setModal(null)} style={s.cancelBtn}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={s.saveBtn}>{saving ? 'Guardando...' : 'Guardar'}</button>
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
  filters: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  searchInput: { padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', minWidth: '220px' },
  select: { padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' },
  msg: { padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  msgClose: { background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', color: 'inherit' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#f8fafc', padding: '0.7rem 0.75rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' },
  td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
  cargoBadge: { background: '#dbeafe', color: '#1d4ed8', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' },
  linkBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  editBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem' },
  delBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '580px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto' },
  modalTitle: { margin: '0 0 1rem', fontSize: '1.1rem', color: '#1e293b' },
  dniRow: { display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '1rem' },
  lookupBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', height: '36px' },
  row: { display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' },
  field: { flex: 1 },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.45rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' },
  saveBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};
