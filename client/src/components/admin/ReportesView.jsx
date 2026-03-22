import { useState, useEffect } from 'react';
import AppLayout from '../layout/AppLayout';
import { reporteAPI } from '../../utils/api';

export default function ReportesView() {
  const [estados, setEstados] = useState(null);
  const [directivos, setDirectivos] = useState([]);
  const [tendencia, setTendencia] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      reporteAPI.estados().then(r => setEstados(r.data)),
      reporteAPI.directivos().then(r => setDirectivos(r.data)),
      reporteAPI.tendencia().then(r => setTendencia(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const maxBar = Math.max(...tendencia.map(t => t.count), 1);

  const statusData = estados ? [
    { label: 'Pendiente', count: estados.personeros.pendientes, color: '#f59e0b' },
    { label: 'Asignado', count: estados.personeros.asignados, color: '#10b981' },
    { label: 'Confirmado', count: estados.personeros.confirmados, color: '#8b5cf6' },
    { label: 'Sin mesa', count: estados.personeros.sinMesa, color: '#94a3b8' },
  ] : [];
  const totalP = statusData.reduce((a, s) => a + s.count, 0) || 1;

  return (
    <AppLayout breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Reportes' }]}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#1e293b' }}>Reportes Analiticos</h2>
      </div>

      {loading ? <p>Cargando...</p> : (
        <>
          {/* KPIs */}
          {estados && (
            <div style={s.statsRow}>
              <div style={s.stat}><div style={s.num}>{estados.personeros.total}</div><div style={s.lbl}>Personeros</div></div>
              <div style={s.stat}><div style={s.num}>{estados.directivos}</div><div style={s.lbl}>Directivos</div></div>
              <div style={s.stat}><div style={s.num}>{estados.invitaciones.total}</div><div style={s.lbl}>Invitaciones</div></div>
              <div style={s.stat}><div style={{ ...s.num, color: estados.tasaConversion >= 50 ? '#16a34a' : '#d97706' }}>{estados.tasaConversion}%</div><div style={s.lbl}>Conversion</div></div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {/* Bar chart */}
            <div style={s.chartBox}>
              <div style={s.chartTitle}>Registros por Semana</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: 160, paddingTop: 10 }}>
                {tendencia.map((t, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{t.count}</span>
                    <div style={{ width: '100%', maxWidth: 40, height: Math.round(t.count / maxBar * 130), background: 'linear-gradient(180deg,#2563eb,#3b82f6)', borderRadius: '4px 4px 0 0' }} />
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Donut */}
            <div style={s.chartBox}>
              <div style={s.chartTitle}>Estado de Personeros</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <svg viewBox="0 0 120 120" style={{ width: 100, height: 100 }}>
                  {(() => {
                    let offset = 0;
                    return statusData.map((sd, i) => {
                      const pct = sd.count / totalP;
                      const angle = pct * 360;
                      const rad = d => d * Math.PI / 180;
                      const r = 50;
                      const x1 = 60 + r * Math.sin(rad(offset));
                      const y1 = 60 - r * Math.cos(rad(offset));
                      const x2 = 60 + r * Math.sin(rad(offset + angle));
                      const y2 = 60 - r * Math.cos(rad(offset + angle));
                      const large = angle > 180 ? 1 : 0;
                      const path = <path key={i} d={`M60,60 L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={sd.color} opacity={0.85} />;
                      offset += angle;
                      return path;
                    });
                  })()}
                  <circle cx={60} cy={60} r={28} fill="#fff" />
                  <text x={60} y={65} textAnchor="middle" style={{ fontSize: 14, fontWeight: 700, fill: '#1e293b' }}>{totalP}</text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {statusData.map(sd => (
                    <div key={sd.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: sd.color, display: 'inline-block' }} />
                      {sd.label}: <strong>{sd.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ranking */}
          <div style={{ ...s.chartBox, marginTop: '1rem' }}>
            <div style={s.chartTitle}>Ranking de Directivos por Efectividad</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead><tr>
                  <th style={s.th}>Directivo</th><th style={s.th}>Cargo</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Invitados</th>
                  <th style={{ ...s.th, textAlign: 'center' }}>Registrados</th>
                  <th style={s.th}>Conversion</th>
                </tr></thead>
                <tbody>
                  {directivos.map((d, i) => (
                    <tr key={d.dni}>
                      <td style={{ ...s.td, fontWeight: 500 }}>{i + 1}. {d.nombre}</td>
                      <td style={s.td}><span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.1rem 0.4rem', borderRadius: 8, fontSize: '0.72rem' }}>{d.cargo}</span></td>
                      <td style={{ ...s.td, textAlign: 'center' }}>{d.invitados}</td>
                      <td style={{ ...s.td, textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{d.registrados}</td>
                      <td style={{ ...s.td, width: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${d.tasa}%`, height: '100%', background: d.tasa >= 60 ? '#16a34a' : d.tasa >= 40 ? '#eab308' : '#dc2626', borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: d.tasa >= 60 ? '#16a34a' : d.tasa >= 40 ? '#eab308' : '#dc2626' }}>{d.tasa}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {directivos.length === 0 && <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#94a3b8' }}>Sin datos de directivos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

const s = {
  statsRow: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 100, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem', textAlign: 'center' },
  num: { fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' },
  lbl: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' },
  chartBox: { flex: 1, minWidth: 280, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.75rem' },
  chartTitle: { fontSize: '0.88rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th: { background: '#f8fafc', padding: '0.5rem 0.6rem', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#475569' },
  td: { padding: '0.45rem 0.6rem', borderBottom: '1px solid #f1f5f9' },
};
