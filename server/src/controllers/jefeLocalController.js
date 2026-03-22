import jwt from 'jsonwebtoken';
import JefeLocal from '../models/JefeLocal.js';
import Mesa from '../models/Mesa.js';
import Personero from '../models/Personero.js';
import MensajeWhatsapp from '../models/MensajeWhatsapp.js';
import { config } from '../config/env.js';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/v1/jefe-local/solicitar-codigo (público)
export async function solicitarCodigo(req, res, next) {
  try {
    const { telefono } = req.body;
    if (!telefono) return res.status(400).json({ error: 'Teléfono requerido' });

    const jefe = await JefeLocal.findOne({ telefono: telefono.trim(), activo: true });
    if (!jefe) return res.status(404).json({ error: 'No se encontró un jefe de local con ese teléfono' });

    const codigo = generateOTP();
    jefe.codigoOTP = codigo;
    jefe.otpExpira = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    await jefe.save();

    // Crear mensaje WhatsApp con el código
    await MensajeWhatsapp.create({
      tipo: 'invitacion',
      telefonoDestino: telefono.trim(),
      mensaje: `Tu código de acceso al Sistema de Personeros es: ${codigo}\nVálido por 5 minutos.`,
      referencia: jefe._id.toString(),
    });

    res.json({ message: 'Código enviado por WhatsApp', telefono: telefono.trim() });
  } catch (err) { next(err); }
}

