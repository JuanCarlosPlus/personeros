/**
 * Genera y descarga un CSV desde un array de objetos.
 * columns: [{ header: 'Región', key: 'departamento' }, ...]
 * rows: array de objetos
 */
export function exportCsv(columns, rows, filename = 'export.csv') {
  const escape = (v) => {
    const str = v === null || v === undefined ? '' : String(v);
    // Si contiene coma, comilla o salto de línea → envolver en comillas
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map(c => escape(c.header)).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      const val = typeof c.key === 'function' ? c.key(row) : row[c.key];
      return escape(val);
    }).join(',')
  ).join('\n');

  const bom = '\uFEFF'; // BOM para que Excel reconozca UTF-8
  const blob = new Blob([bom + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
