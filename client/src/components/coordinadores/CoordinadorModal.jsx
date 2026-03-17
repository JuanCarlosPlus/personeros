import { useState, useRef, useEffect } from 'react';
import { coordinadorAPI } from '../../utils/api';

/**
 * CoordinadorModal
 *
 * Modos:
 *  'view'   — muestra datos del coordinador (+ botones Editar / Quitar)
 *  'form'   — formulario DNI para asignar o editar coordinador
 */
export default function CoordinadorModal({
  coord,          // coordinador actual (null si no hay)
  nivel,          // 'region' | 'provincia' | 'distrito' | 'local'
  ubigeo,
  idLocal = '',
  nombreJurisdiccion = '',
  onClose,
  onSaved,        // callback(nuevoCoord) cuando se guarda
  onRemoved,      // callback() cuando se elimina
}) {
  const [mode, setMode] = useState(coord ? 'view' : 'form');

  // ── cerrar con Escape ──
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={s.closeBtn}>✕</button>
        <div style={s.levelBadge}>{NIVEL_LABELS[nivel]}</div>
        <div style={s.jurisdiccion}>{nombreJurisdiccion}</div>

        {mode === 'view' && coord ? (
          <ViewMode
            coord={coord}
            onEdit={() => setMode('form')}
            onRemove={async () => {
              if (!confirm('¿Quitar a este coordinador?')) return;
              await coordinadorAPI.remove(coord._id);
              onRemoved?.();
              onClose();
            }}
          />
        ) : (
          <FormMode
            coord={coord}
            nivel={nivel}
            ubigeo={ubigeo}
            idLocal={idLocal}
            nombreJurisdiccion={nombreJurisdiccion}
            onSaved={(c) => { onSaved?.(c); onClose(); }}
            onCancel={() => coord ? setMode('view') : onClose()}
          />
        )}
      </div>
    </div>
  );
}

// ── Vista de datos ───────────────────────────────────────────────────────────
function ViewMode({ coord, onEdit, onRemove }) {
  const nombre = `${coord.nombres} ${coord.apellidoPaterno} ${coord.apellidoMaterno || ''}`.trim();
  return (
    <div style={s.viewBody}>
      <div style={s.avatar}>{initials(coord)}</div>
      <div style={s.nombre}>{nombre}</div>
      <div style={s.grid2}>
        <InfoRow icon="🪪" label="DNI"      value={coord.dni} />
        <InfoRow icon="📱" label="Teléfono" value={coord.telefono || '—'} />
        <InfoRow icon="✉️"  label="Correo"   value={coord.correo   || '—'} />
      </div>
      <div style={s.viewActions}>
        <button onClick={onEdit}   style={{ ...s.btn, background: '#3b82f6' }}>✏️ Editar</button>
        <button onClick={onRemove} style={{ ...s.btn, background: '#ef4444' }}>🗑️ Quitar</button>
      </div>
    </div>
  );
}

