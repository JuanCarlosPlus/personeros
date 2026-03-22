import { useState, useEffect, useCallback } from 'react';
import DirectivoLayout from './DirectivoLayout';
import { invitacionAPI } from '../../utils/api';

const EMPTY_ROW = () => ({ telefono: '', nombres: '', status: '' });
const INITIAL_ROWS = 10;

export default function InvitarPersoneros() {
  const [rows, setRows] = useState(() => Array.from({ length: INITIAL_ROWS }, EMPTY_ROW));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [invitados, setInvitados] = useState([]);
  const [directivo, setDirectivo] = useState(null);

  useEffect(() => {
    try { setDirectivo(JSON.parse(localStorage.getItem('directivo'))); } catch { /* */ }
    invitacionAPI.list({ limit: 100 }).then(r => setInvitados(r.data.data || [])).catch(() => {});
  }, []);

  const updateRow = useCallback((idx, fields) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...fields } : r));
  }, []);

  const removeRow = useCallback((idx) => {
    setRows(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length < 3 ? [...next, EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()] : next;
    });
  }, []);

  const validRows = rows.filter(r => r.telefono.trim().length >= 9);

  const handleSave = async () => {
    if (validRows.length === 0) return;
    setSaving(true);
    setResult(null);
    try {
      const payload = validRows.map(r => ({ telefono: r.telefono.trim(), nombres: r.nombres.trim() }));
      const { data } = await invitacionAPI.bulkCreate(payload);
      setResult(data);
      // Refresh list
      const listRes = await invitacionAPI.list({ limit: 100 });
      setInvitados(listRes.data.data || []);
      // Mark saved rows
      setRows(prev => prev.map(r => {
        if (r.telefono.trim() && data.details?.created?.some(c => c.telefono === r.telefono.trim())) {
          return { ...r, status: 'saved' };
        }
        if (r.telefono.trim() && data.details?.duplicates?.some(c => c.telefono === r.telefono.trim())) {
          return { ...r, status: 'duplicate' };
        }
        return r;
      }));
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Error al guardar' });
    }
    setSaving(false);
  };

  const handleClear = () => {
    setRows(Array.from({ length: INITIAL_ROWS }, EMPTY_ROW));
    setResult(null);
  };

  const linkUrl = directivo?.linkCode ? `${window.location.origin}/registro/${directivo.linkCode}` : '';

  const handleCellKeyDown = (e, idx, nextCol) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (nextCol) {
        setTimeout(() => {
          const el = document.querySelector(`[data-row="${idx}"][data-col="${nextCol}"]`);
          el?.focus();
        }, 30);
      } else {
        // Next row
        if (idx >= rows.length - 2) {
          setRows(prev => [...prev, EMPTY_ROW(), EMPTY_ROW()]);
        }
        setTimeout(() => {
          const el = document.querySelector(`[data-row="${idx + 1}"][data-col="telefono"]`);
          el?.focus();
        }, 30);
      }
    }
  };

  return (
    <DirectivoLayout>
      <div style={s.header}>
        <h2 style={s.title}>Invitar Personeros</h2>
        <div style={s.actions}>
          <button onClick={handleClear} style={s.clearBtn}>Limpiar</button>
          <button onClick={handleSave} disabled={saving || validRows.length === 0}
            style={{ ...s.saveBtn, opacity: saving || validRows.length === 0 ? 0.5 : 1 }}>
            {saving ? 'Guardando...' : `REGISTRAR INVITACIONES (${validRows.length})`}
          </button>
        </div>
      </div>

      {/* Link card */}
      <div style={s.linkCard}>
        Despues de registrar, envia este link a tus invitados: <code style={s.linkCode}>{linkUrl}</code>
        <button onClick={() => { navigator.clipboard.writeText(linkUrl); }} style={s.copyBtn}>Copiar</button>
        <button onClick={() => {
          const text = encodeURIComponent(`Te invito a registrarte como personero para las Elecciones 2026. Ingresa aqui: ${linkUrl}`);
          window.open(`https://wa.me/?text=${text}`, '_blank');
        }} style={s.waBtn}>Compartir por WhatsApp</button>
      </div>

      {result && !result.error && (
        <div style={s.resultBox}>
          {result.created} registrados | {result.duplicates} ya invitados | {result.errors} errores
        </div>
      )}
      {result?.error && <div style={s.errorBox}>{result.error}</div>}

      {/* Tabla de nuevas invitaciones */}
      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 40 }}>#</th>
              <th style={{ ...s.th, width: 160 }}>Telefono *</th>
              <th style={s.th}>Nombre (opcional)</th>
              <th style={{ ...s.th, width: 100 }}>Estado</th>
              <th style={{ ...s.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: row.status === 'saved' ? '#f0fdf4' : row.status === 'duplicate' ? '#fffbeb' : 'transparent' }}>
                <td style={s.tdNum}>{idx + 1}</td>
                <td style={s.td}>
                  <input data-row={idx} data-col="telefono" style={s.input} value={row.telefono}
                    placeholder="999999999" disabled={row.status === 'saved'}
                    onChange={e => updateRow(idx, { telefono: e.target.value.replace(/\D/g, '') })}
                    onKeyDown={e => handleCellKeyDown(e, idx, 'nombres')} />
                </td>
                <td style={s.td}>
                  <input data-row={idx} data-col="nombres" style={s.input} value={row.nombres}
                    placeholder="Nombre del invitado" disabled={row.status === 'saved'}
                    onChange={e => updateRow(idx, { nombres: e.target.value })}
                    onKeyDown={e => handleCellKeyDown(e, idx, null)} />
                </td>
                <td style={s.td}>
                  <span style={{ fontSize: '0.8rem', color: row.status === 'saved' ? '#16a34a' : row.status === 'duplicate' ? '#d97706' : '#94a3b8' }}>
                    {row.status === 'saved' ? 'Registrado' : row.status === 'duplicate' ? 'Ya invitado' : ''}
                  </span>
                </td>
                <td style={s.td}>
                  {row.telefono && row.status !== 'saved' && (
                    <button onClick={() => removeRow(idx)} style={s.removeBtn}>x</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista de invitados previos */}
      {invitados.length > 0 && (
        <>
          <h3 style={s.prevTitle}>Invitados anteriores ({invitados.length})</h3>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Telefono</th>
                  <th style={s.th}>Nombre</th>
                  <th style={s.th}>Estado</th>
                  <th style={s.th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {invitados.map(inv => (
                  <tr key={inv._id}>
                    <td style={s.td}>{inv.telefono}</td>
                    <td style={s.td}>{inv.nombres || '—'}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: inv.estado === 'registrado' ? '#dcfce7' : '#fef3c7', color: inv.estado === 'registrado' ? '#16a34a' : '#d97706' }}>
                        {inv.estado}
                      </span>
                    </td>
                    <td style={s.td}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DirectivoLayout>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' },
  title: { margin: 0, fontSize: '1.3rem', color: '#1e293b' },
  actions: { display: 'flex', gap: '0.75rem' },
  clearBtn: { background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' },
  saveBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' },
  linkCard: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  linkCode: { background: '#fff', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', wordBreak: 'break-all' },
  copyBtn: { background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer' },
  waBtn: { background: '#25d366', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  resultBox: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500, color: '#16a34a' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.9rem' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { background: '#f8fafc', padding: '0.6rem 0.75rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: '#475569' },
  td: { padding: '1px', borderBottom: '1px solid #f1f5f9' },
  tdNum: { padding: '0.4rem 0.5rem', borderBottom: '1px solid #f1f5f9', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' },
  input: { width: '100%', border: 'none', outline: 'none', padding: '0.45rem 0.5rem', fontSize: '0.85rem', background: 'transparent', boxSizing: 'border-box' },
  removeBtn: { background: 'none', border: 'none', color: '#dc2626', fontSize: '1rem', cursor: 'pointer' },
  prevTitle: { fontSize: '1rem', color: '#1e293b', marginTop: '1.5rem', marginBottom: '0.75rem' },
  badge: { padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 500 },
};
