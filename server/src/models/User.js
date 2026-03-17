/**
 * Colección: usuarios
 * Esquema del partido + campos extra nuestros.
 * Roles del partido: ROLE_ADMIN | ROLE_GESTION | ROLE_COORDINADOR
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // ── Campos del partido ──────────────────────────────
  username:             { type: String, required: true, unique: true, trim: true },
  password:             { type: String, required: true, select: false },
  roles:                [{ type: String }],          // ["ROLE_ADMIN"], ["ROLE_GESTION"], ["ROLE_COORDINADOR"]
  jurisdiccion:         { type: String, default: '' },   // ej. "Lima", "Arequipa"
  jurisdiccionDistrito: { type: String, default: '' },   // ej. "San Luis"

  // ── Campos que agregamos nosotros ───────────────────
  nombre:   { type: String },
  email:    { type: String, lowercase: true, trim: true, sparse: true },
  active:   { type: Boolean, default: true },
}, { collection: 'usuarios', timestamps: true });

// Virtual: mapear roles[] del partido a role string de nuestra app
userSchema.virtual('role').get(function () {
  if (this.roles?.includes('ROLE_ADMIN'))       return 'admin';
  if (this.roles?.includes('ROLE_GESTION'))     return 'coordinator';
  if (this.roles?.includes('ROLE_COORDINADOR')) return 'supervisor';
  return 'viewer';
});

userSchema.methods.correctPassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
