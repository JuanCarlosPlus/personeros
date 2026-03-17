import mongoose from 'mongoose';

/**
 * Coordinador — 1 a 1 con cada nivel geográfico
 *  nivel: 'region'    → ubigeo = 2 dígitos  (ej: "15")
 *  nivel: 'provincia' → ubigeo = 4 dígitos  (ej: "1501")
 *  nivel: 'distrito'  → ubigeo = 6 dígitos  (ej: "150101")
 *  nivel: 'local'     → ubigeo = 6 dígitos  + idLocal
 */
const coordinadorSchema = new mongoose.Schema({
  // Identidad
  dni:             { type: String, required: true, trim: true },
  nombres:         { type: String, required: true },
  apellidoPaterno: { type: String, required: true },
  apellidoMaterno: { type: String, default: '' },
  telefono:        { type: String, default: '' },
  correo:          { type: String, default: '', lowercase: true, trim: true },

  // Asignación geográfica
  nivel:   { type: String, enum: ['region', 'provincia', 'distrito', 'local'], required: true },
  ubigeo:  { type: String, required: true },  // prefijo según nivel
  idLocal: { type: String, default: '' },      // solo para nivel 'local'

  // Nombre descriptivo de la jurisdicción (desnormalizado para display)
  nombreJurisdiccion: { type: String, default: '' },

  active: { type: Boolean, default: true },
}, { collection: 'coordinadores', timestamps: true });

// Unicidad: un coordinador por nivel + ubigeo (+ idLocal para locales)
coordinadorSchema.index({ nivel: 1, ubigeo: 1, idLocal: 1 }, { unique: true });
coordinadorSchema.index({ dni: 1 });

// Virtual: nombre completo
coordinadorSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno || ''}`.trim();
});

export default mongoose.model('Coordinador', coordinadorSchema);
