import mongoose from 'mongoose';

const invitacionSchema = new mongoose.Schema({
  telefono:    { type: String, required: true, trim: true },
  nombres:     { type: String, default: '', trim: true },
  invitadoPor: { type: String, required: true }, // DNI del directivo
  linkCode:    { type: String, required: true }, // code del directivo
  estado:      { type: String, enum: ['pendiente', 'registrado'], default: 'pendiente' },
  personeroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personero', default: null },
}, { timestamps: true });

invitacionSchema.index({ telefono: 1, invitadoPor: 1 }, { unique: true });
invitacionSchema.index({ linkCode: 1 });
invitacionSchema.index({ estado: 1 });

export default mongoose.model('Invitacion', invitacionSchema);
