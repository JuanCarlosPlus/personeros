import { useState, useRef, useCallback } from 'react';
import AppLayout from '../layout/AppLayout';
import { personeroAPI } from '../../utils/api';

const EMPTY_ROW = () => ({
  dni: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
  telefono: '', correo: '',
  status: '', // '' | 'loading' | 'ok' | 'exists' | 'error' | 'saved'
  statusMsg: '',
});

const INITIAL_ROWS = 10;

export default function RegistroMasivo() {
  const [rows, setRows] = useState(() => Array.from({ length: INITIAL_ROWS }, EMPTY_ROW));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const tableRef = useRef(null);

  const updateRow = useCallback((idx, fields) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...fields } : r));
  }, []);

  const removeRow = useCallback((idx) => {
    setRows(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length < 3 ? [...next, EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()] : next;
    });
  }, []);

  const ensureExtraRows = useCallback((currentIdx) => {
    setRows(prev => {
      if (currentIdx >= prev.length - 2) {
        return [...prev, EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()];
      }
      return prev;
    });
  }, []);

  const focusCell = useCallback((rowIdx, colName) => {
    setTimeout(() => {
      const input = tableRef.current?.querySelector(
        `[data-row="${rowIdx}"][data-col="${colName}"]`
      );
      input?.focus();
    }, 50);
  }, []);

  const handleDniKeyDown = async (e, idx) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const dni = rows[idx].dni.trim();

    if (!/^\d{8}$/.test(dni)) {
      updateRow(idx, { status: 'error', statusMsg: 'DNI debe tener 8 dígitos' });
      return;
    }

    // Check duplicate in current rows
    const dupIdx = rows.findIndex((r, i) => i !== idx && r.dni === dni);
    if (dupIdx >= 0) {
      updateRow(idx, { status: 'error', statusMsg: `Duplicado (fila ${dupIdx + 1})` });
      return;
    }

    updateRow(idx, { status: 'loading', statusMsg: 'Consultando...' });

    try {
      const { data } = await personeroAPI.dniLookup(dni);

      if (data.registered) {
        updateRow(idx, {
          nombres: data.personero.nombres || '',
          apellidoPaterno: data.personero.apellidoPaterno || '',
          apellidoMaterno: data.personero.apellidoMaterno || '',
          telefono: data.personero.telefono || rows[idx].telefono,
          correo: data.personero.correo || rows[idx].correo,
          status: 'exists',
          statusMsg: 'Ya registrado',
        });
        focusCell(idx, 'telefono');
      } else if (data.reniec) {
        updateRow(idx, {
          nombres: data.reniec.nombres || '',
          apellidoPaterno: data.reniec.apellidoPaterno || '',
          apellidoMaterno: data.reniec.apellidoMaterno || '',
          status: 'ok',
          statusMsg: 'RENIEC OK',
        });
        focusCell(idx, 'telefono');
      } else {
        updateRow(idx, { status: 'error', statusMsg: 'No encontrado en RENIEC' });
        focusCell(idx, 'nombres');
      }
    } catch {
      updateRow(idx, { status: 'error', statusMsg: 'Error de consulta' });
      focusCell(idx, 'nombres');
    }

    ensureExtraRows(idx);
  };

  const handleCellKeyDown = (e, idx, colName, cols) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      const colIdx = cols.indexOf(colName);
      if (colIdx < cols.length - 1) {
        focusCell(idx, cols[colIdx + 1]);
      } else {
        // Last column → go to DNI of next row
        ensureExtraRows(idx);
        focusCell(idx + 1, 'dni');
      }
    }
  };

  const validRows = rows.filter(r =>
    /^\d{8}$/.test(r.dni) && r.telefono.trim() && r.status !== 'exists' && r.status !== 'saved'
  );

  const handleSave = async () => {
    if (validRows.length === 0) return;
    setSaving(true);
    setResult(null);

    try {
      const payload = validRows.map(r => ({
        dni: r.dni,
        nombres: r.nombres,
        apellidoPaterno: r.apellidoPaterno,
        apellidoMaterno: r.apellidoMaterno,
        telefono: r.telefono,
        correo: r.correo,
      }));

      const { data } = await personeroAPI.bulkCreate(payload);
      setResult(data);

      // Mark saved rows
      setRows(prev => prev.map(r => {
        if (data.created.some(c => c.dni === r.dni)) {
          return { ...r, status: 'saved', statusMsg: 'Creado' };
        }
        if (data.existing.some(c => c.dni === r.dni)) {
          return { ...r, status: 'exists', statusMsg: 'Ya existía' };
        }
        const err = data.errors.find(c => c.dni === r.dni);
        if (err) {
          return { ...r, status: 'error', statusMsg: err.error };
        }
        return r;
      }));
    } catch (err) {
      setResult({ error: err.response?.data?.error || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setRows(Array.from({ length: INITIAL_ROWS }, EMPTY_ROW));
    setResult(null);
  };

  const cols = ['telefono', 'correo'];

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Registro Masivo' }]}>
      <div style={s.header}>
        <h2 style={s.title}>Registro Masivo de Personeros</h2>
        <div style={s.headerActions}>
          <button onClick={handleClear} style={s.clearBtn}>Limpiar todo</button>
          <button
            onClick={handleSave}
            disabled={saving || validRows.length === 0}
            style={{
              ...s.saveBtn,
              opacity: saving || validRows.length === 0 ? 0.5 : 1,
            }}
          >
            {saving ? 'Guardando...' : `AGREGAR PERSONEROS (${validRows.length})`}
          </button>
        </div>
      </div>

      {result && !result.error && (
        <div style={s.resultBox}>
          <span style={{ color: '#16a34a' }}>{result.created.length} creados</span>
          {result.existing.length > 0 && (
            <span style={{ color: '#d97706' }}> | {result.existing.length} ya existian</span>
          )}
          {result.errors.length > 0 && (
            <span style={{ color: '#dc2626' }}> | {result.errors.length} errores</span>
          )}
        </div>
      )}
      {result?.error && <div style={s.errorBox}>{result.error}</div>}

      <div style={s.tableWrap} ref={tableRef}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={{ ...s.th, width: 40 }}>#</th>
              <th style={{ ...s.th, width: 120 }}>DNI</th>
              <th style={{ ...s.th, width: 180 }}>Nombres</th>
              <th style={{ ...s.th, width: 150 }}>Ap. Paterno</th>
              <th style={{ ...s.th, width: 150 }}>Ap. Materno</th>
              <th style={{ ...s.th, width: 130 }}>Celular *</th>
              <th style={{ ...s.th, width: 180 }}>Correo</th>
              <th style={{ ...s.th, width: 140 }}>Estado</th>
              <th style={{ ...s.th, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={rowBg(row.status)}>
                <td style={s.tdNum}>{idx + 1}</td>

                {/* DNI */}
                <td style={s.td}>
                  <input
                    data-row={idx}
                    data-col="dni"
                    style={s.input}
                    value={row.dni}
                    maxLength={8}
                    placeholder="12345678"
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '');
                      updateRow(idx, { dni: v, status: '', statusMsg: '' });
                    }}
                    onKeyDown={e => handleDniKeyDown(e, idx)}
                    disabled={row.status === 'saved'}
                  />
                </td>

                {/* Nombres */}
                <td style={s.td}>
                  <input
                    data-row={idx}
                    data-col="nombres"
                    style={s.input}
                    value={row.nombres}
                    placeholder="Nombres"
                    onChange={e => updateRow(idx, { nombres: e.target.value })}
                    onKeyDown={e => handleCellKeyDown(e, idx, 'nombres', ['nombres', 'apellidoPaterno', 'apellidoMaterno', ...cols])}
                    disabled={row.status === 'saved'}
                  />
                </td>

                {/* Ap. Paterno */}
                <td style={s.td}>
                  <input
                    data-row={idx}
                    data-col="apellidoPaterno"
                    style={s.input}
                    value={row.apellidoPaterno}
                    placeholder="Ap. Paterno"
                    onChange={e => updateRow(idx, { apellidoPaterno: e.target.value })}
                    onKeyDown={e => handleCellKeyDown(e, idx, 'apellidoPaterno', ['nombres', 'apellidoPaterno', 'apellidoMaterno', ...cols])}
                    disabled={row.status === 'saved'}
                  />
                </td>

                {/* Ap. Materno */}
                <td style={s.td}>
                  <input
                    data-row={idx}
                    data-col="apellidoMaterno"
                    style={s.input}
                    value={row.apellidoMaterno}
                    placeholder="Ap. Materno"
                    onChange={e => updateRow(idx, { apellidoMaterno: e.target.value })}
                    onKeyDown={e => handleCellKeyDown(e, idx, 'apellidoMaterno', ['nombres', 'apellidoPaterno', 'apellidoMaterno', ...cols])}
                    disabled={row.status === 'saved'}
                  />
                </td>

                {/* Celular */}
                <td style={s.td}>
                  <input
                    data-row={idx}
                    data-col="telefono"
                    style={s.input}
                    value={row.telefono}
                    placeholder="999999999"
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '');
                      updateRow(idx, { telefono: v });
                    }}
                    onKeyDown={e => handleCellKeyDown(e, idx, 'telefono', ['nombres', 'apellidoPaterno', 'apellidoMaterno', ...cols])}
                    disabled={row.status === 'saved'}
                  />
                </td>

                {/* Correo */}
                <td style={s.td}>
                  <input
                    data-row={idx}
                    data-col="correo"
                    style={s.input}
                    value={row.correo}
                    placeholder="correo@ejemplo.com"
                    onChange={e => updateRow(idx, { correo: e.target.value })}
                    onKeyDown={e => handleCellKeyDown(e, idx, 'correo', ['nombres', 'apellidoPaterno', 'apellidoMaterno', ...cols])}
                    disabled={row.status === 'saved'}
                  />
                </td>

                {/* Estado */}
                <td style={s.td}>
                  <span style={statusStyle(row.status)}>
                    {row.status === 'loading' && '⏳ '}
                    {row.statusMsg}
                  </span>
                </td>

                {/* Remove */}
                <td style={s.td}>
                  {row.dni && row.status !== 'saved' && (
                    <button onClick={() => removeRow(idx)} style={s.removeBtn}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.helpText}>
        Escriba el DNI y presione <strong>Enter</strong> para consultar datos.
        Use <strong>Tab</strong> o <strong>Enter</strong> para navegar entre celdas.
        Las filas marcadas como "Ya registrado" se omitiran al guardar.
      </div>
    </AppLayout>
  );
}

