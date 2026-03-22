import { Router } from 'express';
import { protect, protectPersonero } from '../middleware/auth.js';
import {
  loginPersonero,
  miEstado,
  dniLookup,
  createOrUpdate,
  bulkCreate,
  registerPublic,
  list,
  sugeridos,
  asignar,
  desasignar,
  confirmar,
  stats,
} from '../controllers/personeroController.js';

const router = Router();

// Public (no auth needed)
router.post('/registro-publico', registerPublic);
router.post('/login', loginPersonero);

// Personero authenticated
router.get('/mi-estado', protectPersonero, miEstado);

// Protected (admin/system users)
router.use(protect);
router.get('/stats', stats);
router.get('/dni/:dni', dniLookup);
router.post('/bulk', bulkCreate);
router.get('/sugeridos/:ubigeo/:idLocal/:mesa', sugeridos);
router.get('/', list);
router.post('/', createOrUpdate);
router.post('/asignar', asignar);
router.post('/desasignar', desasignar);
router.post('/confirmar', confirmar);
export default router;
