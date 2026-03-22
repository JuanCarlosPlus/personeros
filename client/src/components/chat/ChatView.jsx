import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '../layout/AppLayout';
import { chatAPI } from '../../utils/api';

export default function ChatView() {
  const [canales, setCanales] = useState([]);
  const [canal, setCanal] = useState('general');
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const msgsRef = useRef(null);
  const pollRef = useRef(null);

  const loadCanales = useCallback(async () => {
    try {
      const { data } = await chatAPI.canales();
      setCanales(data);
    } catch { /* */ }
  }, []);

  const loadMensajes = useCallback(async (canalId) => {
    try {
      const { data } = await chatAPI.mensajes(canalId || canal);
      setMensajes(data);
      setLoading(false);
      setTimeout(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight; }, 50);
    } catch { setLoading(false); }
  }, [canal]);

  useEffect(() => {
    loadCanales();
    loadMensajes(canal);
    // Polling every 5 seconds
    pollRef.current = setInterval(() => loadMensajes(canal), 5000);
    return () => clearInterval(pollRef.current);
  }, [canal, loadCanales, loadMensajes]);

  const handleSend = async () => {
    if (!texto.trim()) return;
    try {
      await chatAPI.enviar(canal, texto);
      setTexto('');
      loadMensajes(canal);
      loadCanales();
    } catch { /* */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const switchCanal = (id) => {
    setCanal(id);
    setMensajes([]);
    setLoading(true);
    loadMensajes(id);
  };

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Chat' }]}>
      <h2 style={{ margin: '0 0 1rem', fontSize: '1.3rem', color: '#1e293b' }}>Chat Interno</h2>

      <div style={s.chatContainer}>
        {/* Canales */}
        <div style={s.sidebar}>
          <div style={s.sidebarTitle}>CANALES</div>
          {canales.map(c => (
            <button key={c.id} onClick={() => switchCanal(c.id)}
              style={{ ...s.canalBtn, background: canal === c.id ? '#eff6ff' : 'transparent', color: canal === c.id ? '#1d4ed8' : '#475569', fontWeight: canal === c.id ? 600 : 400 }}>
              <span>{c.nombre}</span>
              <span style={s.canalCount}>{c.mensajes}</span>
            </button>
          ))}
          {canales.length === 0 && <div style={{ padding: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>Envie un mensaje para crear el canal</div>}
        </div>

        {/* Messages */}
        <div style={s.main}>
          <div style={s.mainHeader}>
            # {canal}
          </div>
          <div style={s.msgsWrap} ref={msgsRef}>
            {loading && <div style={{ padding: '1rem', color: '#94a3b8', textAlign: 'center' }}>Cargando...</div>}
            {!loading && mensajes.length === 0 && <div style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>No hay mensajes en este canal. Sea el primero en escribir.</div>}
            {mensajes.map(m => (
              <div key={m._id} style={s.msg}>
                <div style={s.msgAvatar}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={s.msgHeader}>
                    <span style={s.msgAuthor}>{m.autorNombre}</span>
                    <span style={s.msgCargo}>{m.autorCargo}</span>
                    <span style={s.msgTime}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={s.msgText}>{m.texto}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={s.inputRow}>
            <input style={s.input} value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={handleKeyDown} placeholder={`Mensaje en #${canal}...`} />
            <button onClick={handleSend} style={s.sendBtn}>Enviar</button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const s = {
  chatContainer: { display: 'flex', height: 450, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' },
  sidebar: { width: 200, borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: '#fafbfc', padding: '0.5rem' },
  sidebarTitle: { fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.3rem 0.5rem', marginBottom: '0.3rem' },
  canalBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '0.45rem 0.5rem', border: 'none', borderRadius: 6, cursor: 'pointer',
    textAlign: 'left', fontFamily: 'inherit', fontSize: '0.82rem', marginBottom: '0.15rem',
  },
  canalCount: { background: '#e2e8f0', borderRadius: 10, padding: '0.1rem 0.35rem', fontSize: '0.68rem', color: '#64748b' },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  mainHeader: { padding: '0.6rem 0.75rem', borderBottom: '1px solid #e2e8f0', fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' },
  msgsWrap: { flex: 1, overflowY: 'auto', padding: '0.75rem' },
  msg: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' },
  msgAvatar: { width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 },
  msgHeader: { display: 'flex', alignItems: 'baseline', gap: '0.35rem' },
  msgAuthor: { fontWeight: 600, fontSize: '0.82rem', color: '#1e293b' },
  msgCargo: { fontSize: '0.68rem', color: '#94a3b8' },
  msgTime: { fontSize: '0.65rem', color: '#cbd5e1', marginLeft: 'auto' },
  msgText: { fontSize: '0.85rem', color: '#334155', marginTop: '0.1rem', lineHeight: 1.4 },
  inputRow: { padding: '0.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.4rem' },
  input: { flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' },
  sendBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' },
};
