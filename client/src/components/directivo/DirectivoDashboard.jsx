import { useState, useEffect } from 'react';
import DirectivoLayout from './DirectivoLayout';
import { invitacionAPI } from '../../utils/api';

export default function DirectivoDashboard() {
  const [directivo, setDirectivo] = useState(null);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem('directivo'));
      setDirectivo(d);
    } catch { /* */ }
    invitacionAPI.stats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const linkUrl = directivo?.linkCode ? `${window.location.origin}/registro/${directivo.linkCode}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Te invito a registrarte como personero para las Elecciones 2026. Ingresa a este link: ${linkUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <DirectivoLayout>
      <h2 style={s.title}>Bienvenido, {directivo?.nombres}</h2>
      <p style={s.subtitle}>{directivo?.cargoId?.nombre}</p>

      {/* Link de invitacion */}
      <div style={s.linkCard}>
        <h3 style={s.cardTitle}>Tu link de invitacion</h3>
        <p style={s.linkText}>Comparte este link con las personas que quieres invitar como personeros:</p>
        <div style={s.linkRow}>
          <code style={s.linkCode}>{linkUrl}</code>
          <button onClick={copyLink} style={s.copyBtn}>{copied ? 'Copiado!' : 'Copiar'}</button>
          <button onClick={shareWhatsApp} style={s.waBtn}>WhatsApp</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={s.statsRow}>
          <div style={s.stat}>
            <div style={s.statNum}>{stats.total || 0}</div>
            <div style={s.statLabel}>Invitados</div>
          </div>
          <div style={s.stat}>
            <div style={{ ...s.statNum, color: '#16a34a' }}>{stats.registrados || 0}</div>
            <div style={s.statLabel}>Registrados</div>
          </div>
          <div style={s.stat}>
            <div style={{ ...s.statNum, color: '#d97706' }}>{stats.pendientes || 0}</div>
            <div style={s.statLabel}>Pendientes</div>
          </div>
        </div>
      )}
    </DirectivoLayout>
  );
}

const s = {
  title: { margin: '0 0 0.25rem', fontSize: '1.4rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', fontSize: '0.9rem', color: '#64748b' },
  linkCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' },
  cardTitle: { margin: '0 0 0.5rem', fontSize: '1rem', color: '#1e293b' },
  linkText: { margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#64748b' },
  linkRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' },
  linkCode: { flex: 1, background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', wordBreak: 'break-all', border: '1px solid #e2e8f0' },
  copyBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  waBtn: { background: '#25d366', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' },
  statsRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: '120px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', textAlign: 'center' },
  statNum: { fontSize: '2rem', fontWeight: 700, color: '#1e293b' },
  statLabel: { fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' },
};
