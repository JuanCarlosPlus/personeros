import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Directivo from '../models/Directivo.js';
import Personero from '../models/Personero.js';
import Cargo from '../models/Cargo.js';
import { config } from '../config/env.js';

// protect — solo usuarios del sistema (admin/coordinator/supervisor/viewer)
export async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    // Si el token es de un directivo, rechazar en rutas que solo son para users
    if (decoded.type === 'directivo') {
      return res.status(401).json({ error: 'Acceso solo para usuarios del sistema' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// protectDual — acepta tokens de User O Directivo
export async function protectDual(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type === 'directivo') {
      const directivo = await Directivo.findById(decoded.id).populate('cargoId');
      if (!directivo || !directivo.activo) {
        return res.status(401).json({ error: 'Directivo no encontrado o inactivo' });
      }
      req.directivo = directivo;
      req.user = null;
    } else {
      const user = await User.findById(decoded.id);
      if (!user || !user.active) {
        return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
      }
      req.user = user;
      req.directivo = null;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// authorize(...roles) — usa el virtual 'role' del User (admin | coordinator | supervisor | viewer)
export function authorize(...roles) {
  return (req, res, next) => {
    // Admin users siempre pasan
    if (req.user && roles.includes(req.user.role)) return next();
    // Si es directivo y no se requiere role de user, denegar
    if (!req.user) return res.status(403).json({ error: 'Sin permisos para esta acción' });
    return res.status(403).json({ error: 'Sin permisos para esta acción' });
  };
}

// authorizePermiso(...permisos) — verifica permisos del cargo del directivo
export function authorizePermiso(...permisos) {
  return (req, res, next) => {
    // Admin users tienen todos los permisos
    if (req.user?.role === 'admin') return next();

    // Directivos: verificar permisos del cargo
    if (req.directivo?.cargoId?.permisos) {
      const tiene = permisos.some(p => req.directivo.cargoId.permisos.includes(p));
      if (tiene) return next();
    }

    return res.status(403).json({ error: 'No tiene los permisos necesarios' });
  };
}

// protectPersonero — solo personeros auto-registrados
export async function protectPersonero(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== 'personero') {
      return res.status(401).json({ error: 'Acceso solo para personeros' });
    }
    const personero = await Personero.findById(decoded.id);
    if (!personero || !personero.active) {
      return res.status(401).json({ error: 'Personero no encontrado o inactivo' });
    }
    req.personero = personero;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// protectJefeLocal — solo jefes de local
export async function protectJefeLocal(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== 'jefe_local') {
      return res.status(401).json({ error: 'Acceso solo para jefes de local' });
    }
    // Import lazily to avoid circular deps
    const { default: JefeLocal } = await import('../models/JefeLocal.js');
    const jefe = await JefeLocal.findById(decoded.id);
    if (!jefe || !jefe.activo) {
      return res.status(401).json({ error: 'Jefe de local no encontrado o inactivo' });
    }
    req.jefeLocal = jefe;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
