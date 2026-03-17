import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';

function signToken(id) {
  return jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// POST /api/v1/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ok = await user.correctPassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        region: user.region,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/me
export async function getMe(req, res) {
  res.json({
    id: req.user._id,
    email: req.user.email,
    nombre: req.user.nombre,
    role: req.user.role,
    region: req.user.region,
  });
}

// POST /api/v1/auth/seed  (solo en dev - crea usuario admin inicial)
export async function seed(req, res, next) {
  try {
    if (config.nodeEnv !== 'development') {
      return res.status(403).json({ error: 'Solo disponible en desarrollo' });
    }
    const exists = await User.findOne({ email: 'admin@personeros.pe' });
    if (exists) {
      return res.json({ message: 'Usuario admin ya existe', email: exists.email });
    }
    const admin = await User.create({
      email: 'admin@personeros.pe',
      password: 'admin123',
      nombre: 'Administrador',
      role: 'admin',
    });
    res.json({ message: 'Usuario admin creado', email: admin.email, password: 'admin123' });
  } catch (err) {
    next(err);
  }
}
