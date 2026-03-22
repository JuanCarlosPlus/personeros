import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personeroAPI } from '../../utils/api';

export default function PersoneroLogin() {
  const [dni, setDni] = useState('');
  const [codigoTel, setCodigoTel] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await personeroAPI.login(dni, codigoTel);
      localStorage.setItem('personeroToken', data.token);
      localStorage.setItem('personeroUser', JSON.stringify(data.personero));
      navigate('/personero/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error de conexion');
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <form onSubmit={handleSubmit} style={s.card}>
        <div style={s.icon}>🗳️</div>
        <h2 style={s.title}>Portal del Personero</h2>
        <p style={s.subtitle}>Elecciones 2026</p>

        <div style={s.field}>
          <label style={s.label}>DNI</label>
          <input style={s.input} value={dni} maxLength={8} placeholder="Ingrese su DNI"
            onChange={e => setDni(e.target.value.replace(/\D/g, ''))} />
        </div>
        <div style={s.field}>
          <label style={s.label}>Ultimos 3 digitos de su celular</label>
          <input style={s.input} value={codigoTel} maxLength={3} placeholder="Ej: 789"
            onChange={e => setCodigoTel(e.target.value.replace(/\D/g, ''))} />
          <p style={s.hint}>Ingrese los ultimos 3 digitos del celular que registro</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <button type="submit" disabled={loading || dni.length !== 8 || codigoTel.length !== 3}
          style={{ ...s.btn, opacity: loading || dni.length !== 8 || codigoTel.length !== 3 ? 0.5 : 1 }}>
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>

        <div style={s.links}>
          <a href="/login" style={s.link}>Acceso administrador</a>
          <a href="/directivo/login" style={s.link}>Acceso directivos</a>
        </div>
      </form>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2440 100%)' },
  card: { background: '#fff', borderRadius: '12px', padding: '2rem', width: '380px', maxWidth: '90vw', textAlign: 'center' },
  icon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.3rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1.5rem', fontSize: '0.85rem', color: '#64748b' },
  field: { marginBottom: '1rem', textAlign: 'left' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
  hint: { fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.25rem' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem' },
  btn: { width: '100%', padding: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' },
  links: { marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' },
  link: { fontSize: '0.78rem', color: '#64748b', textDecoration: 'none' },
};
