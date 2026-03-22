import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { invitacionAPI, personeroAPI } from '../../utils/api';

export default function AutoRegistro() {
  const { linkCode } = useParams();
  const [step, setStep] = useState('loading'); // loading | invalid | phone | form | success
  const [directivoInfo, setDirectivoInfo] = useState(null);
  const [telefono, setTelefono] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [form, setForm] = useState({ dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', correo: '' });
  const [dniStatus, setDniStatus] = useState(''); // '' | loading | ok | error
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    invitacionAPI.porLink(linkCode)
      .then(({ data }) => {
        if (data.valid) {
          setDirectivoInfo(data.directivo);
          setStep('phone');
        } else {
          setStep('invalid');
        }
      })
      .catch(() => setStep('invalid'));
  }, [linkCode]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneError('');
    try {
      const { data } = await invitacionAPI.verificar(telefono, linkCode);
      if (data.found) {
        if (data.estado === 'registrado') {
          setPhoneError('Este numero ya se registro como personero.');
          return;
        }
        setStep('form');
      } else {
        setPhoneError('No encontramos tu invitacion. Verifica tu numero de celular.');
      }
    } catch {
      setPhoneError('Error de conexion. Intenta de nuevo.');
    }
  };

  const handleDniLookup = async () => {
    const dni = form.dni.trim();
    if (!/^\d{8}$/.test(dni)) { setDniStatus('error'); return; }
    setDniStatus('loading');
    try {
      const { data } = await personeroAPI.dniLookup(dni);
      if (data.registered) {
        setForm(f => ({
          ...f,
          nombres: data.personero.nombres || '',
          apellidoPaterno: data.personero.apellidoPaterno || '',
          apellidoMaterno: data.personero.apellidoMaterno || '',
        }));
        setDniStatus('ok');
      } else if (data.reniec) {
        setForm(f => ({
          ...f,
          nombres: data.reniec.nombres || '',
          apellidoPaterno: data.reniec.apellidoPaterno || '',
          apellidoMaterno: data.reniec.apellidoMaterno || '',
        }));
        setDniStatus('ok');
      } else {
        setDniStatus('error');
      }
    } catch {
      setDniStatus('error');
    }
  };

  const handleDniKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleDniLookup();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{8}$/.test(form.dni)) { setError('DNI debe tener 8 digitos'); return; }
    if (!form.nombres || !form.apellidoPaterno) { setError('Nombres y apellido paterno requeridos'); return; }
    if (!form.correo || !form.correo.includes('@')) { setError('Correo electronico requerido'); return; }

    setSaving(true);
    try {
      await personeroAPI.registerPublic({
        dni: form.dni,
        nombres: form.nombres,
        apellidoPaterno: form.apellidoPaterno,
        apellidoMaterno: form.apellidoMaterno,
        telefono,
        correo: form.correo,
        linkCode,
      });
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    }
    setSaving(false);
  };

  if (step === 'loading') return <Page><p style={s.loading}>Cargando...</p></Page>;

  if (step === 'invalid') return (
    <Page>
      <div style={s.card}>
        <div style={s.icon}>❌</div>
        <h2 style={s.title}>Link no valido</h2>
        <p style={s.text}>Este link de invitacion no existe o ha expirado.</p>
      </div>
    </Page>
  );

  if (step === 'success') return (
    <Page>
      <div style={s.card}>
        <StepIndicator current={3} />
        <div style={s.icon}>🎉</div>
        <h2 style={s.title}>Registro exitoso!</h2>
        <p style={s.text}>Te has registrado como personero para las Elecciones 2026.</p>
        <p style={s.text}>Pronto recibiras mas informacion por WhatsApp.</p>
      </div>
    </Page>
  );

  if (step === 'phone') return (
    <Page>
      <div style={s.card}>
        <StepIndicator current={1} />
        <div style={s.icon}>🗳️</div>
        <h2 style={s.title}>Registro de Personero</h2>
        <p style={s.subtitle}>Elecciones 2026</p>
        <div style={s.inviteBox}>
          Has sido invitado por <strong>{directivoInfo?.nombres} {directivoInfo?.apellidoPaterno}</strong>
          {directivoInfo?.cargo && <span> ({directivoInfo.cargo})</span>}
        </div>
        <form onSubmit={handlePhoneSubmit}>
          <div style={s.field}>
            <label style={s.label}>Ingresa tu numero de celular</label>
            <input style={s.input} value={telefono} placeholder="999999999"
              onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))} />
          </div>
          {phoneError && <div style={s.error}>{phoneError}</div>}
          <button type="submit" disabled={telefono.length < 9} style={{ ...s.btn, opacity: telefono.length < 9 ? 0.5 : 1 }}>Continuar</button>
        </form>
      </div>
    </Page>
  );

  // step === 'form'
  return (
    <Page>
      <div style={s.card}>
        <StepIndicator current={2} />
        <div style={s.icon}>📝</div>
        <h2 style={s.title}>Completa tu registro</h2>
        <p style={s.subtitle}>Invitado por {directivoInfo?.nombres} {directivoInfo?.apellidoPaterno}</p>

        <form onSubmit={handleSubmit}>
          <div style={s.dniRow}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>DNI</label>
              <input style={s.input} value={form.dni} maxLength={8} placeholder="12345678"
                onChange={e => { setForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '') })); setDniStatus(''); }}
                onKeyDown={handleDniKeyDown} />
            </div>
            <button type="button" onClick={handleDniLookup} disabled={dniStatus === 'loading'} style={s.lookupBtn}>
              {dniStatus === 'loading' ? '...' : 'Buscar'}
            </button>
          </div>
          {dniStatus === 'ok' && <div style={s.dniOk}>Datos encontrados</div>}
          {dniStatus === 'error' && <div style={s.dniErr}>No encontrado, ingrese manualmente</div>}

          <div style={s.field}>
            <label style={s.label}>Nombres</label>
            <input style={s.input} value={form.nombres} onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
          </div>
          <div style={s.row}>
            <div style={s.halfField}><label style={s.label}>Ap. Paterno</label><input style={s.input} value={form.apellidoPaterno} onChange={e => setForm(f => ({ ...f, apellidoPaterno: e.target.value }))} /></div>
            <div style={s.halfField}><label style={s.label}>Ap. Materno</label><input style={s.input} value={form.apellidoMaterno} onChange={e => setForm(f => ({ ...f, apellidoMaterno: e.target.value }))} /></div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Correo electronico *</label>
            <input style={s.input} type="email" value={form.correo} placeholder="tucorreo@ejemplo.com"
              onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} />
          </div>

          {error && <div style={s.error}>{error}</div>}

          <button type="submit" disabled={saving} style={{ ...s.btn, opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Registrando...' : 'GRABAR'}
          </button>
        </form>
      </div>
    </Page>
  );
}

