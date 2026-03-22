import mongoose from 'mongoose';

// Permisos disponibles en el sistema
export const PERMISOS_DISPONIBLES = [
  { key: 'directivos:crear',    label: 'Registrar sub-directivos' },
  { key: 'directivos:ver',      label: 'Ver directivos' },
  { key: 'personeros:invitar',  label: 'Invitar personeros' },
  { key: 'personeros:ver',      label: 'Ver personeros' },
  { key: 'personeros:asignar',  label: 'Asignar personeros a mesas' },
  { key: 'dashboard:ver',       label: 'Ver dashboard de cobertura' },
  { key: 'reportes:exportar',   label: 'Exportar datos' },
  { key: 'sistema:configurar',  label: 'Configurar sistema' },
];

const cargoSchema = new mongoose.Schema({
  nombre:   { type: String, required: true, unique: true, trim: true },
  nivel:    { type: Number, required: true, index: true }, // 1=máximo rango
  permisos: [{ type: String }], // array de keys de PERMISOS_DISPONIBLES
  activo:   { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Cargo', cargoSchema);
