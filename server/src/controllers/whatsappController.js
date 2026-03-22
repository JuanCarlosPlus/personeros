import MensajeWhatsapp from '../models/MensajeWhatsapp.js';

// GET /api/v1/whatsapp/cola — mensajes pendientes de enviar
export async function getCola(req, res, next) {
  try {
    const mensajes = await MensajeWhatsapp.find({ estado: 'pendiente' })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    res.json(mensajes);
  } catch (err) { next(err); }
}

// PATCH /api/v1/whatsapp/:id/enviado
export async function marcarEnviado(req, res, next) {
  try {
    const msg = await MensajeWhatsapp.findByIdAndUpdate(
      req.params.id,
      { estado: 'enviado' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json(msg);
  } catch (err) { next(err); }
}

// PATCH /api/v1/whatsapp/:id/error
export async function marcarError(req, res, next) {
  try {
    const msg = await MensajeWhatsapp.findByIdAndUpdate(
      req.params.id,
      { estado: 'error' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });
    res.json(msg);
  } catch (err) { next(err); }
}
