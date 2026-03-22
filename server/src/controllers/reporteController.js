import Personero from '../models/Personero.js';
import Directivo from '../models/Directivo.js';
import Invitacion from '../models/Invitacion.js';
import Cargo from '../models/Cargo.js';

// GET /api/v1/reportes/directivos — ranking de efectividad
export async function reporteDirectivos(req, res, next) {
  try {
    const directivos = await Directivo.find({ activo: true }).populate('cargoId').lean();
    const invitaciones = await Invitacion.find().lean();

    const ranking = directivos.map(d => {
      const inv = invitaciones.filter(i => i.invitadoPor === d.dni);
      const reg = inv.filter(i => i.estado === 'registrado');
      return {
        dni: d.dni,
        nombre: `${d.nombres} ${d.apellidoPaterno}`,
        cargo: d.cargoId?.nombre || '',
        invitados: inv.length,
        registrados: reg.length,
        tasa: inv.length > 0 ? Math.round(reg.length / inv.length * 100) : 0,
      };
    }).sort((a, b) => b.registrados - a.registrados);

    res.json(ranking);
  } catch (err) { next(err); }
}

// GET /api/v1/reportes/tendencia — registros por semana
export async function reporteTendencia(req, res, next) {
  try {
    const personeros = await Personero.find({ active: true }).select('createdAt').lean();
    const now = new Date();
    const weeks = [];

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(start.getDate() - i * 7);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const count = personeros.filter(p => {
        const d = new Date(p.createdAt);
        return d >= start && d < end;
      }).length;

      weeks.push({
        label: `Sem ${6 - i}`,
        start: start.toISOString().slice(0, 10),
        count,
      });
    }

    res.json(weeks);
  } catch (err) { next(err); }
}

// GET /api/v1/reportes/estados — distribución de estados
export async function reporteEstados(req, res, next) {
  try {
    const [total, asignados, confirmados, sinMesa] = await Promise.all([
      Personero.countDocuments({ active: true }),
      Personero.countDocuments({ assignmentStatus: 'asignado', active: true }),
      Personero.countDocuments({ assignmentStatus: 'confirmado', active: true }),
      Personero.countDocuments({ assignmentStatus: 'sin_mesa', active: true }),
    ]);
    const pendientes = total - asignados - confirmados - sinMesa;

    const totalDirectivos = await Directivo.countDocuments({ activo: true });
    const totalInvitaciones = await Invitacion.countDocuments();
    const invRegistradas = await Invitacion.countDocuments({ estado: 'registrado' });

    res.json({
      personeros: { total, pendientes, asignados, confirmados, sinMesa },
      directivos: totalDirectivos,
      invitaciones: { total: totalInvitaciones, registradas: invRegistradas },
      tasaConversion: totalInvitaciones > 0 ? Math.round(invRegistradas / totalInvitaciones * 100) : 0,
    });
  } catch (err) { next(err); }
}
