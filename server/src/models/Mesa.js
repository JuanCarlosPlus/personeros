/**
 * Colección: mesas
 * Campos del partido (en MAYÚSCULA, tal como están en su BD) + extras nuestros.
 *
 * NOTA: "ID LOCAL" y "NOMBRE LOCAL" del CSV original tienen espacios.
 * Los almacenamos como ID_LOCAL y NOMBRE_LOCAL (underscore) para compatibilidad MongoDB.
 * NOTA: "DEPARTAMETO" mantiene el typo original del partido (sin la N).
 * NOTA: "ELECTORES" es string en su BD (lo mantenemos así).
 */
import mongoose from 'mongoose';

const mesaSchema = new mongoose.Schema({
  // ── Campos del partido (exactos, incluido typo) ─────────────────────
  UBIGEO:       { type: String, required: true },
  MESA:         { type: String, required: true, unique: true },
  ID_LOCAL:     { type: String, default: '' },     // "ID LOCAL" en su CSV
  NOMBRE_LOCAL: { type: String, default: '' },     // "NOMBRE LOCAL" en su CSV
  DEPARTAMETO:  { type: String, default: '' },     // ⚠️ typo original: sin la N
  PROVINCIA:    { type: String, default: '' },
  DISTRITO:     { type: String, default: '' },
  DIRECCION:    { type: String, default: '' },
  ELECTORES:    { type: String, default: '0' },    // string en su BD
  tipoUbicacion:{ type: String, default: 'Nacional' },

  // ── Campos que agregamos nosotros ───────────────────────────────────
  status:      { type: Number, enum: [0, 1, 2], default: 0 },
  //   0 = sin personero asignado
  //   1 = asignado (pendiente de confirmación)
  //   2 = confirmado
  personeroId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personero', default: null },
  assignedAt:  { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
}, { collection: 'mesas', timestamps: true });

// Índices
mesaSchema.index({ UBIGEO: 1, status: 1 });
mesaSchema.index({ UBIGEO: 1, ID_LOCAL: 1 });
mesaSchema.index({ DEPARTAMETO: 1 });

// Virtuals para compatibilidad con código legacy
mesaSchema.virtual('ubigeo').get(function ()      { return this.UBIGEO; });
mesaSchema.virtual('mesa').get(function ()        { return this.MESA; });
mesaSchema.virtual('idLocal').get(function ()     { return this.ID_LOCAL; });
mesaSchema.virtual('nombreLocal').get(function () { return this.NOMBRE_LOCAL; });
mesaSchema.virtual('departamento').get(function (){ return this.DEPARTAMETO; });
mesaSchema.virtual('provincia').get(function ()   { return this.PROVINCIA; });
mesaSchema.virtual('distrito').get(function ()    { return this.DISTRITO; });
mesaSchema.virtual('direccion').get(function ()   { return this.DIRECCION; });
mesaSchema.virtual('electores').get(function ()   { return parseInt(this.ELECTORES) || 0; });

export default mongoose.model('Mesa', mesaSchema);
