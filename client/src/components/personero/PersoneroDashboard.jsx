import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { personeroAPI } from '../../utils/api';

export default function PersoneroDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [personero, setPersonero] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('personeroUser'));
      if (!p) { navigate('/personero/login'); return; }
      setPersonero(p);
    } catch { navigate('/personero/login'); return; }

    personeroAPI.miEstado()
      .then(r => setData(r.data))
      .catch(() => { localStorage.removeItem('personeroToken'); localStorage.removeItem('personeroUser'); navigate('/personero/login'); })
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('personeroToken');
    localStorage.removeItem('personeroUser');
    navigate('/personero/login');
  };

  const statusLabels = { pendiente: 'Pendiente de asignacion', asignado: 'Asignado a mesa', confirmado: 'Confirmado', sin_mesa: 'Sin mesa disponible' };
  const statusColors = { pendiente: '#d97706', asignado: '#2563eb', confirmado: '#16a34a', sin_mesa: '#94a3b8' };
  const statusIcons = { pendiente: '⏳', asignado: '📋', confirmado: '✅', sin_mesa: '❌' };

  if (loading) return <div style={s.page}><p style={{ color: '#fff' }}>Cargando...</p></div>;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <div style={s.icon}>🗳️</div>
            <h2 style={s.title}>Mi Estado como Personero</h2>
            <p style={s.subtitle}>Elecciones 2026</p>
          </div>
          <button onClick={logout} style={s.logoutBtn}>Salir</button>
        </div>

        {data && (
          <>
            {/* Nombre */}
            <div style={s.nameBox}>
              <div style={s.nameIcon}>👤</div>
              <div>
                <div style={s.name}>{data.nombres} {data.apellidoPaterno} {data.apellidoMaterno}</div>
                <div style={s.dni}>DNI: {data.dni}</div>
              </div>
            </div>

            {/* Estado */}
            <div style={{ ...s.statusBox, borderColor: statusColors[data.assignmentStatus] || '#e2e8f0' }}>
              <div style={s.statusIcon}>{statusIcons[data.assignmentStatus] || '❓'}</div>
              <div style={{ ...s.statusText, color: statusColors[data.assignmentStatus] }}>
                {statusLabels[data.assignmentStatus] || data.assignmentStatus}
              </div>
            </div>

            {/* Mesa info */}
            {data.mesa && (
              <div style={s.mesaBox}>
                <h3 style={s.mesaTitle}>Tu Mesa de Votacion</h3>
                <div style={s.mesaGrid}>
                  <div style={s.mesaItem}><span style={s.mesaLabel}>Mesa</span><span style={s.mesaValue}>{data.mesa.mesa}</span></div>
                  <div style={s.mesaItem}><span style={s.mesaLabel}>Local</span><span style={s.mesaValue}>{data.mesa.local}</span></div>
                  <div style={s.mesaItem}><span style={s.mesaLabel}>Direccion</span><span style={s.mesaValue}>{data.mesa.direccion}</span></div>
                  <div style={s.mesaItem}><span style={s.mesaLabel}>Distrito</span><span style={s.mesaValue}>{data.mesa.distrito}</span></div>
                  <div style={s.mesaItem}><span style={s.mesaLabel}>Provincia</span><span style={s.mesaValue}>{data.mesa.provincia}</span></div>
                  <div style={s.mesaItem}><span style={s.mesaLabel}>Departamento</span><span style={s.mesaValue}>{data.mesa.departamento}</span></div>
                </div>
              </div>
            )}

            {!data.mesa && data.assignmentStatus === 'pendiente' && (
              <div style={s.pendingBox}>
                <p>Aun no se te ha asignado una mesa de votacion. Te notificaremos por WhatsApp cuando esto ocurra.</p>
              </div>
            )}

            {/* Contact info */}
            <div style={s.contactBox}>
              <div style={s.contactItem}>📱 {data.telefono}</div>
              {data.correo && <div style={s.contactItem}>📧 {data.correo}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2440 100%)', padding: '1rem' },
  card: { background: '#fff', borderRadius: '12px', padding: '1.5rem', width: '460px', maxWidth: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', textAlign: 'center' },
  icon: { fontSize: '2rem', marginBottom: '0.25rem' },
  title: { margin: '0 0 0.15rem', fontSize: '1.1rem', color: '#1e293b' },
  subtitle: { margin: 0, fontSize: '0.8rem', color: '#64748b' },
  logoutBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', color: '#64748b' },
  nameBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' },
  nameIcon: { fontSize: '1.5rem', width: '40px', height: '40px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' },
  dni: { fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' },
  statusBox: { border: '2px solid', borderRadius: '10px', padding: '1rem', textAlign: 'center', marginBottom: '1rem' },
  statusIcon: { fontSize: '2rem', marginBottom: '0.3rem' },
  statusText: { fontSize: '1rem', fontWeight: 600 },
  mesaBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem' },
  mesaTitle: { fontSize: '0.9rem', color: '#16a34a', marginBottom: '0.5rem' },
  mesaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' },
  mesaItem: { display: 'flex', flexDirection: 'column' },
  mesaLabel: { fontSize: '0.7rem', color: '#64748b', fontWeight: 600 },
  mesaValue: { fontSize: '0.82rem', color: '#1e293b' },
  pendingBox: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#92400e', marginBottom: '1rem' },
  contactBox: { display: 'flex', gap: '1rem', fontSize: '0.82rem', color: '#475569' },
  contactItem: { display: 'flex', alignItems: 'center', gap: '0.3rem' },
};
