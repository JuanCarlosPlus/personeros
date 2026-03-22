import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jefeLocalAPI } from '../../utils/api';

export default function JefeLocalLogin() {
  const [step, setStep] = useState('phone'); // phone | code
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await jefeLocalAPI.solicitarCodigo(telefono);
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexion');
    }
    setLoading(false);
  };

  const handleVerificarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await jefeLocalAPI.verificarCodigo(telefono, codigo);
      localStorage.setItem('token', data.token);
      localStorage.setItem('jefeLocal', JSON.stringify(data.jefeLocal));
      navigate('/jefe-local/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Codigo incorrecto');
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.icon}>🏢</div>
        <h2 style={s.title}>Jefe de Local de Votacion</h2>
        <p style={s.subtitle}>Elecciones 2026</p>

        {step === 'phone' ? (
          <form onSubmit={handleSolicitarCodigo}>
            <div style={s.field}>
              <label style={s.label}>Numero de celular</label>
              <input style={s.input} value={telefono} placeholder="999999999"
                onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))} />
              <p style={s.hint}>Le enviaremos un codigo de verificacion por WhatsApp</p>
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" disabled={loading || telefono.length < 9}
              style={{ ...s.btn, opacity: loading || telefono.length < 9 ? 0.5 : 1 }}>
              {loading ? 'Enviando...' : 'Solicitar Codigo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerificarCodigo}>
            <div style={s.codeInfo}>Codigo enviado al {telefono.slice(0, 3)}***{telefono.slice(-3)}</div>
            <div style={s.field}>
              <label style={s.label}>Codigo de verificacion</label>
              <input style={{ ...s.input, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                value={codigo} maxLength={6} placeholder="000000"
                onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))} />
            </div>
            {error && <div style={s.error}>{error}</div>}
            <button type="submit" disabled={loading || codigo.length !== 6}
              style={{ ...s.btn, opacity: loading || codigo.length !== 6 ? 0.5 : 1 }}>
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button type="button" onClick={() => { setStep('phone'); setCodigo(''); setError(''); }}
              style={s.backBtn}>Cambiar numero</button>
          </form>
        )}

        <div style={s.links}>
          <a href="/login" style={s.link}>Acceso administrador</a>
          <a href="/personero/login" style={s.link}>Acceso personeros</a>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2440 100%)' },
  card: { background: '#fff', borderRadius: '12px', padding: '2rem', width: '380px', maxWidth: '90vw', textAlign: 'center' },
  icon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.2rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' },
  field: { marginBottom: '1rem', textAlign: 'left' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
  hint: { fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' },
  codeInfo: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.5rem', fontSize: '0.82rem', color: '#1e40af', marginBottom: '1rem' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' },
  btn: { width: '100%', padding: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' },
  backBtn: { width: '100%', padding: '0.5rem', background: 'transparent', color: '#64748b', border: 'none', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem' },
  links: { marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' },
  link: { fontSize: '0.78rem', color: '#64748b', textDecoration: 'none' },
};
