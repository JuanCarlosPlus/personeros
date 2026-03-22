import { Router } from 'express';
import { getCola, marcarEnviado, marcarError } from '../controllers/whatsappController.js';

const router = Router();

// Estas rutas son consumidas por el robot de WhatsApp
// No requieren auth JWT (el robot corre localmente)
router.get('/cola', getCola);
router.patch('/:id/enviado', marcarEnviado);
router.patch('/:id/error', marcarError);

export default router;
