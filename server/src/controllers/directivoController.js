import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Directivo from '../models/Directivo.js';
import Cargo from '../models/Cargo.js';
import { config } from '../config/env.js';
import { lookupDni } from '../services/dniService.js';

function generateLinkCode() {
  return crypto.randomBytes(4).toString('hex'); // 8 chars hex
}

// POST /api/v1/directivos/login
export async function loginDirectivo(req, res, next) {
  try {
    const { dni, password } = req.body;
    if (!dni || !password) {
      return res.status(400).json({ error: 'DNI y contraseña requeridos' });
    }

    const directivo = await Directivo.findOne({ dni, activo: true }).select('+password').populate('cargoId');
    if (!directivo || !(await directivo.comparePassword(password))) {
      return res.status(401).json({ error: 'DNI o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: directivo._id, type: 'directivo' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    const d = directivo.toJSON();
    delete d.password;

    res.json({ token, directivo: d });
  } catch (err) { next(err); }
}

// GET /api/v1/directivos/me
export async function getMe(req, res, next) {
  try {
    const directivo = await Directivo.findById(req.directivo._id).populate('cargoId');
    if (!directivo) return res.status(404).json({ error: 'Directivo no encontrado' });
    res.json(directivo);
  } catch (err) { next(err); }
}

// GET /api/v1/directivos
export async function listDirectivos(req, res, next) {
  try {
    const { cargoId, search, page = 1, limit = 50 } = req.query;
    const filter = { activo: true };
    if (cargoId) filter.cargoId = cargoId;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ dni: re }, { nombres: re }, { apellidoPaterno: re }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Directivo.find(filter).populate('cargoId').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
      Directivo.countDocuments(filter),
    ]);

    res.json({ data: docs, total });
  } catch (err) { next(err); }
}

// POST /api/v1/directivos
export async function createDirectivo(req, res, next) {
  try {
    const { dni, nombres, apellidoPaterno, apellidoMaterno, telefono, correo, password, cargoId, region, provincia, distrito, ubigeo } = req.body;

    if (!dni || !/^\d{8}$/.test(dni)) return res.status(400).json({ error: 'DNI inválido (8 dígitos)' });
    if (!nombres || !apellidoPaterno) return res.status(400).json({ error: 'Nombres y apellido paterno requeridos' });
    if (!password || password.length < 4) return res.status(400).json({ error: 'Contraseña debe tener al menos 4 caracteres' });
    if (!cargoId) return res.status(400).json({ error: 'Cargo requerido' });

    // Verify cargo exists
    const cargo = await Cargo.findById(cargoId);
    if (!cargo || !cargo.activo) return res.status(400).json({ error: 'Cargo no válido' });

    // If created by a directivo (not admin), enforce hierarchy
    if (req.directivo) {
      const creadorCargo = await Cargo.findById(req.directivo.cargoId);
      if (!creadorCargo || cargo.nivel <= creadorCargo.nivel) {
        return res.status(403).json({ error: 'Solo puede crear directivos de nivel inferior al suyo' });
      }
    }

    // Check DNI uniqueness
    const exists = await Directivo.findOne({ dni });
    if (exists) return res.status(400).json({ error: 'Ya existe un directivo con ese DNI' });

    const directivo = await Directivo.create({
      dni, nombres, apellidoPaterno,
      apellidoMaterno: apellidoMaterno || '',
      telefono: telefono || '', correo: correo || '',
      password, cargoId,
      registradoPor: req.directivo?.dni || null,
      region: region || '', provincia: provincia || '', distrito: distrito || '',
      ubigeo: ubigeo || '',
      linkCode: generateLinkCode(),
    });

    const populated = await Directivo.findById(directivo._id).populate('cargoId');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'DNI ya registrado' });
    next(err);
  }
}

// PUT /api/v1/directivos/:id
export async function updateDirectivo(req, res, next) {
  try {
    const updates = {};
    const { nombres, apellidoPaterno, apellidoMaterno, telefono, correo, cargoId, region, provincia, distrito, ubigeo, password } = req.body;
    if (nombres !== undefined) updates.nombres = nombres;
    if (apellidoPaterno !== undefined) updates.apellidoPaterno = apellidoPaterno;
    if (apellidoMaterno !== undefined) updates.apellidoMaterno = apellidoMaterno;
    if (telefono !== undefined) updates.telefono = telefono;
    if (correo !== undefined) updates.correo = correo;
    if (cargoId !== undefined) updates.cargoId = cargoId;
    if (region !== undefined) updates.region = region;
    if (provincia !== undefined) updates.provincia = provincia;
    if (distrito !== undefined) updates.distrito = distrito;
    if (ubigeo !== undefined) updates.ubigeo = ubigeo;

    // Password needs special handling (hashing via pre-save hook)
    if (password && password.length >= 4) {
      const directivo = await Directivo.findById(req.params.id).select('+password');
      if (!directivo) return res.status(404).json({ error: 'Directivo no encontrado' });
      Object.assign(directivo, updates);
      directivo.password = password;
      await directivo.save();
      const populated = await Directivo.findById(directivo._id).populate('cargoId');
      return res.json(populated);
    }

    const directivo = await Directivo.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('cargoId');
    if (!directivo) return res.status(404).json({ error: 'Directivo no encontrado' });
    res.json(directivo);
  } catch (err) { next(err); }
}

// DELETE /api/v1/directivos/:id
export async function deleteDirectivo(req, res, next) {
  try {
    const directivo = await Directivo.findByIdAndUpdate(req.params.id, { activo: false }, { new: true });
    if (!directivo) return res.status(404).json({ error: 'Directivo no encontrado' });
    res.json({ message: 'Directivo desactivado' });
  } catch (err) { next(err); }
}

// GET /api/v1/directivos/dni/:dni
export async function dniLookupDirectivo(req, res, next) {
  try {
    const { dni } = req.params;
    if (!/^\d{8}$/.test(dni)) return res.status(400).json({ error: 'DNI debe tener 8 dígitos' });

    const existing = await Directivo.findOne({ dni }).populate('cargoId').lean();
    const reniec = await lookupDni(dni);

    res.json({ registered: !!existing, directivo: existing || null, reniec: reniec || null });
  } catch (err) { next(err); }
}
