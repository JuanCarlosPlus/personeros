import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';

function signToken(id) {
  return jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function formatUser(user) {
  return {
    id:                   user._id,
    username:             user.username,
    nombre:               user.nombre || user.username,
    email:                user.email  || '',
    role:                 user.role,          // virtual: admin | coordinator | supervisor | viewer
    roles:                user.roles,
    jurisdiccion:         user.jurisdiccion         || '',
    jurisdiccionDistrito: user.jurisdiccionDistrito || '',
  };
}

// POST /api/v1/auth/login
// Acepta: { username, password }  o  { email, password }  (compatibilidad)
export async function login(req, res, next) {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier.toLowerCase() },
      ],
    }).select('+password');

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ok = await user.correctPassword(password);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = signToken(user._id);
    res.json({ token, user: formatUser(user) });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/auth/me
export async function getMe(req, res) {
  res.json(formatUser(req.user));
}

// POST /api/v1/auth/seed  (solo dev)
export async function seed(req, res, next) {
  try {
    if (config.nodeEnv !== 'development') {
      return res.status(403).json({ error: 'Solo disponible en desarrollo' });
    }
    const exists = await User.findOne({ username: 'administrador' });
    if (exists) {
      return res.json({ message: 'Usuarios ya existen', hint: 'Ejecuta seed-usuarios.js' });
    }
    res.json({ message: 'Ejecuta: node src/scripts/seed-usuarios.js' });
  } catch (err) {
    next(err);
  }
}
