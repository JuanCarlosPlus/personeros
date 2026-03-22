import { Router } from 'express';
import { protectDual } from '../middleware/auth.js';
import {
  bulkCreateInvitaciones, listInvitaciones, statsInvitaciones,
  porLink, verificarInvitacion, marcarRegistrado,
} from '../controllers/invitacionController.js';

const router = Router();

// Public endpoints (for the registration page)
router.get('/por-link/:linkCode', porLink);
router.get('/verificar/:telefono/:linkCode', verificarInvitacion);

// Protected endpoints
router.use(protectDual);
router.post('/bulk', bulkCreateInvitaciones);
router.get('/', listInvitaciones);
router.get('/stats', statsInvitaciones);
router.patch('/marcar-registrado', marcarRegistrado);

export default router;
