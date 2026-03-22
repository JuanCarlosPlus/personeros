import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const directivoSchema = new mongoose.Schema({
  dni:             { type: String, required: true, unique: true, match: /^\d{8}$/ },
  nombres:         { type: String, required: true, trim: true },
  apellidoPaterno: { type: String, required: true, trim: true },
  apellidoMaterno: { type: String, default: '', trim: true },
  telefono:        { type: String, default: '' },
  correo:          { type: String, default: '', lowercase: true, trim: true },
  password:        { type: String, required: true, select: false },
  cargoId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Cargo', required: true },
  registradoPor:   { type: String, default: null }, // DNI del creador (null si admin)
  ubigeo:          { type: String, default: '' },
  region:          { type: String, default: '' },
  provincia:       { type: String, default: '' },
  distrito:        { type: String, default: '' },
  linkCode:        { type: String, unique: true, sparse: true }, // código para link de invitación
  activo:          { type: Boolean, default: true },
}, { timestamps: true });

directivoSchema.index({ cargoId: 1 });
directivoSchema.index({ registradoPor: 1 });
directivoSchema.index({ linkCode: 1 });

directivoSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno}`.trim();
});

directivoSchema.set('toJSON', { virtuals: true });
directivoSchema.set('toObject', { virtuals: true });

directivoSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

directivoSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('Directivo', directivoSchema);
