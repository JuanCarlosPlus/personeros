import Cargo, { PERMISOS_DISPONIBLES } from '../models/Cargo.js';

const DEFAULT_CARGOS = [
  { nombre: 'Presidente del Partido',              nivel: 1, permisos: PERMISOS_DISPONIBLES.map(p => p.key) },
  { nombre: 'Secretario General',                  nivel: 2, permisos: ['directivos:crear','directivos:ver','personeros:invitar','personeros:ver','personeros:asignar','dashboard:ver','reportes:exportar'] },
  { nombre: 'Coordinador General',                 nivel: 3, permisos: ['directivos:crear','directivos:ver','personeros:invitar','personeros:ver','personeros:asignar','dashboard:ver','reportes:exportar'] },
  { nombre: 'Coordinador Regional',                nivel: 4, permisos: ['directivos:crear','directivos:ver','personeros:invitar','personeros:ver','dashboard:ver'] },
  { nombre: 'Coordinador Distrital',               nivel: 5, permisos: ['directivos:crear','directivos:ver','personeros:invitar','personeros:ver','dashboard:ver'] },
  { nombre: 'Coordinador de Centro de Votación',   nivel: 6, permisos: ['personeros:invitar','personeros:ver','dashboard:ver'] },
];

// GET /api/v1/cargos
export async function listCargos(req, res, next) {
  try {
    const cargos = await Cargo.find({ activo: true }).sort({ nivel: 1 }).lean();
    res.json(cargos);
  } catch (err) { next(err); }
}

// GET /api/v1/cargos/permisos
export function listPermisos(req, res) {
  res.json(PERMISOS_DISPONIBLES);
}

// POST /api/v1/cargos
export async function createCargo(req, res, next) {
  try {
    const { nombre, nivel, permisos } = req.body;
    if (!nombre || nivel == null) {
      return res.status(400).json({ error: 'Nombre y nivel requeridos' });
    }
    const cargo = await Cargo.create({ nombre, nivel, permisos: permisos || [] });
    res.status(201).json(cargo);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ya existe un cargo con ese nombre' });
    next(err);
  }
}

// PUT /api/v1/cargos/:id
export async function updateCargo(req, res, next) {
  try {
    const { nombre, nivel, permisos } = req.body;
    const cargo = await Cargo.findByIdAndUpdate(
      req.params.id,
      { ...(nombre !== undefined && { nombre }), ...(nivel !== undefined && { nivel }), ...(permisos !== undefined && { permisos }) },
      { new: true, runValidators: true }
    );
    if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' });
    res.json(cargo);
  } catch (err) { next(err); }
}

// DELETE /api/v1/cargos/:id
export async function deleteCargo(req, res, next) {
  try {
    const cargo = await Cargo.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!cargo) return res.status(404).json({ error: 'Cargo no encontrado' });
    res.json({ message: 'Cargo desactivado' });
  } catch (err) { next(err); }
}

// POST /api/v1/cargos/seed
export async function seedCargos(req, res, next) {
  try {
    let created = 0;
    for (const c of DEFAULT_CARGOS) {
      const exists = await Cargo.findOne({ nombre: c.nombre });
      if (!exists) {
        await Cargo.create(c);
        created++;
      }
    }
    res.json({ message: `${created} cargos creados`, total: DEFAULT_CARGOS.length });
  } catch (err) { next(err); }
}
