import mongoose from 'mongoose';

const chatMensajeSchema = new mongoose.Schema({
  canal:       { type: String, required: true, index: true },
  autorDni:    { type: String, required: true },
  autorNombre: { type: String, required: true },
  autorCargo:  { type: String, default: '' },
  texto:       { type: String, required: true },
}, { timestamps: true });

chatMensajeSchema.index({ canal: 1, createdAt: 1 });

export default mongoose.model('ChatMensaje', chatMensajeSchema);