// ── Formulario DNI ───────────────────────────────────────────────────────────
function FormMode({ coord, nivel, ubigeo, idLocal, nombreJurisdiccion, onSaved, onCancel }) {
  const EMPTY = {
    dni: coord?.dni || '',
    nombres: coord?.nombres || '',
    apellidoPaterno: coord?.apellidoPaterno || '',
    apellidoMaterno: coord?.apellidoMaterno || '',
    telefono: coord?.telefono || '',
    correo: coord?.correo || '',
  };
  const [form, setForm] = useState(EMPTY);
  const [dniStatus, setDniStatus] = useState(coord ? 'loaded' : 'idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const lookupDni = async (dni) => {
    setDniStatus('loading');
    try {
      const { data } = await coordinadorAPI.dniLookup(dni);
      if (data.reniec) {
        setForm(f => ({
          ...f,
          nombres: data.reniec.nombres || f.nombres,
          apellidoPaterno: data.reniec.apellidoPaterno || f.apellidoPaterno,
          apellidoMaterno: data.reniec.apellidoMaterno || f.apellidoMaterno,
        }));
      }
      setDniStatus(data.reniec ? 'found' : 'not_found');
    } catch {
      setDniStatus('not_found');
    }
  };

  const handleDni = (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 8);
    set('dni', clean);
    clearTimeout(timer.current);
    if (clean.length === 8) {
      timer.current = setTimeout(() => lookupDni(clean), 400);
    } else {
      setDniStatus('idle');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await coordinadorAPI.createOrUpdate({
        ...form,
        nivel,
        ubigeo,
        idLocal,
        nombreJurisdiccion,
      });
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const showFields = dniStatus !== 'idle' || coord;
  const dniColor = { idle:'#e2e8f0', loading:'#93c5fd', found:'#6ee7b7', not_found:'#fca5a5', loaded:'#6ee7b7' };

  return (
    <form onSubmit={handleSubmit} style={s.formBody}>
      <div style={s.field}>
        <label style={s.label}>DNI *</label>
        <input
          value={form.dni}
          onChange={e => handleDni(e.target.value)}
          placeholder="12345678"
          maxLength={8}
          style={{ ...s.input, borderColor: dniColor[dniStatus] }}
          required autoFocus
        />
        {dniStatus === 'loading' && <span style={s.dniHint}>🔍 Consultando RENIEC...</span>}
        {dniStatus === 'found'   && <span style={{ ...s.dniHint, color:'#059669' }}>✅ Datos encontrados</span>}
        {dniStatus === 'not_found' && <span style={{ ...s.dniHint, color:'#dc2626' }}>⚠️ No encontrado — ingresa manualmente</span>}
      </div>

      {showFields && (
        <>
          <div style={s.field}>
            <label style={s.label}>Nombres *</label>
            <input value={form.nombres} onChange={e => set('nombres', e.target.value)} style={s.input} required />
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
              <label style={s.label}>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="987654321" style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Correo</label>
              <input type="email" value={form.correo} onChange={e => set('correo', e.target.value)} style={s.input} />
            </div>
          </div>
        </>
      )}

      {error && <div style={s.error}>{error}</div>}

      <div style={s.formActions}>
        <button type="button" onClick={onCancel} style={s.btnCancel}>Cancelar</button>
        {showFields && (
          <button type="submit" disabled={saving} style={{ ...s.btn, background: '#1e3a5f', flex: 2 }}>
            {saving ? 'Guardando...' : coord ? '💾 Actualizar' : '💾 Asignar coordinador'}
          </button>
        )}
      </div>
    </form>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 500 }}>{icon} {value}</span>
    </div>
  );
}

function initials(coord) {
  return ((coord.nombres?.[0] || '') + (coord.apellidoPaterno?.[0] || '')).toUpperCase();
}

const NIVEL_LABELS = {
  region:    'Coordinador Regional',
  provincia: 'Coordinador Provincial',
  distrito:  'Coordinador Distrital',
  local:     'Coordinador de Local',
};

// ── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(15,36,64,0.55)', backdropFilter: 'blur(2px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#fff', borderRadius: '16px',
    padding: '1.75rem', width: '100%', maxWidth: '420px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
    position: 'relative',
    maxHeight: '90vh', overflowY: 'auto',
  },
  closeBtn: {
    position: 'absolute', top: '1rem', right: '1rem',
    background: '#f1f5f9', border: 'none', borderRadius: '6px',
    width: '30px', height: '30px', fontSize: '0.85rem', color: '#64748b',
  },
  levelBadge: {
    display: 'inline-block',
    background: '#dbeafe', color: '#1d4ed8',
    borderRadius: '99px', padding: '0.2rem 0.75rem',
    fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem',
  },
  jurisdiccion: { fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' },

  // View mode
  viewBody: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' },
  avatar: {
    width: '64px', height: '64px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
    color: '#fff', fontSize: '1.4rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  nombre: { fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', textAlign: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem', width: '100%', background: '#f8fafc', borderRadius: '10px', padding: '1rem' },
  viewActions: { display: 'flex', gap: '0.6rem', width: '100%', marginTop: '0.25rem' },

  // Form mode
  formBody: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' },
  label: { fontSize: '0.78rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '0.5rem 0.75rem', border: '1.5px solid #e2e8f0',
    borderRadius: '7px', fontSize: '0.88rem', outline: 'none',
    transition: 'border-color 0.2s',
  },
  dniHint: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' },
  error: { background: '#fef2f2', color: '#dc2626', borderRadius: '7px', padding: '0.5rem 0.75rem', fontSize: '0.82rem' },
  formActions: { display: 'flex', gap: '0.5rem', marginTop: '0.25rem' },
  btnCancel: { flex: 1, background: '#f1f5f9', border: 'none', borderRadius: '7px', padding: '0.6rem', fontSize: '0.85rem', color: '#374151' },

  // Shared
  btn: { flex: 1, color: '#fff', border: 'none', borderRadius: '7px', padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 600 },
};
