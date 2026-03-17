import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  dniLookup,
  createOrUpdate,
  list,
  sugeridos,
  asignar,
  desasignar,
  confirmar,
  stats,
} from '../controllers/personeroController.js';

const router = Router();
router.use(protect);
router.get('/stats', stats);
router.get('/dni/:dni', dniLookup);
router.get('/sugeridos/:ubigeo/:idLocal/:mesa', sugeridos);
router.get('/', list);
router.post('/', createOrUpdate);
router.post('/asignar', asignar);
router.post('/desasignar', desasignar);
router.post('/confirmar', confirmar);
export default router;
