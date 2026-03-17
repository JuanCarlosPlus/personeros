import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import { coverageAPI, personeroAPI } from '../../utils/api';
import PersoneroForm from './PersoneroForm';

export default function MesaPanel() {
  const { ubigeo, idLocal } = useParams();
  const navigate = useNavigate();
  const decodedLocal = decodeURIComponent(idLocal);

  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMesa, setSelectedMesa] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sugeridos, setSugeridos] = useState([]);
  const [msg, setMsg] = useState('');

  const fetchMesas = useCallback(() => {
    setLoading(true);
    coverageAPI.mesas(ubigeo, decodedLocal)
      .then(r => setMesas(r.data))
      .catch(err => setError(err.response?.data?.error || 'Error cargando mesas'))
      .finally(() => setLoading(false));
  }, [ubigeo, decodedLocal]);

  useEffect(() => { fetchMesas(); }, [fetchMesas]);

  useEffect(() => {
    if (!selectedMesa) { setSugeridos([]); return; }
    personeroAPI.sugeridos(ubigeo, decodedLocal, selectedMesa.mesa)
      .then(r => setSugeridos(r.data))
      .catch(() => setSugeridos([]));
  }, [selectedMesa, ubigeo, decodedLocal]);

  const deptCode = ubigeo.slice(0, 2);
  const provCode = ubigeo.slice(0, 4);
  const first = mesas[0];
  const dept = first?.departamento || '';
  const prov = first?.provincia || '';
  const dist = first?.distrito || '';
  const nombreLocal = first?.nombreLocal || decodedLocal;

  const breadcrumbs = [
    { label: 'Nacional', path: '/' },
    { label: dept, path: `/dept/${deptCode}` },
    { label: prov, path: `/prov/${provCode}` },
    { label: dist, path: `/dist/${ubigeo}` },
    { label: nombreLocal },
  ];

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3500);
  };

  const handleAsignarSugerido = async (personeroId) => {
    if (!selectedMesa) return;
    setActionLoading(true);
    try {
      await personeroAPI.asignar(personeroId, selectedMesa.mesa);
      flash('✅ Personero asignado');
      setSelectedMesa(null);
      setShowForm(false);
      fetchMesas();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || 'Error al asignar'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDesasignar = async (mesaCodigo) => {
    if (!confirm('¿Quitar a este personero de la mesa?')) return;
    setActionLoading(true);
    try {
      await personeroAPI.desasignar(mesaCodigo);
      flash('✅ Personero desasignado');
      setSelectedMesa(null);
      fetchMesas();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || 'Error al desasignar'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmar = async (mesaCodigo) => {
    setActionLoading(true);
    try {
      await personeroAPI.confirmar(mesaCodigo);
      flash('🏆 Asignación confirmada');
      setSelectedMesa(null);
      fetchMesas();
    } catch (err) {
      flash('❌ ' + (err.response?.data?.error || 'Error al confirmar'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.center}>⏳ Cargando mesas...</div>
    </AppLayout>
  );

  if (error) return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div style={s.errorBox}>❌ {error}</div>
    </AppLayout>
  );

  const assigned = mesas.filter(m => m.status >= 1).length;
  const confirmed = mesas.filter(m => m.status === 2).length;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {msg && <div style={s.flash}>{msg}</div>}

      <div style={s.header}>
        <div>
          <h2 style={s.title}>🏫 {nombreLocal}</h2>
          <p style={s.subtitle}>
            {mesas.length} mesas · {assigned} asignadas · {confirmed} confirmadas
          </p>
        </div>
        <div style={s.headerAddress}>
          📍 {first?.direccion}
        </div>
      </div>

      <div style={s.layout}>
        {/* Mesa mini cards */}
        <div style={s.mesaList}>
          <h3 style={s.sectionTitle}>Mesas de votación</h3>
          <div style={s.mesaGrid}>
            {mesas.map(m => (
              <MesaMiniCard
                key={m.mesa}
                mesa={m}
                selected={selectedMesa?.mesa === m.mesa}
                onClick={() => {
                  setSelectedMesa(m);
                  setShowForm(false);
                }}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selectedMesa && (
          <div style={s.detailPanel}>
            <div style={s.panelHeader}>
              <h3 style={s.panelTitle}>Mesa {selectedMesa.mesa}</h3>
              <button onClick={() => { setSelectedMesa(null); setShowForm(false); }} style={s.closeBtn}>✕</button>
            </div>
            <div style={s.panelMeta}>
              <span>👤 {selectedMesa.electores} electores</span>
              <StatusBadge status={selectedMesa.status} />
            </div>

            {/* Current personero */}
            {selectedMesa.personero ? (
              <div style={s.personeroBox}>
                <div style={s.personeroHeader}>
                  <span style={s.personeroName}>
                    {selectedMesa.personero.nombres} {selectedMesa.personero.apellidoPaterno} {selectedMesa.personero.apellidoMaterno}
                  </span>
                  <span style={s.personeroDni}>DNI: {selectedMesa.personero.dni}</span>
                </div>
                {selectedMesa.personero.telefono && (
                  <div style={s.personeroContact}>📱 {selectedMesa.personero.telefono}</div>
                )}
                {selectedMesa.personero.correo && (
                  <div style={s.personeroContact}>✉️ {selectedMesa.personero.correo}</div>
                )}
                <div style={s.personeroActions}>
                  {selectedMesa.status === 1 && (
                    <button
                      onClick={() => handleConfirmar(selectedMesa.mesa)}
                      disabled={actionLoading}
                      style={{ ...s.btn, background: '#8b5cf6' }}
                    >
                      🏆 Confirmar
                    </button>
                  )}
                  <button
                    onClick={() => handleDesasignar(selectedMesa.mesa)}
                    disabled={actionLoading}
                    style={{ ...s.btn, background: '#ef4444' }}
                  >
                    🗑️ Quitar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Sugeridos */}
                {sugeridos.length > 0 && (
                  <div style={s.sugeridosBox}>
                    <h4 style={s.sugeridosTitle}>💡 Sugeridos (votan en esta mesa)</h4>
                    {sugeridos.map(p => (
                      <SugeridoCard
                        key={p._id}
                        personero={p}
                        onAsignar={() => handleAsignarSugerido(p._id)}
                        disabled={actionLoading}
                      />
                    ))}
                    <div style={s.divider}>— o ingresa uno nuevo —</div>
                  </div>
                )}

                {/* Register new */}
                {!showForm ? (
                  <button
                    onClick={() => setShowForm(true)}
                    style={s.btnNew}
                  >
                    ➕ Ingresar personero por DNI
                  </button>
                ) : (
                  <PersoneroForm
                    mesa={selectedMesa}
                    ubigeo={ubigeo}
                    idLocal={decodedLocal}
                    onSuccess={(personeroId) => {
                      handleAsignarSugerido(personeroId);
                      setShowForm(false);
                    }}
                    onCancel={() => setShowForm(false)}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function MesaMiniCard({ mesa, selected, onClick }) {
  const colors = {
    0: { bg: '#f8fafc', border: '#e2e8f0', label: '⭕' },
    1: { bg: '#ecfdf5', border: '#6ee7b7', label: '✅' },
    2: { bg: '#ede9fe', border: '#a78bfa', label: '🏆' },
  };
  const c = colors[mesa.status] || colors[0];

  return (
    <button
      onClick={onClick}
      style={{
        ...s.mesaCard,
        background: selected ? '#dbeafe' : c.bg,
        border: `1.5px solid ${selected ? '#3b82f6' : c.border}`,
        fontWeight: selected ? 700 : 400,
      }}
    >
      <span style={s.mesaLabel}>{c.label} Mesa</span>
      <span style={s.mesaNum}>{mesa.mesa}</span>
      <span style={s.mesaElec}>{mesa.electores} elec.</span>
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    0: { label: 'Sin personero', color: '#ef4444', bg: '#fef2f2' },
    1: { label: 'Asignado', color: '#10b981', bg: '#ecfdf5' },
    2: { label: 'Confirmado', color: '#8b5cf6', bg: '#ede9fe' },
  };
  const t = map[status] || map[0];
  return (
    <span style={{ background: t.bg, color: t.color, borderRadius: '99px', padding: '0.2rem 0.65rem', fontSize: '0.78rem', fontWeight: 600 }}>
      {t.label}
    </span>
  );
}

function SugeridoCard({ personero: p, onAsignar, disabled }) {
  return (
    <div style={s.sugeridoCard}>
      <div style={s.sugeridoInfo}>
        <div style={s.sugeridoName}>
          {p.nombres} {p.apellidoPaterno} {p.apellidoMaterno}
        </div>
        <div style={s.sugeridoDni}>DNI: {p.dni} · {p.telefono || 'sin tel.'}</div>
      </div>
      <button onClick={onAsignar} disabled={disabled} style={s.btnAssign}>
        Asignar
      </button>
    </div>
  );
}

const s = {
  header: {
    background: '#fff', borderRadius: '12px', padding: '1.25rem',
    marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: '0.75rem',
  },
  title: { fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' },
  subtitle: { color: '#64748b', fontSize: '0.88rem', marginTop: '0.25rem' },
  headerAddress: { fontSize: '0.85rem', color: '#64748b', maxWidth: '350px', textAlign: 'right' },
  layout: { display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  mesaList: { flex: '1 1 400px' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' },
  mesaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '0.6rem',
  },
  mesaCard: {
    borderRadius: '10px', padding: '0.75rem 0.9rem',
    cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '0.15rem',
    transition: 'all 0.15s',
  },
  mesaLabel: { fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' },
  mesaNum: { fontSize: '0.95rem', color: '#1e293b' },
  mesaElec: { fontSize: '0.72rem', color: '#94a3b8' },
  detailPanel: {
    flex: '0 0 320px',
    background: '#fff', borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    position: 'sticky', top: '80px',
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  panelTitle: { fontSize: '1rem', fontWeight: 700, color: '#1e293b' },
  closeBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: '6px',
    width: '28px', height: '28px', fontSize: '0.85rem', color: '#64748b',
  },
  panelMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: '#64748b' },
  personeroBox: {
    background: '#f8fafc', borderRadius: '10px', padding: '1rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  personeroHeader: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  personeroName: { fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' },
  personeroDni: { fontSize: '0.8rem', color: '#64748b' },
  personeroContact: { fontSize: '0.82rem', color: '#374151' },
  personeroActions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' },
  btn: {
    color: '#fff', border: 'none', borderRadius: '7px',
    padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 600,
  },
  btnNew: {
    width: '100%', background: '#1e3a5f', color: '#fff',
    border: 'none', borderRadius: '8px', padding: '0.7rem',
    fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem',
  },
  btnAssign: {
    background: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
    flexShrink: 0,
  },
  sugeridosBox: { marginBottom: '1rem' },
  sugeridosTitle: { fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem' },
  sugeridoCard: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: '8px', padding: '0.6rem 0.75rem', marginBottom: '0.4rem',
    gap: '0.5rem',
  },
  sugeridoInfo: { flex: 1, minWidth: 0 },
  sugeridoName: { fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sugeridoDni: { fontSize: '0.75rem', color: '#64748b' },
  divider: { textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', margin: '0.75rem 0' },
  center: { textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '1.1rem' },
  errorBox: { background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '1.25rem' },
  flash: {
    position: 'fixed', top: '1rem', right: '1rem',
    background: '#1e293b', color: '#fff',
    borderRadius: '10px', padding: '0.75rem 1.25rem',
    fontSize: '0.9rem', fontWeight: 600, zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
};
