/**
 * Colección: ubicaciones
 * Catálogo de niveles geográficos del partido (departamento/provincia/distrito).
 * Se usa para validación y autocompletar.
 */
import mongoose from 'mongoose';

const ubicacionSchema = new mongoose.Schema({
  // ── Campos del partido (exactos) ────────────────────────────────────
  nivel1:        { type: String, required: true },  // departamento / región
  nivel2:        { type: String, default: '' },     // provincia
  nivel3:        { type: String, default: '' },     // distrito
  tipoUbicacion: { type: String, default: 'Nacional' }, // "Nacional" | "Extranjero"
}, { collection: 'ubicaciones' });

ubicacionSchema.index({ nivel1: 1, nivel2: 1, nivel3: 1 });

export default mongoose.model('Ubicacion', ubicacionSchema);
