import Personero from '../models/Personero.js';
import Mesa from '../models/Mesa.js';
import { lookupDni } from '../services/dniService.js';

// GET /api/v1/personeros/dni/:dni  — lookup DNI en RENIEC
export async function dniLookup(req, res, next) {
  try {
    const { dni } = req.params;
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });
    }

    const existing = await Personero.findOne({ dni }).lean();
    const reniec   = await lookupDni(dni);

    res.json({
      registered: !!existing,
      personero:  existing || null,
      reniec:     reniec   || null,
    });
  } catch (err) { next(err); }
}

// POST /api/v1/personeros  — crear o actualizar personero
export async function createOrUpdate(req, res, next) {
  try {
    const data = req.body;
    if (!data.dni || !/^\d{8}$/.test(data.dni)) {
      return res.status(400).json({ error: 'DNI inválido' });
    }
    if (!data.nombres || !data.apellidoPaterno) {
      return res.status(400).json({ error: 'Nombres y apellido paterno requeridos' });
    }

    const personero = await Personero.findOneAndUpdate(
      { dni: data.dni },
      { ...data },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(personero);
  } catch (err) { next(err); }
}

// GET /api/v1/personeros  — listar con filtros
export async function list(req, res, next) {
  try {
    const { nivel1, nivel2, nivel3, status, search, page = 1, limit = 50 } = req.query;
    const filter = { active: true };

    if (nivel1) filter.nivel1 = nivel1;
    if (nivel2) filter.nivel2 = nivel2;
    if (nivel3) filter.nivel3 = nivel3;
    if (status) filter.assignmentStatus = status;

    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [
        { dni: re },
        { nombres: re },
        { apellidoPaterno: re },
        { apellidoMaterno: re },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Personero.find(filter).skip(skip).limit(parseInt(limit)).sort({ apellidoPaterno: 1 }).lean(),
      Personero.countDocuments(filter),
    ]);

    res.json({ data: docs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
}

// GET /api/v1/personeros/sugeridos/:ubigeo/:idLocal/:mesa
export async function sugeridos(req, res, next) {
  try {
    const { ubigeo, idLocal, mesa } = req.params;

    const candidates = await Personero.find({
      ubigeoVotacion:   ubigeo,
      idLocalVotacion:  decodeURIComponent(idLocal),
      mesaVotacion:     mesa,
      assignmentStatus: 'pendiente',
      active:           true,
    }).lean();

    res.json(candidates);
  } catch (err) { next(err); }
}

// POST /api/v1/personeros/asignar
export async function asignar(req, res, next) {
  try {
    const { personeroId, mesaCodigo } = req.body;
    if (!personeroId || !mesaCodigo) {
      return res.status(400).json({ error: 'personeroId y mesaCodigo requeridos' });
    }

    const [personero, mesa] = await Promise.all([
      Personero.findById(personeroId),
      Mesa.findOne({ MESA: mesaCodigo }),
    ]);

    if (!personero) return res.status(404).json({ error: 'Personero no encontrado' });
    if (!mesa)      return res.status(404).json({ error: 'Mesa no encontrada' });
    if (mesa.status >= 1) {
      return res.status(400).json({ error: 'Esta mesa ya tiene personero asignado' });
    }
    if (['asignado', 'confirmado'].includes(personero.assignmentStatus)) {
      return res.status(400).json({ error: 'Este personero ya está asignado a otra mesa' });
    }

    const now = new Date();
    personero.assignmentStatus = 'asignado';
    personero.assignedMesa     = mesaCodigo;
    personero.assignedLocalId  = mesa.ID_LOCAL;
    personero.assignedUbigeo   = mesa.UBIGEO;
    personero.assignedAt       = now;
    await personero.save();

    mesa.status      = 1;
    mesa.personeroId = personero._id;
    mesa.assignedAt  = now;
    await mesa.save();

    res.json({ personero, mesa });
  } catch (err) { next(err); }
}

// POST /api/v1/personeros/desasignar
export async function desasignar(req, res, next) {
  try {
    const { mesaCodigo } = req.body;
    if (!mesaCodigo) return res.status(400).json({ error: 'mesaCodigo requerido' });

    const mesa = await Mesa.findOne({ MESA: mesaCodigo });
    if (!mesa)             return res.status(404).json({ error: 'Mesa no encontrada' });
    if (!mesa.personeroId) return res.status(400).json({ error: 'Esta mesa no tiene personero' });

    const personero = await Personero.findById(mesa.personeroId);
    if (personero) {
      personero.assignmentStatus = 'pendiente';
      personero.assignedMesa     = null;
      personero.assignedLocalId  = null;
      personero.assignedUbigeo   = null;
      personero.assignedAt       = null;
      await personero.save();
    }

    mesa.status      = 0;
    mesa.personeroId = null;
    mesa.assignedAt  = null;
    mesa.confirmedAt = null;
    await mesa.save();

    res.json({ message: 'Desasignación exitosa' });
  } catch (err) { next(err); }
}

// POST /api/v1/personeros/confirmar
export async function confirmar(req, res, next) {
  try {
    const { mesaCodigo } = req.body;
    const mesa = await Mesa.findOne({ MESA: mesaCodigo });
    if (!mesa || !mesa.personeroId) {
      return res.status(400).json({ error: 'Mesa sin personero asignado' });
    }

    const now = new Date();
    mesa.status      = 2;
    mesa.confirmedAt = now;
    await mesa.save();

    const personero = await Personero.findById(mesa.personeroId);
    if (personero) {
      personero.assignmentStatus = 'confirmado';
      personero.confirmedAt      = now;
      await personero.save();
    }

    res.json({ message: 'Confirmado', mesa });
  } catch (err) { next(err); }
}

// GET /api/v1/personeros/stats
export async function stats(req, res, next) {
  try {
    const [total, asignados, confirmados, sinMesa] = await Promise.all([
      Personero.countDocuments({ active: true }),
      Personero.countDocuments({ assignmentStatus: 'asignado',   active: true }),
      Personero.countDocuments({ assignmentStatus: 'confirmado', active: true }),
      Personero.countDocuments({ assignmentStatus: 'sin_mesa',   active: true }),
    ]);
    const pendientes = total - asignados - confirmados - sinMesa;
    res.json({ total, pendientes, asignados, confirmados, sinMesa });
  } catch (err) { next(err); }
}
