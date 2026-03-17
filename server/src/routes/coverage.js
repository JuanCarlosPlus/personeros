import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  national,
  provinces,
  districts,
  centros,
  mesasDelCentro,
} from '../controllers/coverageController.js';

const router = Router();
router.use(protect);
router.get('/national', national);
router.get('/dept/:deptCode', provinces);
router.get('/prov/:provCode', districts);
router.get('/dist/:ubigeo', centros);
router.get('/centros/:ubigeo/:idLocal', mesasDelCentro);
export default router;
