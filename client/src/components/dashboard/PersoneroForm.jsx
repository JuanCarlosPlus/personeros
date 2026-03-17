import { useState, useRef } from 'react';
import { personeroAPI } from '../../utils/api';

const EMPTY = {
  dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
  fechaNacimiento: '', direccion: '', telefono: '', correo: '',
  afiliado: false, experienciaPrevia: false, descripcionExperiencia: '',
  referente: '',
};

export default function PersoneroForm({ mesa, ubigeo, idLocal, onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [dniStatus, setDniStatus] = useState('idle'); // idle | loading | found | not_found | registered
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dniTimer = useRef(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const lookupDni = async (dni) => {
    if (dni.length !== 8) { setDniStatus('idle'); return; }
    setDniStatus('loading');
    setError('');
    try {
      const { data } = await personeroAPI.dniLookup(dni);
      if (data.registered && data.personero) {
        // Already registered — pre-fill and offer to assign directly
        const p = data.personero;
        setForm(f => ({
          ...f,
          nombres: p.nombres || '',
          apellidoPaterno: p.apellidoPaterno || '',
          apellidoMaterno: p.apellidoMaterno || '',
          fechaNacimiento: p.fechaNacimiento ? p.fechaNacimiento.split('T')[0] : '',
          direccion: p.direccion || '',
          telefono: p.telefono || '',
          correo: p.correo || '',
          afiliado: p.afiliado || false,
          experienciaPrevia: p.experienciaPrevia || false,
          descripcionExperiencia: p.descripcionExperiencia || '',
          referente: p.referente || '',
        }));
        setExistingId(data.personero._id);
        setDniStatus(data.personero.assignmentStatus === 'pendiente' ? 'registered_free' : 'registered_busy');
      } else if (data.reniec) {
        // Found in RENIEC, not registered yet
        const r = data.reniec;
        setForm(f => ({
          ...f,
          nombres: r.nombres || '',
          apellidoPaterno: r.apellidoPaterno || '',
          apellidoMaterno: r.apellidoMaterno || '',
          fechaNacimiento: r.fechaNacimiento || '',
          direccion: r.direccion || '',
        }));
        setExistingId(null);
        setDniStatus('found');
      } else {
        setDniStatus('not_found');
      }
    } catch {
      setDniStatus('not_found');
    }
  };

  const handleDniChange = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    set('dni', clean);
    clearTimeout(dniTimer.current);
    if (clean.length === 8) {
      dniTimer.current = setTimeout(() => lookupDni(clean), 400);
    } else {
      setDniStatus('idle');
      setExistingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // If already registered and free → assign directly
      if (existingId && dniStatus === 'registered_free') {
        onSuccess(existingId);
        return;
      }

      // Save (create or update) personero first
      const payload = {
        ...form,
        ubigeo: ubigeo,  // where they're registered as personero
        assignedMesa: mesa.mesa,
      };
      const { data } = await personeroAPI.createOrUpdate(payload);
      onSuccess(data._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const dniColors = {
    idle: '#e2e8f0',
    loading: '#93c5fd',
    found: '#6ee7b7',
    not_found: '#fca5a5',
    registered_free: '#6ee7b7',
    registered_busy: '#fca5a5',
  };
  const dniMessages = {
    loading: '🔍 Consultando RENIEC...',
    found: '✅ Datos encontrados',
    not_found: '⚠️ DNI no encontrado — ingresa los datos manualmente',
    registered_free: '✅ Ya registrado — puede asignarse directamente',
    registered_busy: '⚠️ Ya está asignado a otra mesa',
  };

  return (
    <form onSubmit={handleSubmit} style={s.form}>
      <div style={s.formTitle}>➕ Registrar personero</div>

      {/* DNI */}
      <div style={s.field}>
        <label style={s.label}>DNI *</label>
        <input
          value={form.dni}
          onChange={e => handleDniChange(e.target.value)}
          placeholder="12345678"
          maxLength={8}
          style={{ ...s.input, borderColor: dniColors[dniStatus] || '#e2e8f0' }}
          required
          autoFocus
        />
        {dniStatus !== 'idle' && (
          <div style={{ ...s.dniMsg, color: ['found','registered_free'].includes(dniStatus) ? '#059669' : ['loading'].includes(dniStatus) ? '#3b82f6' : '#dc2626' }}>
            {dniMessages[dniStatus]}
          </div>
        )}
      </div>

      {/* Show form when we have data */}
      {(dniStatus === 'found' || dniStatus === 'not_found' || dniStatus === 'registered_free' || dniStatus === 'registered_busy') && (
        <>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Nombres *</label>
              <input value={form.nombres} onChange={e => set('nombres', e.target.value)} style={s.input} required />
            </div>
          </div>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Ap. Paterno *</label>
              <input value={form.apellidoPaterno} onChange={e => set('apellidoPaterno', e.target.value)} style={s.input} required />
            </div>
            <div style={s.field}>
              <label style={s.label}>Ap. Materno</label>
              <input value={form.apellidoMaterno} onChange={e => set('apellidoMaterno', e.target.value)} style={s.input} />
            </div>
          </div>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Fecha nac.</label>
              <input type="date" value={form.fechaNacimiento} onChange={e => set('fechaNacimiento', e.target.value)} style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="987654321" style={s.input} />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Dirección (RENIEC)</label>
            <input value={form.direccion} onChange={e => set('direccion', e.target.value)} style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Correo</label>
            <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} style={s.input} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Referente</label>
            <input value={form.referente} onChange={e => set('referente', e.target.value)} style={s.input} />
          </div>
          <div style={s.checks}>
            <label style={s.checkLabel}>
              <input type="checkbox" checked={form.afiliado} onChange={e => set('afiliado', e.target.checked)} />
              Afiliado
            </label>
            <label style={s.checkLabel}>
              <input type="checkbox" checked={form.experienciaPrevia} onChange={e => set('experienciaPrevia', e.target.checked)} />
              Exp. previa
            </label>
          </div>
          {form.experienciaPrevia && (
            <div style={s.field}>
              <label style={s.label}>Descripción experiencia</label>
              <textarea
                value={form.descripcionExperiencia}
                onChange={e => set('descripcionExperiencia', e.target.value)}
                rows={2}
                style={{ ...s.input, resize: 'vertical' }}
              />
            </div>
          )}
        </>
      )}

      {error && <div style={s.error}>{error}</div>}

      <div style={s.actions}>
        <button type="button" onClick={onCancel} style={s.btnCancel}>Cancelar</button>
        {dniStatus !== 'registered_busy' && (dniStatus === 'found' || dniStatus === 'not_found' || dniStatus === 'registered_free') && (
          <button type="submit" disabled={saving} style={s.btnSave}>
            {saving ? 'Guardando...' :
              dniStatus === 'registered_free' ? '✅ Asignar' : '💾 Guardar y asignar'}
          </button>
        )}
      </div>
    </form>
  );
}

const s = {
  form: { display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' },
  formTitle: { fontSize: '0.88rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '0.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  row: { display: 'flex', gap: '0.5rem' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' },
  label: { fontSize: '0.75rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '0.45rem 0.65rem', border: '1.5px solid #e2e8f0',
    borderRadius: '6px', fontSize: '0.82rem', outline: 'none', width: '100%',
    transition: 'border-color 0.2s',
  },
  dniMsg: { fontSize: '0.75rem', marginTop: '0.2rem' },
  checks: { display: 'flex', gap: '1rem' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' },
  error: { background: '#fef2f2', color: '#dc2626', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' },
  btnCancel: {
    flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '7px',
    padding: '0.55rem', fontSize: '0.82rem', color: '#374151',
  },
  btnSave: {
    flex: 2, background: '#1e3a5f', color: '#fff', border: 'none',
    borderRadius: '7px', padding: '0.55rem', fontSize: '0.82rem', fontWeight: 600,
  },
};
