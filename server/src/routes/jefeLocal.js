import { Router } from 'express';
import { protect, authorize, protectJefeLocal } from '../middleware/auth.js';
import {
  solicitarCodigo, verificarCodigo, miLocal,
  asignarJefeLocal, desasignarJefeLocal,
  listJefesLocal, crearJefeLocal, deleteJefeLocal,
} from '../controllers/jefeLocalController.js';

const router = Router();

// Public (OTP flow)
router.post('/solicitar-codigo', solicitarCodigo);
router.post('/verificar-codigo', verificarCodigo);

// Jefe de local authenticated
router.get('/mi-local', protectJefeLocal, miLocal);
router.post('/asignar', protectJefeLocal, asignarJefeLocal);
router.post('/desasignar', protectJefeLocal, desasignarJefeLocal);

// Admin only
router.get('/', protect, authorize('admin'), listJefesLocal);
router.post('/crear', protect, authorize('admin'), crearJefeLocal);
router.delete('/:id', protect, authorize('admin'), deleteJefeLocal);

export default router;
