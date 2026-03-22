import { Router } from 'express';
import { protectDual, authorize } from '../middleware/auth.js';
import {
  loginDirectivo, getMe, listDirectivos, createDirectivo,
  updateDirectivo, deleteDirectivo, dniLookupDirectivo,
} from '../controllers/directivoController.js';

const router = Router();

// Public
router.post('/login', loginDirectivo);

// Protected (admin or directivo)
router.use(protectDual);
router.get('/me', getMe);
router.get('/', listDirectivos);
router.post('/', createDirectivo);
router.get('/dni/:dni', dniLookupDirectivo);
router.put('/:id', updateDirectivo);
router.delete('/:id', authorize('admin'), deleteDirectivo);

export default router;
