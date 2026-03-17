import { useState } from 'react';
import CoordinadorModal from './CoordinadorModal';

/**
 * CoordinadorBadge
 * Muestra el coordinador asignado o un botón "+ Asignar" si está vacío.
 * Al hacer click abre el modal sin propagar el evento al card padre.
 *
 * Props:
 *   coord              — objeto coordinador (null si no asignado)
 *   nivel              — 'region' | 'provincia' | 'distrito' | 'local'
 *   ubigeo             — ubigeo del nivel
 *   idLocal            — solo para nivel='local'
 *   nombreJurisdiccion — label para el modal
 *   onUpdated(coord)   — callback cuando se asigna/edita/quita
 */
export default function CoordinadorBadge({
  coord,
  nivel,
  ubigeo,
  idLocal = '',
  nombreJurisdiccion = '',
  onUpdated,
}) {
  const [open, setOpen] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();  // no activar drill-down del card padre
    setOpen(true);
  };

  const nombre = coord
    ? `${coord.nombres} ${coord.apellidoPaterno}`.trim()
    : null;

  const ini = coord
    ? ((coord.nombres?.[0] || '') + (coord.apellidoPaterno?.[0] || '')).toUpperCase()
    : null;

  return (
    <>
      <button onClick={handleClick} style={coord ? s.assigned : s.empty}>
        {coord ? (
          <>
            <span style={s.avatar}>{ini}</span>
            <span style={s.name}>{nombre}</span>
          </>
        ) : (
          <span style={s.emptyLabel}>+ Asignar</span>
        )}
      </button>

      {open && (
        <CoordinadorModal
          coord={coord}
          nivel={nivel}
          ubigeo={ubigeo}
          idLocal={idLocal}
          nombreJurisdiccion={nombreJurisdiccion}
          onClose={() => setOpen(false)}
          onSaved={(c) => { onUpdated?.(c); setOpen(false); }}
          onRemoved={() => { onUpdated?.(null); setOpen(false); }}
        />
      )}
    </>
  );
}

const s = {
  assigned: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: 'rgba(59,130,246,0.08)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '99px',
    padding: '0.2rem 0.5rem 0.2rem 0.25rem',
    cursor: 'pointer', transition: 'background 0.15s',
    maxWidth: '100%',
  },
  empty: {
    display: 'flex', alignItems: 'center',
    background: 'rgba(239,68,68,0.07)',
    border: '1px dashed #fca5a5',
    borderRadius: '99px',
    padding: '0.2rem 0.65rem',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  avatar: {
    width: '20px', height: '20px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)',
    color: '#fff', fontSize: '0.6rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    maxWidth: '120px',
  },
  emptyLabel: {
    fontSize: '0.72rem', fontWeight: 600, color: '#ef4444',
  },
};
