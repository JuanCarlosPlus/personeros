import { Router } from 'express';
import { protectDual } from '../middleware/auth.js';
import { getCanales, getMensajes, enviarMensaje } from '../controllers/chatController.js';

const router = Router();
router.use(protectDual);
router.get('/canales', getCanales);
router.get('/mensajes/:canal', getMensajes);
router.post('/mensajes', enviarMensaje);
export default router;
