import ChatMensaje from '../models/ChatMensaje.js';

const CANALES_FIJOS = [
  { id: 'general', nombre: '# General', desc: 'Todos los directivos' },
  { id: 'urgente', nombre: '# Urgente', desc: 'Avisos importantes' },
];

// GET /api/v1/chat/canales
export async function getCanales(req, res, next) {
  try {
    // Canales fijos + contar mensajes
    const canales = await Promise.all(CANALES_FIJOS.map(async c => ({
      ...c,
      mensajes: await ChatMensaje.countDocuments({ canal: c.id }),
    })));

    // Canales dinámicos (regiones que tienen mensajes)
    const dynamic = await ChatMensaje.distinct('canal');
    const fixedIds = CANALES_FIJOS.map(c => c.id);
    for (const cId of dynamic) {
      if (!fixedIds.includes(cId)) {
        const count = await ChatMensaje.countDocuments({ canal: cId });
        canales.push({ id: cId, nombre: `# ${cId}`, desc: `Canal ${cId}`, mensajes: count });
      }
    }

    res.json(canales);
  } catch (err) { next(err); }
}

// GET /api/v1/chat/mensajes/:canal
export async function getMensajes(req, res, next) {
  try {
    const { canal } = req.params;
    const { desde } = req.query;
    const filter = { canal };
    if (desde) filter.createdAt = { $gt: new Date(desde) };

    const mensajes = await ChatMensaje.find(filter)
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json(mensajes);
  } catch (err) { next(err); }
}

// POST /api/v1/chat/mensajes
export async function enviarMensaje(req, res, next) {
  try {
    const { canal, texto } = req.body;
    if (!canal || !texto?.trim()) return res.status(400).json({ error: 'Canal y texto requeridos' });

    let autorDni, autorNombre, autorCargo;
    if (req.directivo) {
      autorDni = req.directivo.dni;
      autorNombre = `${req.directivo.nombres} ${req.directivo.apellidoPaterno}`;
      autorCargo = req.directivo.cargoId?.nombre || '';
    } else if (req.user) {
      autorDni = req.user.username;
      autorNombre = req.user.nombre || req.user.username;
      autorCargo = req.user.role;
    } else {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const msg = await ChatMensaje.create({ canal, autorDni, autorNombre, autorCargo, texto: texto.trim() });
    res.status(201).json(msg);
  } catch (err) { next(err); }
}
