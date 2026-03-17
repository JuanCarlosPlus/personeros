import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  nombre:   { type: String, required: true },
  role:     { type: String, enum: ['admin', 'coordinator', 'viewer'], default: 'viewer' },
  region:   { type: String },   // restricts coordinator to a region
  active:   { type: Boolean, default: true },
}, { collection: 'users', timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (candidate, stored) {
  return bcrypt.compare(candidate, stored);
};

export default mongoose.model('User', userSchema);
