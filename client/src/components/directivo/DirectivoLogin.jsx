import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { directivoAPI } from '../../utils/api';

export default function DirectivoLogin() {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await directivoAPI.login(dni, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('directivo', JSON.stringify(data.directivo));
      navigate('/directivo/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexion');
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <form onSubmit={handleSubmit} style={s.card}>
        <div style={s.icon}>🏛️</div>
        <h2 style={s.title}>Portal de Directivos</h2>
        <p style={s.subtitle}>Elecciones 2026</p>

        <div style={s.field}>
          <label style={s.label}>DNI</label>
          <input style={s.input} value={dni} maxLength={8} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} placeholder="Ingrese su DNI" />
        </div>
        <div style={s.field}>
          <label style={s.label}>Contrasena</label>
          <input style={s.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Ingrese su contrasena" />
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button type="submit" disabled={loading || dni.length !== 8 || !password} style={{ ...s.btn, opacity: loading || dni.length !== 8 || !password ? 0.5 : 1 }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>

        <a href="/login" style={s.link}>Acceso administrador</a>
      </form>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2440 100%)' },
  card: { background: '#fff', borderRadius: '12px', padding: '2rem', width: '360px', maxWidth: '90vw', textAlign: 'center' },
  icon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.3rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' },
  field: { marginBottom: '1rem', textAlign: 'left' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' },
  btn: { width: '100%', padding: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' },
  link: { display: 'inline-block', marginTop: '1rem', fontSize: '0.8rem', color: '#64748b', textDecoration: 'none' },
};
