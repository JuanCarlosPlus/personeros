import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function DirectivoLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [directivo, setDirectivo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem('directivo'));
      if (!d) { navigate('/directivo/login'); return; }
      setDirectivo(d);
    } catch { navigate('/directivo/login'); }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('directivo');
    navigate('/directivo/login');
  };

  const permisos = directivo?.cargoId?.permisos || [];
  const tiene = (p) => permisos.includes(p);

  if (!directivo) return null;

  const menuItems = [
    { icon: '🏠', label: 'Inicio', path: '/directivo/dashboard', show: true },
    { icon: '📨', label: 'Invitar Personeros', path: '/directivo/invitar', show: tiene('personeros:invitar') },
    { icon: '👥', label: 'Sub-directivos', path: '/directivo/sub-directivos', show: tiene('directivos:crear') },
  ].filter(m => m.show);

  return (
    <div style={s.container}>
      <aside style={{ ...s.sidebar, width: sidebarOpen ? '240px' : '56px' }}>
        <div style={s.sidebarHeader}>
          <span style={s.logo}>{sidebarOpen ? '🏛️ Portal Directivo' : '🏛️'}</span>
        </div>

        <nav style={s.nav}>
          {menuItems.map(m => (
            <button key={m.path} onClick={() => navigate(m.path)}
              style={{ ...s.navItem, ...(location.pathname === m.path ? s.navActive : {}) }}>
              <span style={s.navIcon}>{m.icon}</span>
              {sidebarOpen && <span>{m.label}</span>}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          {sidebarOpen && (
            <div style={s.userInfo}>
              <div style={s.userName}>{directivo.nombres} {directivo.apellidoPaterno}</div>
              <div style={s.userRole}>{directivo.cargoId?.nombre || 'Directivo'}</div>
            </div>
          )}
          <button onClick={logout} style={s.logoutBtn}>{sidebarOpen ? 'Cerrar sesion' : '🚪'}</button>
        </div>
      </aside>

      <main style={{ ...s.main, marginLeft: sidebarOpen ? '240px' : '56px' }}>
        <header style={s.topBar}>
          <button onClick={() => setSidebarOpen(o => !o)} style={s.toggleBtn}>{sidebarOpen ? '◀' : '▶'}</button>
          <span style={s.headerTitle}>{directivo.cargoId?.nombre}</span>
        </header>
        <div style={s.content}>{children}</div>
      </main>
    </div>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#f1f5f9' },
  sidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    background: 'linear-gradient(180deg, #1a365d 0%, #0c1f3a 100%)',
    color: '#fff', display: 'flex', flexDirection: 'column',
    transition: 'width 0.25s', overflow: 'hidden', zIndex: 100,
  },
  sidebarHeader: { padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logo: { fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' },
  nav: { flex: 1, padding: '1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1rem',
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
    borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left', whiteSpace: 'nowrap',
    transition: 'all 0.15s', width: '100%', cursor: 'pointer',
  },
  navActive: { background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600 },
  navIcon: { fontSize: '1.1rem', minWidth: '1.2rem', textAlign: 'center' },
  sidebarFooter: { padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' },
  userInfo: { marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  userName: { fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' },
  logoutBtn: {
    background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: 'none',
    padding: '0.5rem 1rem', borderRadius: '6px', width: '100%', fontSize: '0.85rem', cursor: 'pointer',
  },
  main: { transition: 'margin-left 0.25s', minHeight: '100vh' },
  topBar: {
    background: '#fff', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
    borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50,
  },
  toggleBtn: { background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '0.4rem 0.65rem', fontSize: '0.8rem' },
  headerTitle: { fontSize: '0.9rem', fontWeight: 500, color: '#64748b' },
  content: { padding: '1.5rem' },
};
