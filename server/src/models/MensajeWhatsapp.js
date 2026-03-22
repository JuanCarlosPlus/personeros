import mongoose from 'mongoose';

const mensajeSchema = new mongoose.Schema({
  tipo:             { type: String, enum: ['notificacion_invitador', 'bienvenida_invitado', 'invitacion'], required: true },
  telefonoDestino:  { type: String, required: true },
  mensaje:          { type: String, required: true },
  estado:           { type: String, enum: ['pendiente', 'enviado', 'error'], default: 'pendiente' },
  referencia:       { type: String, default: '' }, // contexto adicional
}, { timestamps: true });

mensajeSchema.index({ estado: 1 });

export default mongoose.model('MensajeWhatsapp', mensajeSchema);
