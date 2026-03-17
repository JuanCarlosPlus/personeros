import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { list, getOne, createOrUpdate, remove, dniLookup } from '../controllers/coordinadorController.js';

const router = Router();
router.use(protect);
router.get('/dni/:dni', dniLookup);
router.get('/:nivel/:ubigeo', getOne);
router.get('/', list);
router.post('/', createOrUpdate);
router.delete('/:id', remove);
export default router;
