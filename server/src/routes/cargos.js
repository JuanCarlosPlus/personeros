import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  listCargos, listPermisos, createCargo, updateCargo, deleteCargo, seedCargos,
} from '../controllers/cargoController.js';

const router = Router();
router.use(protect);
router.get('/', listCargos);
router.get('/permisos', listPermisos);
router.post('/', authorize('admin'), createCargo);
router.put('/:id', authorize('admin'), updateCargo);
router.delete('/:id', authorize('admin'), deleteCargo);
router.post('/seed', authorize('admin'), seedCargos);
export default router;
