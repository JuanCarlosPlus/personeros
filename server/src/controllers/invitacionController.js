import Invitacion from '../models/Invitacion.js';
import Directivo from '../models/Directivo.js';

// POST /api/v1/invitaciones/bulk
export async function bulkCreateInvitaciones(req, res, next) {
  try {
    const { invitaciones } = req.body;
    if (!Array.isArray(invitaciones) || invitaciones.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de invitaciones' });
    }

    const directivo = req.directivo;
    if (!directivo) return res.status(403).json({ error: 'Solo directivos pueden crear invitaciones' });

    const created = [];
    const duplicates = [];
    const errors = [];

    for (const inv of invitaciones) {
      try {
        if (!inv.telefono || !inv.telefono.trim()) {
          errors.push({ telefono: inv.telefono || '?', error: 'Telefono requerido' });
          continue;
        }

        const exists = await Invitacion.findOne({ telefono: inv.telefono.trim(), invitadoPor: directivo.dni });
        if (exists) {
          duplicates.push({ telefono: inv.telefono, estado: exists.estado });
          continue;
        }

        const doc = await Invitacion.create({
          telefono: inv.telefono.trim(),
          nombres: inv.nombres || '',
          invitadoPor: directivo.dni,
          linkCode: directivo.linkCode,
        });
        created.push(doc);
      } catch (e) {
        if (e.code === 11000) {
          duplicates.push({ telefono: inv.telefono });
        } else {
          errors.push({ telefono: inv.telefono || '?', error: e.message });
        }
      }
    }

    res.status(201).json({ created: created.length, duplicates: duplicates.length, errors: errors.length, details: { created, duplicates, errors } });
  } catch (err) { next(err); }
}

// GET /api/v1/invitaciones
export async function listInvitaciones(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;
    const filter = {};

    // Si es directivo, solo sus invitaciones
    if (req.directivo) {
      filter.invitadoPor = req.directivo.dni;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Invitacion.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      Invitacion.countDocuments(filter),
    ]);

    res.json({ data: docs, total });
  } catch (err) { next(err); }
}

// GET /api/v1/invitaciones/stats
export async function statsInvitaciones(req, res, next) {
  try {
    const filter = {};
    if (req.directivo) filter.invitadoPor = req.directivo.dni;

    const [total, registrados] = await Promise.all([
      Invitacion.countDocuments(filter),
      Invitacion.countDocuments({ ...filter, estado: 'registrado' }),
    ]);

    res.json({ total, registrados, pendientes: total - registrados });
  } catch (err) { next(err); }
}

// GET /api/v1/invitaciones/por-link/:linkCode (PUBLIC)
export async function porLink(req, res, next) {
  try {
    const { linkCode } = req.params;
    const directivo = await Directivo.findOne({ linkCode, activo: true }).populate('cargoId').lean();
    if (!directivo) return res.status(404).json({ error: 'Link no valido' });

    res.json({
      valid: true,
      directivo: {
        nombres: directivo.nombres,
        apellidoPaterno: directivo.apellidoPaterno,
        cargo: directivo.cargoId?.nombre || '',
      },
    });
  } catch (err) { next(err); }
}

// GET /api/v1/invitaciones/verificar/:telefono/:linkCode (PUBLIC)
export async function verificarInvitacion(req, res, next) {
  try {
    const { telefono, linkCode } = req.params;
    const invitacion = await Invitacion.findOne({ telefono, linkCode }).lean();

    if (!invitacion) {
      return res.json({ found: false });
    }

    res.json({ found: true, estado: invitacion.estado, invitacion });
  } catch (err) { next(err); }
}

// PATCH /api/v1/invitaciones/marcar-registrado (internal)
export async function marcarRegistrado(req, res, next) {
  try {
    const { telefono, linkCode, personeroId } = req.body;
    const inv = await Invitacion.findOneAndUpdate(
      { telefono, linkCode, estado: 'pendiente' },
      { estado: 'registrado', personeroId },
      { new: true }
    );
    if (!inv) return res.status(404).json({ error: 'Invitacion no encontrada' });
    res.json(inv);
  } catch (err) { next(err); }
}