function rowBg(status) {
  const bg = {
    ok: '#f0fdf4',
    saved: '#f0fdf4',
    exists: '#fffbeb',
    error: '#fef2f2',
    loading: '#eff6ff',
  }[status] || 'transparent';
  return { background: bg };
}

function statusStyle(status) {
  const color = {
    ok: '#16a34a',
    saved: '#16a34a',
    exists: '#d97706',
    error: '#dc2626',
    loading: '#2563eb',
  }[status] || '#94a3b8';
  return { color, fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap' };
}

const s = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem',
  },
  title: { margin: 0, fontSize: '1.3rem', color: '#1e293b' },
  headerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  clearBtn: {
    background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px',
    padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#475569', cursor: 'pointer',
  },
  saveBtn: {
    background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px',
    padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  resultBox: {
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
    padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500,
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
    padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: '0.9rem',
  },
  tableWrap: {
    overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px',
    background: '#fff',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem',
  },
  th: {
    background: '#f8fafc', padding: '0.6rem 0.5rem',
    borderBottom: '2px solid #e2e8f0', textAlign: 'left',
    fontSize: '0.8rem', fontWeight: 600, color: '#475569',
    position: 'sticky', top: 0, whiteSpace: 'nowrap',
  },
  td: {
    padding: '1px', borderBottom: '1px solid #f1f5f9',
  },
  tdNum: {
    padding: '0.4rem 0.5rem', borderBottom: '1px solid #f1f5f9',
    textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem',
  },
  input: {
    width: '100%', border: 'none', outline: 'none',
    padding: '0.45rem 0.5rem', fontSize: '0.85rem',
    background: 'transparent', boxSizing: 'border-box',
  },
  removeBtn: {
    background: 'none', border: 'none', color: '#dc2626',
    fontSize: '1.1rem', cursor: 'pointer', padding: '0.2rem 0.5rem',
    borderRadius: '4px', lineHeight: 1,
  },
  helpText: {
    marginTop: '1rem', fontSize: '0.8rem', color: '#64748b',
    lineHeight: 1.5,
  },
};
