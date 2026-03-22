import mongoose from 'mongoose';

const jefeLocalSchema = new mongoose.Schema({
  telefono:        { type: String, required: true, unique: true, trim: true },
  nombres:         { type: String, required: true, trim: true },
  apellidoPaterno: { type: String, required: true, trim: true },
  apellidoMaterno: { type: String, default: '', trim: true },
  ubigeo:          { type: String, required: true },
  idLocal:         { type: String, required: true },
  nombreLocal:     { type: String, default: '' },
  codigoOTP:       { type: String, default: null },
  otpExpira:       { type: Date, default: null },
  activo:          { type: Boolean, default: true },
}, { timestamps: true });

jefeLocalSchema.index({ ubigeo: 1, idLocal: 1 });

jefeLocalSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno}`.trim();
});

jefeLocalSchema.set('toJSON', { virtuals: true });
jefeLocalSchema.set('toObject', { virtuals: true });

export default mongoose.model('JefeLocal', jefeLocalSchema);
