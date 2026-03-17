/**
 * Colección: personeros
 * Campos del partido (exactos) + campos extra nuestros para gestión de asignaciones.
 *
 * Campos del partido:
 *   dni, nombres, apellidoPaterno, apellidoMaterno, correo, telefono,
 *   afiliado (string "true"/"false"), experienciaPrevia (string "true"/"false"),
 *   descripcionExperiencia, grupoVotacion, nivel1, nivel2, nivel3,
 *   referente, tipoUbicacion
 *
 * Campos agregados por nosotros:
 *   assignmentStatus, assignedMesa, assignedLocalId, assignedUbigeo,
 *   assignedAt, confirmedAt, source, active
 *   + ubigeoVotacion, idLocalVotacion, mesaVotacion (para el DNI del padrón)
 */
import mongoose from 'mongoose';

const personeroSchema = new mongoose.Schema({
  // ── Campos del partido (exactos) ────────────────────────────────────
  dni:                    { type: String, required: true, unique: true, trim: true },
  nombres:                { type: String, required: true },
  apellidoPaterno:        { type: String, required: true },
  apellidoMaterno:        { type: String, default: '' },
  correo:                 { type: String, lowercase: true, trim: true, default: '' },
  telefono:               { type: String, default: '' },
  afiliado:               { type: String, default: 'false' }, // "true" | "false" (string, como en su BD)
  experienciaPrevia:      { type: String, default: 'false' }, // "true" | "false" (string, como en su BD)
  descripcionExperiencia: { type: String, default: '' },
  grupoVotacion:          { type: String, default: '' },  // código de grupo de votación
  nivel1:                 { type: String, default: '' },  // región / departamento
  nivel2:                 { type: String, default: '' },  // provincia
  nivel3:                 { type: String, default: '' },  // distrito
  referente:              { type: String, default: '' },  // nombre del referente
  tipoUbicacion:          { type: String, default: 'Nacional' }, // "Nacional" | "Extranjero"

  // ── Campos que agregamos nosotros ───────────────────────────────────
  // Dónde VOTA (para personeros registrados manualmente con DNI del padrón)
  ubigeoVotacion:   { type: String },
  idLocalVotacion:  { type: String },
  mesaVotacion:     { type: String },

  // Estado y datos de asignación como personero de mesa
  assignmentStatus: {
    type: String,
    enum: ['pendiente', 'asignado', 'confirmado', 'sin_mesa'],
    default: 'pendiente',
  },
  assignedMesa:     { type: String, default: null },
  assignedLocalId:  { type: String, default: null },
  assignedUbigeo:   { type: String, default: null },
  assignedAt:       { type: Date, default: null },
  confirmedAt:      { type: Date, default: null },

  // Metadatos
  source:  { type: String, default: 'import' },  // 'import' | 'manual' | 'robot'
  active:  { type: Boolean, default: true },
}, { collection: 'personeros', timestamps: true });

// Índices
personeroSchema.index({ nivel1: 1, nivel2: 1, nivel3: 1 });
personeroSchema.index({ assignmentStatus: 1 });
personeroSchema.index({ ubigeoVotacion: 1, mesaVotacion: 1 });

// Virtuals para compatibilidad con código que use los nombres viejos
personeroSchema.virtual('region').get(function ()   { return this.nivel1; });
personeroSchema.virtual('provincia').get(function () { return this.nivel2; });
personeroSchema.virtual('distrito').get(function ()  { return this.nivel3; });
personeroSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno || ''}`.trim();
});

export default mongoose.model('Personero', personeroSchema);
