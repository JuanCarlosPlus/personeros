import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { reporteDirectivos, reporteTendencia, reporteEstados } from '../controllers/reporteController.js';

const router = Router();
router.use(protect);
router.get('/directivos', reporteDirectivos);
router.get('/tendencia', reporteTendencia);
router.get('/estados', reporteEstados);
export default router;
