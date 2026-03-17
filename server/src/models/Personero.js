import mongoose from 'mongoose';

const personeroSchema = new mongoose.Schema({
  // Datos de identidad (de RENIEC / DNI lookup)
  dni:              { type: String, required: true, unique: true, trim: true },
  nombres:          { type: String, required: true },
  apellidoPaterno:  { type: String, required: true },
  apellidoMaterno:  { type: String },
  fechaNacimiento:  { type: Date },
  direccion:        { type: String },    // dirección del DNI

  // Contacto
  telefono:         { type: String },
  correo:           { type: String, lowercase: true, trim: true },

  // Ubicación donde VOTA (del padrón electoral)
  ubigeoVotacion:   { type: String },    // ubigeo de su local de votación
  idLocalVotacion:  { type: String },    // local donde vota
  mesaVotacion:     { type: String },    // mesa donde figura como elector

  // Ubicación donde VIVE / es coordinado
  region:           { type: String },
  provincia:        { type: String },
  distrito:         { type: String },
  ubigeo:           { type: String },

  // Datos de militancia / experiencia
  afiliado:         { type: Boolean, default: false },
  experienciaPrevia: { type: Boolean, default: false },
  descripcionExperiencia: { type: String },
  grupoVotacion:    { type: String },
  referente:        { type: String },

  // Asignación como personero de mesa
  assignmentStatus: {
    type: String,
    enum: ['pendiente', 'asignado', 'confirmado', 'sin_mesa'],
    default: 'pendiente',
  },
  // Mesa a la que está asignado como PERSONERO
  assignedMesa:     { type: String },         // código de mesa (ej: "010001")
  assignedLocalId:  { type: String },
  assignedUbigeo:   { type: String },
  assignedAt:       { type: Date },
  confirmedAt:      { type: Date },

  // Metadatos
  source:           { type: String, default: 'manual' },  // 'manual' | 'import' | 'robot'
  active:           { type: Boolean, default: true },
}, { collection: 'personeros', timestamps: true });

// Índices
personeroSchema.index({ ubigeoVotacion: 1, mesaVotacion: 1 });
personeroSchema.index({ assignmentStatus: 1 });
personeroSchema.index({ ubigeo: 1 });
personeroSchema.index({ region: 1, provincia: 1, distrito: 1 });

// Virtual: nombre completo
personeroSchema.virtual('nombreCompleto').get(function () {
  return `${this.nombres} ${this.apellidoPaterno} ${this.apellidoMaterno || ''}`.trim();
});

export default mongoose.model('Personero', personeroSchema);
