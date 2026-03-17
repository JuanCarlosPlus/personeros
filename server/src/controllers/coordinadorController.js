import Coordinador from '../models/Coordinador.js';
import { lookupDni } from '../services/dniService.js';

// GET /api/v1/coordinadores
// ?nivel=region|provincia|distrito|local
// ?ubigeo=15        → exacto
// ?ubigeoLike=15    → empieza con (para listar todos de un dpto, prov, etc.)
export async function list(req, res, next) {
  try {
    const { nivel, ubigeo, ubigeoLike } = req.query;
    const filter = { active: true };
    if (nivel) filter.nivel = nivel;
    if (ubigeo) filter.ubigeo = ubigeo;
    if (ubigeoLike) filter.ubigeo = { $regex: `^${ubigeoLike}` };

    const data = await Coordinador.find(filter).lean();
    res.json({ data });
  } catch (err) { next(err); }
}

// GET /api/v1/coordinadores/:nivel/:ubigeo
// Para local: GET /api/v1/coordinadores/local/:ubigeo?idLocal=...
export async function getOne(req, res, next) {
  try {
    const { nivel, ubigeo } = req.params;
    const idLocal = req.query.idLocal || '';
    const coord = await Coordinador.findOne({ nivel, ubigeo, idLocal }).lean();
    if (!coord) return res.status(404).json({ error: 'No encontrado' });
    res.json(coord);
  } catch (err) { next(err); }
}

// POST /api/v1/coordinadores
// Upsert: si ya existe (nivel+ubigeo+idLocal) actualiza, si no crea
export async function createOrUpdate(req, res, next) {
  try {
    const { dni, nombres, apellidoPaterno, apellidoMaterno, telefono, correo,
            nivel, ubigeo, idLocal = '', nombreJurisdiccion = '' } = req.body;

    if (!dni || !/^\d{8}$/.test(dni))
      return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });
    if (!nombres || !apellidoPaterno)
      return res.status(400).json({ error: 'Nombres y apellido paterno requeridos' });
    if (!nivel || !ubigeo)
      return res.status(400).json({ error: 'nivel y ubigeo requeridos' });

    const coord = await Coordinador.findOneAndUpdate(
      { nivel, ubigeo, idLocal },
      { dni, nombres, apellidoPaterno, apellidoMaterno: apellidoMaterno || '',
        telefono: telefono || '', correo: correo || '',
        nivel, ubigeo, idLocal, nombreJurisdiccion, active: true },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(coord);
  } catch (err) { next(err); }
}

// DELETE /api/v1/coordinadores/:id
export async function remove(req, res, next) {
  try {
    await Coordinador.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ message: 'Coordinador desactivado' });
  } catch (err) { next(err); }
}

// GET /api/v1/coordinadores/dni/:dni  — consulta RENIEC
export async function dniLookup(req, res, next) {
  try {
    const { dni } = req.params;
    if (!/^\d{8}$/.test(dni))
      return res.status(400).json({ error: 'DNI inválido' });

    // Check if this DNI already has a coordinator assigned
    const existing = await Coordinador.findOne({ dni, active: true }).lean();
    const reniec = await lookupDni(dni);
    res.json({ existing: existing || null, reniec: reniec || null });
  } catch (err) { next(err); }
}
