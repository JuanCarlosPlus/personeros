import mongoose from 'mongoose';

// A Mesa represents one voting table at a voting center (local de votación)
const mesaSchema = new mongoose.Schema({
  // Identificadores
  ubigeo:       { type: String, required: true },
  idLocal:      { type: String, required: true },
  mesa:         { type: String, required: true, unique: true },

  // Ubicación
  departamento: { type: String },
  provincia:    { type: String },
  distrito:     { type: String },
  nombreLocal:  { type: String },
  direccion:    { type: String },
  electores:    { type: Number, default: 0 },

  // Estado de asignación
  // 0 = sin personero, 1 = asignado, 2 = confirmado
  status:       { type: Number, enum: [0, 1, 2], default: 0 },

  // Referencia al personero asignado
  personeroId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Personero', default: null },
  assignedAt:   { type: Date },
  confirmedAt:  { type: Date },
}, { collection: 'mesas', timestamps: true });

mesaSchema.index({ ubigeo: 1, status: 1 });
mesaSchema.index({ ubigeo: 1, idLocal: 1 });
mesaSchema.index({ departamento: 1 });

export default mongoose.model('Mesa', mesaSchema);
