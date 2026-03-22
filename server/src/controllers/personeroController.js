import jwt from 'jsonwebtoken';
import Personero from '../models/Personero.js';
import Mesa from '../models/Mesa.js';
import Invitacion from '../models/Invitacion.js';
import Directivo from '../models/Directivo.js';
import MensajeWhatsapp from '../models/MensajeWhatsapp.js';
import { lookupDni } from '../services/dniService.js';
import { config } from '../config/env.js';

// POST /api/v1/personeros/login  — login con DNI + últimos 3 dígitos del teléfono
export async function loginPersonero(req, res, next) {
  try {
    const { dni, codigoTel } = req.body;
    if (!dni || !codigoTel) {
      return res.status(400).json({ error: 'DNI y código de teléfono requeridos' });
    }
    const personero = await Personero.findOne({ dni, active: true });
    if (!personero) {
      return res.status(401).json({ error: 'No se encontró un personero con ese DNI' });
    }
    // Verificar últimos 3 dígitos del teléfono
    const tel = (personero.telefono || '').replace(/\D/g, '');
    if (tel.length < 3 || tel.slice(-3) !== codigoTel) {
      return res.status(401).json({ error: 'Código de teléfono incorrecto' });
    }
    const token = jwt.sign(
      { id: personero._id, type: 'personero' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    res.json({ token, personero: { _id: personero._id, dni: personero.dni, nombres: personero.nombres, apellidoPaterno: personero.apellidoPaterno, apellidoMaterno: personero.apellidoMaterno } });
  } catch (err) { next(err); }
}

// GET /api/v1/personeros/mi-estado  — estado del personero autenticado
export async function miEstado(req, res, next) {
  try {
    const personero = req.personero;
    let mesaInfo = null;
    if (personero.assignedMesa) {
      mesaInfo = await Mesa.findOne({ MESA: personero.assignedMesa }).lean();
    }
    res.json({
      dni: personero.dni,
      nombres: personero.nombres,
      apellidoPaterno: personero.apellidoPaterno,
      apellidoMaterno: personero.apellidoMaterno,
      telefono: personero.telefono,
      correo: personero.correo,
      assignmentStatus: personero.assignmentStatus,
      assignedMesa: personero.assignedMesa,
      mesa: mesaInfo ? {
        mesa: mesaInfo.MESA,
        local: mesaInfo.NOMBRE_LOCAL,
        direccion: mesaInfo.DIRECCION,
        distrito: mesaInfo.DISTRITO,
        provincia: mesaInfo.PROVINCIA,
        departamento: mesaInfo.DEPARTAMETO,
      } : null,
    });
  } catch (err) { next(err); }
}

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

// POST /api/v1/personeros/bulk  — registro masivo
export async function bulkCreate(req, res, next) {
  try {
    const { personeros } = req.body;
    if (!Array.isArray(personeros) || personeros.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de personeros' });
    }

    const created = [];
    const existing = [];
    const errors = [];

    for (const p of personeros) {
      try {
        if (!p.dni || !/^\d{8}$/.test(p.dni)) {
          errors.push({ dni: p.dni || '?', error: 'DNI inválido' });
          continue;
        }
        if (!p.telefono || !p.telefono.trim()) {
          errors.push({ dni: p.dni, error: 'Teléfono requerido' });
          continue;
        }

        const exists = await Personero.findOne({ dni: p.dni });
        if (exists) {
          existing.push({ dni: p.dni, nombres: exists.nombres, apellidoPaterno: exists.apellidoPaterno });
          continue;
        }

        const doc = await Personero.create({
          dni: p.dni,
          nombres: p.nombres || '',
          apellidoPaterno: p.apellidoPaterno || '',
          apellidoMaterno: p.apellidoMaterno || '',
          telefono: p.telefono,
          correo: p.correo || '',
          source: 'manual',
          active: true,
        });
        created.push({ dni: doc.dni, nombres: doc.nombres, apellidoPaterno: doc.apellidoPaterno });
      } catch (e) {
        errors.push({ dni: p.dni || '?', error: e.message });
      }
    }

    res.status(201).json({ created, existing, errors });
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

// POST /api/v1/personeros/registro-publico  — auto-registro desde link de invitación (SIN auth)
export async function registerPublic(req, res, next) {
  try {
    const { dni, nombres, apellidoPaterno, apellidoMaterno, telefono, correo, linkCode } = req.body;

    if (!dni || !/^\d{8}$/.test(dni)) return res.status(400).json({ error: 'DNI inválido' });
    if (!nombres || !apellidoPaterno) return res.status(400).json({ error: 'Nombres y apellido paterno requeridos' });
    if (!correo || !correo.includes('@')) return res.status(400).json({ error: 'Correo electrónico requerido' });
    if (!telefono) return res.status(400).json({ error: 'Teléfono requerido' });
    if (!linkCode) return res.status(400).json({ error: 'Link de invitación requerido' });

    // Verificar invitación válida
    const invitacion = await Invitacion.findOne({ telefono, linkCode, estado: 'pendiente' });
    if (!invitacion) return res.status(400).json({ error: 'No se encontró una invitación válida para este teléfono' });

    // Buscar directivo invitador
    const directivo = await Directivo.findOne({ linkCode, activo: true });

    // Crear o actualizar personero
    const personero = await Personero.findOneAndUpdate(
      { dni },
      {
        dni, nombres, apellidoPaterno, apellidoMaterno: apellidoMaterno || '',
        telefono, correo, source: 'autoregistro',
        referente: directivo?.dni || invitacion.invitadoPor,
        active: true,
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Marcar invitación como registrada
    invitacion.estado = 'registrado';
    invitacion.personeroId = personero._id;
    await invitacion.save();

    // Crear mensajes WhatsApp pendientes
    const nombreInvitado = `${nombres} ${apellidoPaterno}`.trim();

    // 1. Notificar al invitador
    if (directivo?.telefono) {
      await MensajeWhatsapp.create({
        tipo: 'notificacion_invitador',
        telefonoDestino: directivo.telefono,
        mensaje: `¡${nombreInvitado} se ha registrado como personero gracias a tu invitación!`,
        referencia: personero._id.toString(),
      });
    }

    // 2. Bienvenida al invitado
    await MensajeWhatsapp.create({
      tipo: 'bienvenida_invitado',
      telefonoDestino: telefono,
      mensaje: `¡Bienvenido/a ${nombres}! Te has registrado como personero para las Elecciones 2026. Pronto recibirás más información.`,
      referencia: personero._id.toString(),
    });

    res.status(201).json({ message: 'Registro exitoso', personero });
  } catch (err) { next(err); }
}
