import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout({ children, breadcrumbs = [] }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={s.container}>
      {/* Sidebar */}
      <aside style={{ ...s.sidebar, width: sidebarOpen ? '240px' : '56px' }}>
        <div style={s.sidebarHeader}>
          <span style={s.logo}>{sidebarOpen ? '🗳️ Personeros 2026' : '🗳️'}</span>
        </div>

        <nav style={s.nav}>
          <NavBtn icon="📊" label="Dashboard" path="/" open={sidebarOpen} navigate={navigate} />
          <NavBtn icon="👥" label="Personeros" path="/personeros" open={sidebarOpen} navigate={navigate} />
          <NavBtn icon="📋" label="Registro Masivo" path="/personeros/registro-masivo" open={sidebarOpen} navigate={navigate} />
          {user?.role === 'admin' && (
            <>
              <NavBtn icon="🏛️" label="Cargos" path="/admin/cargos" open={sidebarOpen} navigate={navigate} />
              <NavBtn icon="👔" label="Directivos" path="/admin/directivos" open={sidebarOpen} navigate={navigate} />
              <NavBtn icon="🏢" label="Jefes de Local" path="/admin/jefes-local" open={sidebarOpen} navigate={navigate} />
              <NavBtn icon="📈" label="Reportes" path="/admin/reportes" open={sidebarOpen} navigate={navigate} />
              <NavBtn icon="💬" label="Chat" path="/admin/chat" open={sidebarOpen} navigate={navigate} />
            </>
          )}
        </nav>

        <div style={s.sidebarFooter}>
          {sidebarOpen && (
            <div style={s.userInfo}>
              <div style={s.userName}>{user?.nombre}</div>
              <div style={s.userRole}>{user?.role}</div>
            </div>
          )}
          <button onClick={logout} style={s.logoutBtn}>
            {sidebarOpen ? '🚪 Cerrar sesión' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ ...s.main, marginLeft: sidebarOpen ? '240px' : '56px' }}>
        <header style={s.topBar}>
          <button onClick={() => setSidebarOpen(o => !o)} style={s.toggleBtn}>
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {/* Breadcrumbs */}
          <nav style={s.breadcrumbs}>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} style={s.breadcrumbItem}>
                {i > 0 && <span style={s.breadcrumbSep}>›</span>}
                {crumb.path ? (
                  <button onClick={() => navigate(crumb.path)} style={s.breadcrumbLink}>
                    {crumb.label}
                  </button>
                ) : (
                  <span style={s.breadcrumbCurrent}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        </header>

        <div style={s.content}>{children}</div>
      </main>
    </div>
  );
}

function NavBtn({ icon, label, path, open, navigate }) {
  const active = window.location.pathname === path;
  return (
    <button
      onClick={() => navigate(path)}
      style={{ ...s.navItem, ...(active ? s.navActive : {}) }}
    >
      <span style={s.navIcon}>{icon}</span>
      {open && <span>{label}</span>}
    </button>
  );
}

const s = {
  container: { minHeight: '100vh', background: '#f1f5f9' },
  sidebar: {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    background: 'linear-gradient(180deg, #1e3a5f 0%, #0f2440 100%)',
    color: '#fff',
    display: 'flex', flexDirection: 'column',
    transition: 'width 0.25s', overflow: 'hidden', zIndex: 100,
  },
  sidebarHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logo: { fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap' },
  nav: {
    flex: 1, padding: '1rem 0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.2rem',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.7rem 1rem',
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
    borderRadius: '8px', fontSize: '0.9rem', textAlign: 'left',
    whiteSpace: 'nowrap', transition: 'all 0.15s', width: '100%',
  },
  navActive: {
    background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600,
  },
  navIcon: { fontSize: '1.1rem', minWidth: '1.2rem', textAlign: 'center' },
  sidebarFooter: { padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' },
  userInfo: { marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' },
  userName: { fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' },
  logoutBtn: {
    background: 'rgba(239,68,68,0.2)', color: '#fca5a5',
    border: 'none', padding: '0.5rem 1rem',
    borderRadius: '6px', width: '100%', fontSize: '0.85rem', whiteSpace: 'nowrap',
  },
  main: { transition: 'margin-left 0.25s', minHeight: '100vh' },
  topBar: {
    background: '#fff', padding: '0.65rem 1.5rem',
    display: 'flex', alignItems: 'center', gap: '1rem',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky', top: 0, zIndex: 50,
  },
  toggleBtn: {
    background: '#f1f5f9', border: 'none', borderRadius: '6px',
    padding: '0.4rem 0.65rem', fontSize: '0.8rem', flexShrink: 0,
  },
  breadcrumbs: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem', flex: 1 },
  breadcrumbItem: { display: 'flex', alignItems: 'center', gap: '0.25rem' },
  breadcrumbSep: { color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1 },
  breadcrumbLink: {
    background: 'none', border: 'none', color: '#3b82f6',
    fontSize: '0.9rem', fontWeight: 500, padding: '0.1rem 0.3rem',
    borderRadius: '4px',
  },
  breadcrumbCurrent: { fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', padding: '0.1rem 0.3rem' },
  content: { padding: '1.5rem' },
};