function Page({ children }) {
  return <div style={s.page}>{children}</div>;
}

function StepIndicator({ current }) {
  const steps = ['Verificacion', 'Datos', 'Listo'];
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {i > 0 && <div style={{ width: '24px', height: '2px', background: done || active ? '#2563eb' : '#e2e8f0' }} />}
            <div style={{
              width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              background: done ? '#2563eb' : active ? '#2563eb' : '#e2e8f0',
              color: done || active ? '#fff' : '#94a3b8',
            }}>
              {done ? '✓' : num}
            </div>
            <span style={{ fontSize: '0.7rem', color: active ? '#1e293b' : '#94a3b8', fontWeight: active ? 600 : 400 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2440 100%)', padding: '1rem' },
  card: { background: '#fff', borderRadius: '12px', padding: '2rem', width: '420px', maxWidth: '100%', textAlign: 'center' },
  icon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  title: { margin: '0 0 0.25rem', fontSize: '1.3rem', color: '#1e293b' },
  subtitle: { margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' },
  text: { color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 },
  loading: { color: '#fff', fontSize: '1rem' },
  inviteBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem', color: '#1e40af', marginBottom: '1.5rem' },
  field: { marginBottom: '1rem', textAlign: 'left' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
  error: { background: '#fef2f2', color: '#dc2626', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'left' },
  btn: { width: '100%', padding: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' },
  dniRow: { display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.5rem', textAlign: 'left' },
  lookupBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' },
  dniOk: { fontSize: '0.8rem', color: '#16a34a', marginBottom: '0.75rem', textAlign: 'left' },
  dniErr: { fontSize: '0.8rem', color: '#d97706', marginBottom: '0.75rem', textAlign: 'left' },
  row: { display: 'flex', gap: '0.75rem', marginBottom: '1rem' },
  halfField: { flex: 1, textAlign: 'left' },
};