// POST /api/v1/jefe-local/verificar-codigo (público)
export async function verificarCodigo(req, res, next) {
  try {
    const { telefono, codigo } = req.body;
    if (!telefono || !codigo) return res.status(400).json({ error: 'Teléfono y código requeridos' });

    const jefe = await JefeLocal.findOne({ telefono: telefono.trim(), activo: true });
    if (!jefe) return res.status(404).json({ error: 'No encontrado' });

    if (!jefe.codigoOTP || jefe.codigoOTP !== codigo) {
      return res.status(401).json({ error: 'Código incorrecto' });
    }
    if (jefe.otpExpira && jefe.otpExpira < new Date()) {
      return res.status(401).json({ error: 'Código expirado. Solicite uno nuevo.' });
    }

    // Limpiar OTP
    jefe.codigoOTP = null;
    jefe.otpExpira = null;
    await jefe.save();

    const token = jwt.sign(
      { id: jefe._id, type: 'jefe_local' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({ token, jefeLocal: { _id: jefe._id, nombres: jefe.nombres, apellidoPaterno: jefe.apellidoPaterno, nombreLocal: jefe.nombreLocal, ubigeo: jefe.ubigeo, idLocal: jefe.idLocal } });
  } catch (err) { next(err); }
}

// GET /api/v1/jefe-local/mi-local (protegido jefe_local)
export async function miLocal(req, res, next) {
  try {
    const jefe = req.jefeLocal;
    const mesas = await Mesa.find({ UBIGEO: jefe.ubigeo, ID_LOCAL: jefe.idLocal })
      .sort({ MESA: 1 })
      .lean();

    // Populate personeros
    const personeroIds = mesas.filter(m => m.personeroId).map(m => m.personeroId);
    const personeros = await Personero.find({ _id: { $in: personeroIds } }).lean();
    const personeroMap = {};
    personeros.forEach(p => { personeroMap[p._id.toString()] = p; });

    const mesasConPersonero = mesas.map(m => ({
      mesa: m.MESA,
      electores: parseInt(m.ELECTORES) || 0,
      status: m.status,
      assignedAt: m.assignedAt,
      confirmedAt: m.confirmedAt,
      personero: m.personeroId ? personeroMap[m.personeroId.toString()] || null : null,
    }));

    res.json({
      local: {
        nombreLocal: jefe.nombreLocal || mesas[0]?.NOMBRE_LOCAL || '',
        direccion: mesas[0]?.DIRECCION || '',
        ubigeo: jefe.ubigeo,
        idLocal: jefe.idLocal,
        distrito: mesas[0]?.DISTRITO || '',
        provincia: mesas[0]?.PROVINCIA || '',
      },
      jefe: { nombres: jefe.nombres, apellidoPaterno: jefe.apellidoPaterno },
      mesas: mesasConPersonero,
      stats: {
        total: mesas.length,
        asignadas: mesas.filter(m => m.status >= 1).length,
        confirmadas: mesas.filter(m => m.status >= 2).length,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/v1/jefe-local/asignar (protegido jefe_local)
export async function asignarJefeLocal(req, res, next) {
  try {
    const jefe = req.jefeLocal;
    const { personeroId, mesaCodigo } = req.body;
    if (!personeroId || !mesaCodigo) return res.status(400).json({ error: 'personeroId y mesaCodigo requeridos' });

    const mesa = await Mesa.findOne({ MESA: mesaCodigo, UBIGEO: jefe.ubigeo, ID_LOCAL: jefe.idLocal });
    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada en su local' });
    if (mesa.status >= 1) return res.status(400).json({ error: 'Esta mesa ya tiene personero' });

    const personero = await Personero.findById(personeroId);
    if (!personero) return res.status(404).json({ error: 'Personero no encontrado' });
    if (['asignado', 'confirmado'].includes(personero.assignmentStatus)) {
      return res.status(400).json({ error: 'Este personero ya está asignado a otra mesa' });
    }

    const now = new Date();
    personero.assignmentStatus = 'asignado';
    personero.assignedMesa = mesaCodigo;
    personero.assignedLocalId = mesa.ID_LOCAL;
    personero.assignedUbigeo = mesa.UBIGEO;
    personero.assignedAt = now;
    await personero.save();

    mesa.status = 1;
    mesa.personeroId = personero._id;
    mesa.assignedAt = now;
    await mesa.save();

    res.json({ message: 'Asignación exitosa' });
  } catch (err) { next(err); }
}

// POST /api/v1/jefe-local/desasignar (protegido jefe_local)
export async function desasignarJefeLocal(req, res, next) {
  try {
    const jefe = req.jefeLocal;
    const { mesaCodigo } = req.body;
    const mesa = await Mesa.findOne({ MESA: mesaCodigo, UBIGEO: jefe.ubigeo, ID_LOCAL: jefe.idLocal });
    if (!mesa) return res.status(404).json({ error: 'Mesa no encontrada en su local' });
    if (!mesa.personeroId) return res.status(400).json({ error: 'Mesa sin personero' });

    const personero = await Personero.findById(mesa.personeroId);
    if (personero) {
      personero.assignmentStatus = 'pendiente';
      personero.assignedMesa = null;
      personero.assignedLocalId = null;
      personero.assignedUbigeo = null;
      personero.assignedAt = null;
      await personero.save();
    }

    mesa.status = 0;
    mesa.personeroId = null;
    mesa.assignedAt = null;
    mesa.confirmedAt = null;
    await mesa.save();

    res.json({ message: 'Desasignación exitosa' });
  } catch (err) { next(err); }
}

// --- Admin CRUD ---

// GET /api/v1/jefe-local (admin)
export async function listJefesLocal(req, res, next) {
  try {
    const jefes = await JefeLocal.find({ activo: true }).sort({ createdAt: -1 }).lean();
    res.json(jefes);
  } catch (err) { next(err); }
}

// POST /api/v1/jefe-local/crear (admin)
export async function crearJefeLocal(req, res, next) {
  try {
    const { telefono, nombres, apellidoPaterno, apellidoMaterno, ubigeo, idLocal, nombreLocal } = req.body;
    if (!telefono || !nombres || !apellidoPaterno || !ubigeo || !idLocal) {
      return res.status(400).json({ error: 'Teléfono, nombres, apellido, ubigeo e idLocal requeridos' });
    }
    const jefe = await JefeLocal.create({
      telefono: telefono.trim(), nombres, apellidoPaterno,
      apellidoMaterno: apellidoMaterno || '',
      ubigeo, idLocal, nombreLocal: nombreLocal || '',
    });
    res.status(201).json(jefe);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ya existe un jefe con ese teléfono' });
    next(err);
  }
}

// DELETE /api/v1/jefe-local/:id (admin)
export async function deleteJefeLocal(req, res, next) {
  try {
    await JefeLocal.findByIdAndUpdate(req.params.id, { activo: false });
    res.json({ message: 'Jefe de local desactivado' });
  } catch (err) { next(err); }
}
